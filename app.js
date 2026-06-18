// Entry point — wires together API, render, and user interaction.
// State lives here; everything else is delegated to focused modules.

import { els } from "./els.js";
import { debounce } from "./utils.js";
import { searchCity, reverseGeocodeClient, placeFromReverseGeocode, fetchForecast, fetchAirQuality } from "./api.js";
import { setStatus, setSuggestions, renderHero, renderHourly, renderDaily, renderAirQuality } from "./render.js";
import { renderSky } from "./sky.js";

// --- Constants ---

const STORE_KEY = "weather-atlas:lastPlace";
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

// --- App state ---

let forecastSeq = 0; // incremented each fetch; stale responses are discarded
let searchSeq   = 0;
let lastPlace   = null;

// --- Core action: fetch data for a place and render everything ---

async function selectPlace(place, { silent = false } = {}) {
  lastPlace = place;
  const my = ++forecastSeq;
  if (!silent) setStatus("Fetching forecast…");
  if (!silent) els.airStatus.textContent = "";
  try {
    savePlace(place);
    const [forecast, air] = await Promise.all([
      fetchForecast(place.latitude, place.longitude),
      fetchAirQuality(place.latitude, place.longitude).catch((err) => {
        console.error("Air quality fetch failed:", err);
        return null;
      }),
    ]);
    if (my !== forecastSeq) return; // superseded by a newer request
    renderHero({ place, forecast });
    renderHourly(forecast);
    renderDaily(forecast);
    renderAirQuality(air);
    if (!silent) setStatus("");
  } catch (err) {
    if (my !== forecastSeq) return;
    if (!silent) setStatus(
      `Could not fetch forecast. ${
        err?.name === "AbortError"
          ? "Timed out."
          : "Check internet, and open via http://localhost (not file://)."
      } ${err?.message ? `(${String(err.message).slice(0, 80)})` : ""}`,
      "bad",
    );
    console.error("Forecast fetch failed:", err);
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

const onType = debounce(async () => {
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
els.q.addEventListener("keydown", (e) => { if (e.key === "Escape") setSuggestions([], selectPlace); });

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = els.q.value.trim();
  setSuggestions([], selectPlace);
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

els.badge.addEventListener("click", () => {
  if (!lastPlace) { setStatus("Search a city first.", "warn"); return; }
  selectPlace(lastPlace);
});

// --- Bootstrap ---

const saved = loadPlace();
if (saved) {
  selectPlace(saved);
} else {
  els.q.value = `${DEFAULT_PLACE.name}, ${DEFAULT_PLACE.admin1}, ${DEFAULT_PLACE.country}`;
  selectPlace(DEFAULT_PLACE);
}

// --- Periodic updates ---

// Advance sun/moon dots every minute without re-fetching data.
setInterval(() => { try { renderSky(); } catch { /* ignore */ } }, 60_000);

// Silently refresh weather data every 10 minutes.
setInterval(() => { if (lastPlace) selectPlace(lastPlace, { silent: true }); }, 10 * 60_000);
