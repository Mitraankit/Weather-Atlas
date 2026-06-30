// Entry point — wires together API, render, and user interaction.
// State lives here; everything else is delegated to focused modules.

import { els } from "./els.js";
import { debounce, escapeHtml } from "./utils.js";
import { searchCity, reverseGeocodeClient, placeFromReverseGeocode, fetchForecast, fetchAirQuality } from "./api.js";
import { setStatus, setSuggestions, renderHero, renderHourly, renderDaily, renderAirQuality, showLoadingState } from "./render.js";
import { renderSky } from "./sky.js";
import { getUnit, toggleUnit } from "./unit.js";
import { getFavorites, isFavorite, removeFavorite, toggleFavorite } from "./favorites.js";
import { getRecents, addRecent } from "./recents.js";

// --- Constants ---

const STORE_KEY = "weather-atlas:lastPlace";
const STALE_KEY = "weather-atlas:stale";

const DEFAULT_PLACE = {
  name: "Pune",
  admin1: "Maharashtra",
  country: "India",
  latitude: 18.5204,
  longitude: 73.8567,
};

// --- Persistence ---

function savePlace(place) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(place)); } catch { /* ignore */ }
}

function loadPlace() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return null;
    return p;
  } catch {
    return null;
  }
}

function saveStale(data) {
  try { localStorage.setItem(STALE_KEY, JSON.stringify({ ...data, ts: Date.now() })); } catch {}
}

function loadStale() {
  try { return JSON.parse(localStorage.getItem(STALE_KEY) || "null"); } catch { return null; }
}

// --- URL state ---

function pushUrl(place) {
  try {
    const p = new URLSearchParams();
    p.set("lat", place.latitude.toFixed(4));
    p.set("lon", place.longitude.toFixed(4));
    p.set("name", [place.name, place.admin1, place.country].filter(Boolean).join(", "));
    history.replaceState(null, "", `?${p}`);
  } catch { /* ignore */ }
}

function placeFromUrl() {
  try {
    const p = new URLSearchParams(location.search);
    const lat = parseFloat(p.get("lat"));
    const lon = parseFloat(p.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const parts = (p.get("name") || "").split(",").map(s => s.trim());
    return { name: parts[0] || "Location", admin1: parts[1] || "", country: parts[2] || "", latitude: lat, longitude: lon };
  } catch { return null; }
}

// --- App state ---

let forecastSeq = 0;
let searchSeq   = 0;
let lastPlace   = null;
let lastRender  = null; // { forecast, air, place } — used for unit re-renders

// --- Theme toggle ---

const THEME_KEY = "weather-atlas:theme";
const THEME_CYCLE = ["auto", "light", "dark"];
const THEME_ICONS  = { auto: "⊙", light: "☀", dark: "☾" };
const THEME_LABELS = {
  auto:  "Appearance: auto (follows system)",
  light: "Appearance: light",
  dark:  "Appearance: dark",
};

let currentColorMode = localStorage.getItem(THEME_KEY) || "auto";

function applyColorMode(mode) {
  currentColorMode = mode;
  const html = document.documentElement;
  if (mode === "auto") {
    html.removeAttribute("data-cm");
  } else {
    html.setAttribute("data-cm", mode);
  }
  els.themeToggleBtn.textContent = THEME_ICONS[mode] || "⊙";
  els.themeToggleBtn.title       = THEME_LABELS[mode] || THEME_LABELS.auto;
  els.themeToggleBtn.setAttribute("aria-label", THEME_LABELS[mode] || THEME_LABELS.auto);
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
}

els.themeToggleBtn.addEventListener("click", () => {
  const idx  = THEME_CYCLE.indexOf(currentColorMode);
  const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
  applyColorMode(next);
});

applyColorMode(currentColorMode);

// --- Recents ---

function renderRecents() {
  const recents = getRecents();
  els.recents.hidden = !recents.length;
  if (!recents.length) { els.recents.innerHTML = ""; return; }

  els.recents.innerHTML = `
    <div class="recentsLabel">Recent</div>
    <div class="recentsList">
      ${recents.map((r, i) => {
        const label = escapeHtml([r.name, r.admin1, r.country].filter(Boolean).join(", "));
        return `<div class="recentChip" role="button" tabindex="0" data-idx="${i}">⏱ ${label}</div>`;
      }).join("")}
    </div>`;

  els.recents.querySelectorAll(".recentChip").forEach((chip) => {
    const idx = Number(chip.dataset.idx);
    chip.addEventListener("click", () => selectPlace(recents[idx]));
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPlace(recents[idx]); }
    });
  });
}

// --- Hourly scroll hint ---

els.hourly.addEventListener("scroll", () => {
  if (els.hourly.scrollLeft > 20) {
    els.hourlyOuter.classList.add("scrolled");
  }
}, { passive: true });

// --- Fetching indicator ---

function setFetching(v) {
  els.badge.classList.toggle("fetching", v);
}

// --- Offline banner ---

function syncOfflineBanner() {
  els.offlineBanner.hidden = navigator.onLine;
}
window.addEventListener("offline", syncOfflineBanner);
window.addEventListener("online", () => {
  syncOfflineBanner();
  if (lastPlace) selectPlace(lastPlace, { silent: true });
});
syncOfflineBanner();

// --- Favorites UI ---

function updatePinBtn() {
  if (!lastPlace) {
    els.pinBtn.disabled = true;
    els.pinBtn.textContent = "☆";
    els.shareBtn.disabled = true;
    return;
  }
  els.pinBtn.disabled = false;
  els.shareBtn.disabled = false;
  const fav = isFavorite(lastPlace);
  els.pinBtn.textContent = fav ? "★" : "☆";
  els.pinBtn.title = fav ? "Remove from favorites" : "Save to favorites";
  els.pinBtn.setAttribute("aria-label", fav ? "Remove from favorites" : "Save to favorites");
}

function renderFavs() {
  const favs = getFavorites();
  els.favs.hidden = !favs.length;
  if (!favs.length) { els.favs.innerHTML = ""; return; }

  els.favs.innerHTML = favs.map((f, i) => {
    const label = escapeHtml([f.name, f.admin1, f.country].filter(Boolean).join(", "));
    return `<div class="favChip" role="button" tabindex="0" data-idx="${i}">${label}<button class="favDel" data-idx="${i}" type="button" aria-label="Remove ${escapeHtml(f.name)} from favorites">×</button></div>`;
  }).join("");

  els.favs.querySelectorAll(".favChip").forEach((chip) => {
    const idx = Number(chip.dataset.idx);
    chip.addEventListener("click", (e) => {
      if (e.target.closest(".favDel")) return;
      selectPlace(favs[idx]);
    });
    chip.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".favDel")) {
        e.preventDefault();
        selectPlace(favs[idx]);
      }
    });
  });

  els.favs.querySelectorAll(".favDel").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFavorite(favs[Number(btn.dataset.idx)]);
      renderFavs();
    });
  });
}

// --- Core action: fetch data for a place and render everything ---

async function selectPlace(place, { silent = false } = {}) {
  lastPlace = place;
  const my = ++forecastSeq;
  setFetching(true);
  if (!silent) {
    setStatus("Fetching forecast…");
    els.airStatus.textContent = "";
    showLoadingState();
    els.hourlyOuter.classList.remove("scrolled");
  }
  try {
    savePlace(place);
    const [forecast, air] = await Promise.all([
      fetchForecast(place.latitude, place.longitude),
      fetchAirQuality(place.latitude, place.longitude).catch((err) => {
        console.error("Air quality fetch failed:", err);
        return null;
      }),
    ]);
    if (my !== forecastSeq) return;
    lastRender = { forecast, air, place };
    saveStale({ forecast, air, place });
    renderHero({ place, forecast });
    renderHourly(forecast);
    renderDaily(forecast);
    renderAirQuality(air);
    if (!silent) setStatus("");
    pushUrl(place);
    updatePinBtn();
    addRecent(place);
    renderRecents();
  } catch (err) {
    if (my !== forecastSeq) return;
    const stale = loadStale();
    if (stale?.forecast && stale?.place) {
      lastRender = { forecast: stale.forecast, air: stale.air, place: stale.place };
      renderHero({ place: stale.place, forecast: stale.forecast });
      renderHourly(stale.forecast);
      renderDaily(stale.forecast);
      renderAirQuality(stale.air ?? null);
      const age = Math.round((Date.now() - (stale.ts || 0)) / 60000);
      setStatus(`Offline — showing cached data from ${age} min ago.`, "warn");
    } else if (!silent) {
      setStatus(
        `Could not fetch forecast. ${
          err?.name === "AbortError"
            ? "Timed out."
            : "Check internet, and open via http://localhost (not file://)."
        } ${err?.message ? `(${String(err.message).slice(0, 80)})` : ""}`,
        "bad",
      );
    }
    console.error("Forecast fetch failed:", err);
  } finally {
    setFetching(false);
  }
}

// --- Geolocation ---

function locate() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.", "warn");
    return;
  }
  setStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        setStatus("Resolving location name…");
        const data = await reverseGeocodeClient(lat, lon);
        await selectPlace(placeFromReverseGeocode(data, lat, lon));
      } catch (err) {
        console.error("Reverse geocode failed:", err);
        await selectPlace({ name: "My location", admin1: "", country: "", latitude: lat, longitude: lon });
      }
    },
    (e) => setStatus(
      e.code === e.PERMISSION_DENIED ? "Location permission denied." : "Could not read location.",
      "warn",
    ),
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
  );
}

// --- Search (typeahead + form submit) ---

let suggestIdx = -1;

const onType = debounce(async () => {
  suggestIdx = -1;
  const q = els.q.value.trim();
  if (q.length < 3) { setSuggestions([], selectPlace); return; }
  const my = ++searchSeq;
  try {
    const results = await searchCity(q);
    if (my !== searchSeq) return;
    setSuggestions(results, selectPlace);
  } catch {
    if (my !== searchSeq) return;
    setSuggestions([], selectPlace);
  }
}, 220);

els.q.addEventListener("input", onType);

els.q.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    setSuggestions([], selectPlace);
    suggestIdx = -1;
    return;
  }
  const opts = Array.from(els.suggest.querySelectorAll(".opt"));
  if (!opts.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    suggestIdx = (suggestIdx + 1) % opts.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    suggestIdx = (suggestIdx - 1 + opts.length) % opts.length;
  } else if (e.key === "Enter" && suggestIdx >= 0) {
    e.preventDefault();
    opts[suggestIdx]?.click();
    suggestIdx = -1;
    return;
  } else {
    return;
  }
  opts.forEach((el, i) => el.classList.toggle("focused", i === suggestIdx));
  opts[suggestIdx]?.scrollIntoView({ block: "nearest" });
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = els.q.value.trim();
  setSuggestions([], selectPlace);
  suggestIdx = -1;
  if (q.length < 2) { setStatus("Type a city name first.", "warn"); return; }

  setStatus("Searching…");
  const my = ++searchSeq;
  try {
    const results = await searchCity(q);
    if (my !== searchSeq) return;
    if (!results.length) { setStatus("No matching cities found.", "warn"); return; }
    setStatus("");
    const best = results[0];
    await selectPlace({ name: best.name, admin1: best.admin1, country: best.country, latitude: best.latitude, longitude: best.longitude });
  } catch {
    if (my !== searchSeq) return;
    setStatus("Search failed. Check internet, and open via http://localhost (not file://).", "bad");
  }
});

// --- Buttons ---

els.locateBtn.addEventListener("click", locate);

els.shareBtn.addEventListener("click", async () => {
  const url   = location.href;
  const title = `${els.place.textContent} — Weather Atlas`;

  // Native share sheet on mobile (iOS / Android)
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // user dismissed sheet
    }
  }

  // Clipboard API (requires HTTPS or localhost)
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      copied = true;
    } else {
      const ta = Object.assign(document.createElement("textarea"), { value: url });
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      copied = document.execCommand("copy");
      document.body.removeChild(ta);
    }
  } catch { /* ignore */ }

  if (copied) {
    els.shareBtn.title = "Copied!";
    els.shareBtn.setAttribute("aria-label", "Copied!");
    setTimeout(() => {
      els.shareBtn.title = "Copy link";
      els.shareBtn.setAttribute("aria-label", "Copy link");
    }, 1800);
  } else {
    prompt("Copy this link:", url);
  }
});

els.q.addEventListener("input", () => {
  els.clearBtn.hidden = !els.q.value;
});
els.clearBtn.addEventListener("click", () => {
  els.q.value = "";
  els.clearBtn.hidden = true;
  setSuggestions([], selectPlace);
  els.q.focus();
});

els.badge.addEventListener("click", () => {
  if (!lastPlace) { setStatus("Search a city first.", "warn"); return; }
  selectPlace(lastPlace);
});

els.pinBtn.addEventListener("click", () => {
  if (!lastPlace) return;
  toggleFavorite(lastPlace);
  updatePinBtn();
  renderFavs();
});

els.unitBtn.addEventListener("click", () => {
  const unit = toggleUnit();
  els.unitBtn.textContent = unit === "C" ? "°C" : "°F";
  if (lastRender) {
    const { forecast, air, place } = lastRender;
    renderHero({ place, forecast });
    renderHourly(forecast);
    renderDaily(forecast);
  }
});

// --- Bootstrap ---

// Sync unitBtn label to persisted preference on load
els.unitBtn.textContent = getUnit() === "C" ? "°C" : "°F";

const fromUrl = placeFromUrl();
if (fromUrl) {
  selectPlace(fromUrl);
} else {
  const saved = loadPlace();
  if (saved) {
    selectPlace(saved);
  } else {
    tryAutoLocate();
  }
}

function tryAutoLocate() {
  if (!navigator.geolocation) { selectPlace(DEFAULT_PLACE); return; }
  setStatus("Detecting your location…");
  const fallback = setTimeout(() => selectPlace(DEFAULT_PLACE), 5000);
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      clearTimeout(fallback);
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const data = await reverseGeocodeClient(lat, lon);
        await selectPlace(placeFromReverseGeocode(data, lat, lon));
      } catch {
        await selectPlace({ name: "My location", admin1: "", country: "", latitude: lat, longitude: lon });
      }
    },
    () => { clearTimeout(fallback); selectPlace(DEFAULT_PLACE); },
    { enableHighAccuracy: false, timeout: 4500, maximumAge: 300000 },
  );
}

renderFavs();
renderRecents();

// --- Service worker ---

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* non-fatal */ });
}

// --- Periodic updates ---

// Advance sun/moon dots every minute without re-fetching data.
setInterval(() => { try { renderSky(); } catch { /* ignore */ } }, 60_000);

// Silently refresh weather data every 10 minutes.
setInterval(() => { if (lastPlace) selectPlace(lastPlace, { silent: true }); }, 10 * 60_000);
