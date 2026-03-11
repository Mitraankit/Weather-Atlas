const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

const els = {
  form: $("searchForm"),
  q: $("q"),
  suggest: $("suggest"),
  searchBtn: $("searchBtn"),
  locateBtn: $("locateBtn"),
  status: $("status"),
  place: $("place"),
  meta: $("meta"),
  badge: $("badge"),
  wxIcon: $("wxIcon"),
  tempValue: $("tempValue"),
  tempUnit: $("tempUnit"),
  wxText: $("wxText"),
  wxSub: $("wxSub"),
  stats: $("stats"),
  feels: $("feels"),
  hum: $("hum"),
  wind: $("wind"),
  windDir: $("windDir"),
  precip: $("precip"),
  popNow: $("popNow"),
  dew: $("dew"),
  uv: $("uv"),
  uvMax: $("uvMax"),
  vis: $("vis"),
  press: $("press"),
  sun: $("sun"),
  sky: $("sky"),
  sunIcon: $("sunIcon"),
  sunriseTime: $("sunriseTime"),
  sunsetTime: $("sunsetTime"),
  sunNow: $("sunNow"),
  sunDot: $("sunDot"),
  moonIcon: $("moonIcon"),
  moonriseTime: $("moonriseTime"),
  moonsetTime: $("moonsetTime"),
  moonNow: $("moonNow"),
  moonDot: $("moonDot"),
  skyNote: $("skyNote"),
  hourlyHint: $("hourlyHint"),
  hourly: $("hourly"),
  daily: $("daily"),
  aqi: $("aqi"),
  aqiCat: $("aqiCat"),
  pm25: $("pm25"),
  pm10: $("pm10"),
  o3: $("o3"),
  no2: $("no2"),
  airStatus: $("airStatus"),
};

const STORE_KEY = "weather-atlas:lastPlace";
const DEFAULT_PLACE = {
  name: "Pune",
  admin1: "Maharashtra",
  country: "India",
  latitude: 18.5204,
  longitude: 73.8567,
};

function setStatus(msg, tone = "muted") {
  els.status.textContent = msg || "";
  els.status.style.color =
    tone === "bad"
      ? "var(--bad)"
      : tone === "warn"
        ? "var(--warn)"
        : "var(--muted)";
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function degToCompass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx];
}

function degToCompassLong(deg) {
  const dirs = [
    "North",
    "Northeast",
    "East",
    "Southeast",
    "South",
    "Southwest",
    "West",
    "Northwest",
  ];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx];
}

function fmtTempC(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "--";
  const rounded = Math.round(n);
  return `${rounded}°C`;
}

function fmtWind(kmh, deg) {
  if (!Number.isFinite(kmh)) return "--";
  const d = Number.isFinite(deg) ? ` ${degToCompass(deg)}` : "";
  return `${Math.round(kmh)} km/h${d}`;
}

function fmtWindDir(deg) {
  if (!Number.isFinite(deg)) return "--";
  return `${degToCompassLong(deg)} ${Math.round(deg)}°`;
}

function fmtKmFromMeters(m) {
  if (!Number.isFinite(m)) return "--";
  const km = m / 1000;
  return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
}

function iconDropletSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13Z" stroke="rgba(255,255,255,.86)" stroke-width="2" fill="rgba(255,255,255,.14)"/>
    </svg>
  `;
}

function iconUvSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="6" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.84)" stroke-width="2"/>
      <path d="M12 5.2v2.1M12 16.7v2.1M5.2 12h2.1M16.7 12h2.1M7.2 7.2l1.5 1.5M15.3 15.3l1.5 1.5M16.8 7.2l-1.5 1.5M8.7 15.3l-1.5 1.5" stroke="rgba(255,215,138,.85)" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="3.2" fill="rgba(255,215,138,.18)" stroke="rgba(255,215,138,.75)" stroke-width="1.8"/>
      <text x="12" y="15.6" text-anchor="middle" font-size="7.2" font-weight="800" fill="rgba(255,255,255,.88)" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">UV</text>
    </svg>
  `;
}

function iconSunSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="rgba(255,255,255,.86)" stroke-width="2" fill="rgba(255,255,255,.14)"/>
      <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

function iconMoonSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15.5 2.5a8 8 0 1 0 6 13.6A7 7 0 0 1 15.5 2.5Z" stroke="rgba(255,255,255,.86)" stroke-width="2" fill="rgba(255,255,255,.12)"/>
    </svg>
  `;
}

function iconRefreshSvg() {
  return `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 7v5h-5" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M4 17v-5h5" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 12a8 8 0 0 0-14.6-4.6" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round"/>
      <path d="M4 12a8 8 0 0 0 14.6 4.6" stroke="rgba(255,255,255,.86)" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

function iconWindArrowSvg(deg) {
  const rot = Number.isFinite(deg) ? deg : 0;
  return `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(12 12) rotate(${rot}) translate(-12 -12)">
        <path d="M12 3l4 7-4-2-4 2 4-7Z" fill="rgba(255,255,255,.82)"/>
        <path d="M12 9v12" stroke="rgba(255,255,255,.82)" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

function fmtTimeLabel(iso, tz) {
  // Open-Meteo returns local wall-clock timestamps (no offset).
  // Avoid timezone conversion; just format HH:MM from the string.
  if (typeof iso === "string") {
    const m = iso.match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/,
    );
    if (m) {
      const hh = String(Number(m[4]));
      const mm = m[5];
      return `${hh}:${mm}`;
    }
  }
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
    }).format(d);
  } catch {
    return iso;
  }
}

function fmtClockFromUtcMs(utcMs, tz) {
  if (!Number.isFinite(utcMs)) return "--";
  try {
    const d = new Date(utcMs);
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
    }).format(d);
  } catch {
    return "--";
  }
}

function fmtNowInTz(tz) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
    }).format(new Date());
  } catch {
    return "--";
  }
}

function fmtDayLabel(iso, tz) {
  // Daily dates are also local (YYYY-MM-DD). Render without timezone conversion.
  if (typeof iso === "string") {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const utc = Date.UTC(y, mo - 1, d, 12, 0, 0);
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(utc));
    }
  }
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: tz || undefined,
    }).format(d);
  } catch {
    return iso;
  }
}

function wxLabel(code) {
  // Open-Meteo weather code mapping (WMO).
  // Keep it short and user-facing.
  const c = Number(code);
  if (c === 0) return "Clear";
  if (c === 1) return "Mostly clear";
  if (c === 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c === 45 || c === 48) return "Fog";
  if (c === 51 || c === 53 || c === 55) return "Drizzle";
  if (c === 56 || c === 57) return "Freezing drizzle";
  if (c === 61 || c === 63 || c === 65) return "Rain";
  if (c === 66 || c === 67) return "Freezing rain";
  if (c === 71 || c === 73 || c === 75) return "Snow";
  if (c === 77) return "Snow grains";
  if (c === 80 || c === 81 || c === 82) return "Rain showers";
  if (c === 85 || c === 86) return "Snow showers";
  if (c === 95) return "Thunderstorm";
  if (c === 96 || c === 99) return "Thunderstorm with hail";
  return "Unknown";
}

function wxIconSvg(code) {
  // Minimal inline icons: clear / cloud / rain / snow / storm / fog.
  const c = Number(code);
  const isFog = c === 45 || c === 48;
  const isSnow =
    c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86;
  const isStorm = c === 95 || c === 96 || c === 99;
  const isRain =
    c === 51 ||
    c === 53 ||
    c === 55 ||
    c === 56 ||
    c === 57 ||
    c === 61 ||
    c === 63 ||
    c === 65 ||
    c === 66 ||
    c === 67 ||
    c === 80 ||
    c === 81 ||
    c === 82;
  const isCloud = c === 1 || c === 2 || c === 3;

  const stroke = "rgba(255,255,255,.86)";
  const fill = "rgba(255,255,255,.16)";

  if (isStorm) {
    return `
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 30c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 8.6 22.4 6 27 6c6 0 11 5 11 11v.2C41.4 18 44 21 44 25c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
        <path d="M23 42l4-8h-6l4-10" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  if (isSnow) {
    return `
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 26c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 4.6 22.4 2 27 2c6 0 11 5 11 11v.2C41.4 14 44 17 44 21c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
        <path d="M18 34l2 2m0-2l-2 2m12-2l2 2m0-2l-2 2M24 34l2 2m0-2l-2 2" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (isRain) {
    return `
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 26c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 4.6 22.4 2 27 2c6 0 11 5 11 11v.2C41.4 14 44 17 44 21c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
        <path d="M18 34l-2 6m10-6l-2 6m10-6l-2 6" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (isFog) {
    return `
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 24c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 2.6 22.4 0 27 0c6 0 11 5 11 11v.2C41.4 12 44 15 44 19c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
        <path d="M10 32h28M12 37h24M14 42h20" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity=".9"/>
      </svg>
    `;
  }

  if (isCloud) {
    return `
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 30c-6 0-10-3-10-9 0-5 4-9 9-9 1 0 2 0 3 .4C19 8.6 22.4 6 27 6c6 0 11 5 11 11v.2C41.4 18 44 21 44 25c0 5-4 9-10 9H16Z" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
      </svg>
    `;
  }

  // Clear / unknown
  return `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="8" stroke="${stroke}" stroke-width="2" fill="${fill}"/>
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9 9l4 4M35 35l4 4M39 9l-4 4M13 35l-4 4" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
}

function themeFromWeatherCode(code) {
  const c = Number(code);
  if (c === 45 || c === 48) return "fog";
  if (c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86)
    return "snow";
  if (c === 95 || c === 96 || c === 99) return "storm";
  if (
    c === 51 ||
    c === 53 ||
    c === 55 ||
    c === 56 ||
    c === 57 ||
    c === 61 ||
    c === 63 ||
    c === 65 ||
    c === 66 ||
    c === 67 ||
    c === 80 ||
    c === 81 ||
    c === 82
  )
    return "rain";
  if (c === 1 || c === 2 || c === 3) return "cloud";
  return "clear";
}

function applyTheme(theme) {
  document.body.dataset.theme = theme || "clear";
}

function aqiCategory(usAqi) {
  const v = Number(usAqi);
  if (!Number.isFinite(v)) return { label: "", tone: "muted" };
  if (v <= 50) return { label: "Good", tone: "good" };
  if (v <= 100) return { label: "Moderate", tone: "warn" };
  if (v <= 150) return { label: "Unhealthy (SG)", tone: "warn" };
  if (v <= 200) return { label: "Unhealthy", tone: "bad" };
  if (v <= 300) return { label: "Very unhealthy", tone: "bad" };
  return { label: "Hazardous", tone: "bad" };
}

async function fetchJson(url, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      let detail = "";
      try {
        const text = await res.text();
        detail = text ? `: ${text.slice(0, 160)}` : "";
      } catch {
        // ignore
      }
      throw new Error(`HTTP ${res.status}${detail}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function setSuggestions(items) {
  els.suggest.innerHTML = "";
  if (!items?.length) {
    els.suggest.classList.remove("open");
    return;
  }
  els.suggest.classList.add("open");
  for (const it of items) {
    const div = document.createElement("div");
    div.className = "opt";
    div.role = "option";
    const sub = [it.admin1, it.country].filter(Boolean).join(", ");
    div.innerHTML = `<div class="city">${escapeHtml(it.name)}</div><div class="sub">${escapeHtml(sub)}</div>`;
    div.addEventListener("click", () => {
      setSuggestions([]);
      els.q.value = `${it.name}${sub ? ", " + sub : ""}`;
      selectPlace({
        name: it.name,
        admin1: it.admin1,
        country: it.country,
        latitude: it.latitude,
        longitude: it.longitude,
      });
    });
    els.suggest.appendChild(div);
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function savePlace(place) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(place));
  } catch {
    // ignore
  }
}

function loadPlace() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (
      !p ||
      typeof p.latitude !== "number" ||
      typeof p.longitude !== "number" ||
      !Number.isFinite(p.latitude) ||
      !Number.isFinite(p.longitude)
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

function renderHero({ place, forecast }) {
  const tz = forecast?.timezone;
  const nowIso = forecast?.current?.time;
  const curr = forecast?.current;
  const daily = forecast?.daily;
  const hourly = forecast?.hourly;

  const where = [place?.name, place?.admin1, place?.country]
    .filter(Boolean)
    .join(", ");
  els.place.textContent = where || "Unknown place";

  const updated = nowIso ? `Updated: ${fmtTimeLabel(nowIso, tz)}` : "";
  const coords =
    typeof place?.latitude === "number" && typeof place?.longitude === "number"
      ? `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`
      : "";
  els.meta.textContent = [updated, coords].filter(Boolean).join("  ·  ");

  const temp = curr?.temperature_2m;
  els.tempValue.textContent =
    typeof temp === "number" ? String(Math.round(temp)) : "--";
  els.tempUnit.textContent = "°C";

  const code = curr?.weather_code;
  els.wxText.textContent = code == null ? "" : wxLabel(code);
  applyTheme(themeFromWeatherCode(code));

  const hi =
    daily?.temperature_2m_max?.[0] != null
      ? `H ${Math.round(daily.temperature_2m_max[0])}°`
      : null;
  const lo =
    daily?.temperature_2m_min?.[0] != null
      ? `L ${Math.round(daily.temperature_2m_min[0])}°`
      : null;
  const wind =
    curr?.wind_speed_10m != null
      ? `Wind ${Math.round(curr.wind_speed_10m)} km/h`
      : null;
  els.wxSub.textContent = [hi, lo, wind].filter(Boolean).join("  ·  ");

  // Badge is a refresh button; show refresh icon (not weather icon).
  els.wxIcon.innerHTML = iconRefreshSvg();

  els.stats.hidden = false;
  els.feels.textContent = fmtTempC(curr?.apparent_temperature);
  els.hum.textContent =
    curr?.relative_humidity_2m != null
      ? `${Math.round(curr.relative_humidity_2m)}%`
      : "--";
  els.wind.textContent = fmtWind(curr?.wind_speed_10m, curr?.wind_direction_10m);
  els.windDir.innerHTML = `<span class="vIcon">${iconWindArrowSvg(
    curr?.wind_direction_10m,
  )}<span>${escapeHtml(fmtWindDir(curr?.wind_direction_10m))}</span></span>`;
  els.precip.innerHTML =
    curr?.precipitation != null
      ? `<span class="vIcon">${iconDropletSvg()}<span>${escapeHtml(
          `${curr.precipitation.toFixed(1)} mm`,
        )}</span></span>`
      : "--";

  const idx =
    Array.isArray(hourly?.time) && nowIso ? nearestTimeIndex(hourly.time, nowIso) : -1;
  const pop = idx >= 0 ? hourly?.precipitation_probability?.[idx] : null;
  els.popNow.innerHTML = Number.isFinite(pop)
    ? `<span class="vIcon">${iconDropletSvg()}<span>${escapeHtml(
        `${Math.round(pop)}%`,
      )}</span></span>`
    : "--";
  const dew = idx >= 0 ? hourly?.dew_point_2m?.[idx] : null;
  els.dew.textContent = fmtTempC(dew);
  const uv = idx >= 0 ? hourly?.uv_index?.[idx] : null;
  els.uv.innerHTML = Number.isFinite(uv)
    ? `<span class="vIcon">${iconUvSvg()}<span>${escapeHtml(
        uv.toFixed(1),
      )}</span></span>`
    : "--";
  const uvMax = daily?.uv_index_max?.[0];
  els.uvMax.innerHTML = Number.isFinite(uvMax)
    ? `<span class="vIcon">${iconUvSvg()}<span>${escapeHtml(
        uvMax.toFixed(1),
      )}</span></span>`
    : "--";
  const vis = idx >= 0 ? hourly?.visibility?.[idx] : null;
  els.vis.textContent = fmtKmFromMeters(vis);
  const press = idx >= 0 ? hourly?.surface_pressure?.[idx] : null;
  els.press.textContent = Number.isFinite(press) ? `${Math.round(press)} hPa` : "--";

  const sunrise = daily?.sunrise?.[0];
  const sunset = daily?.sunset?.[0];
  els.sun.textContent =
    sunrise && sunset
      ? `${fmtTimeLabel(sunrise, tz)} / ${fmtTimeLabel(sunset, tz)}`
      : "--";

  lastSky = { forecast, place };
  renderSky();
}

function renderHourly(forecast) {
  const tz = forecast?.timezone;
  const h = forecast?.hourly;
  const times = h?.time;
  if (!Array.isArray(times) || times.length === 0) {
    els.hourly.innerHTML = "";
    els.hourlyHint.textContent = "";
    return;
  }

  const nowIso = forecast?.current?.time;
  const startIdx = nowIso ? nearestTimeIndex(times, nowIso) : 0;
  const idx0 = clamp(startIdx, 0, Math.max(0, times.length - 1));
  const take = 24;

  els.hourlyHint.textContent = nowIso
    ? `Starting ${fmtTimeLabel(times[idx0], tz)}`
    : "";

  const cards = [];
  for (let i = 0; i < take; i++) {
    const idx = idx0 + i;
    if (idx >= times.length) break;
    const t = times[idx];
    const temp = h.temperature_2m?.[idx];
    const code = h.weather_code?.[idx];
    const pop = h.precipitation_probability?.[idx];
    const wind = h.wind_speed_10m?.[idx];
    cards.push({
      time: fmtTimeLabel(t, tz),
      temp: Number.isFinite(temp) ? `${Math.round(temp)}°` : "--",
      icon: wxIconSvg(code),
      pop: Number.isFinite(pop) ? `${Math.round(pop)}%` : "--",
      wind: Number.isFinite(wind) ? `${Math.round(wind)} km/h` : "--",
    });
  }

  els.hourly.innerHTML = cards
    .map(
      (c) => `
      <div class="hCard">
        <div class="hTime">${escapeHtml(c.time)}</div>
        <div class="hMain">
          <div class="hTemp">${escapeHtml(c.temp)}</div>
          <div class="hIcon" aria-hidden="true">${c.icon}</div>
        </div>
        <div class="hSub">
          <span>POP ${escapeHtml(c.pop)}</span>
          <span>${escapeHtml(c.wind)}</span>
        </div>
      </div>
    `,
    )
    .join("");
}

function renderDaily(forecast) {
  const tz = forecast?.timezone;
  const d = forecast?.daily;
  const times = d?.time;
  if (!Array.isArray(times) || times.length === 0) {
    els.daily.innerHTML = "";
    return;
  }

  const rows = [];
  for (let i = 0; i < Math.min(7, times.length); i++) {
    const date = times[i];
    const code = d.weather_code?.[i];
    const hi = d.temperature_2m_max?.[i];
    const lo = d.temperature_2m_min?.[i];
    const pr = d.precipitation_sum?.[i];
    rows.push({
      day: fmtDayLabel(date, tz),
      icon: wxIconSvg(code),
      desc: wxLabel(code),
      hi: Number.isFinite(hi) ? `${Math.round(hi)}°` : "--",
      lo: Number.isFinite(lo) ? `${Math.round(lo)}°` : "--",
      precip: Number.isFinite(pr) ? `${pr.toFixed(1)} mm` : "--",
    });
  }

  els.daily.innerHTML = rows
    .map(
      (r) => `
      <div class="dRow">
        <div class="dLeft">
          <div class="dIcon" aria-hidden="true">${r.icon}</div>
          <div class="dName" title="${escapeHtml(r.desc)}">${escapeHtml(r.day)} <span style="color: var(--muted); font-weight: 600;">${escapeHtml(r.desc)}</span></div>
        </div>
        <div class="dMid">${escapeHtml(r.precip)}</div>
        <div class="dHi">${escapeHtml(r.hi)}</div>
        <div class="dLo">${escapeHtml(r.lo)}</div>
      </div>
    `,
    )
    .join("");
}

function nearestTimeIndex(isoList, targetIso) {
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return 0;
  let bestIdx = 0;
  let best = Infinity;
  for (let i = 0; i < isoList.length; i++) {
    const t = new Date(isoList[i]).getTime();
    const d = Math.abs(t - target);
    if (d < best) {
      best = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function parseLocalIsoToUtcMs(isoLocal, utcOffsetSeconds) {
  // Open-Meteo returns local times (for the requested timezone) without an offset.
  // Convert local wall-clock time -> UTC epoch using the provided utc_offset_seconds.
  if (typeof isoLocal !== "string") return null;
  const m = isoLocal.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const ss = m[6] ? Number(m[6]) : 0;
  if (![y, mo, d, hh, mm, ss].every((n) => Number.isFinite(n))) return null;
  const utcMs = Date.UTC(y, mo - 1, d, hh, mm, ss) - utcOffsetSeconds * 1000;
  return Number.isFinite(utcMs) ? utcMs : null;
}

function dotPosOnArc(progress, { below = false } = {}) {
  const p = clamp(progress, 0, 1);
  const x = 10 + 220 * p;
  const a = 42 * Math.sin(Math.PI * p);
  const y = below ? 50 + a : 50 - a;
  return { x, y };
}

let lastSky = null; // { forecast, place }

function renderSky() {
  if (!lastSky?.forecast) return;
  const forecast = lastSky.forecast;
  const tz = forecast?.timezone;
  const offset = Number(forecast?.utc_offset_seconds) || 0;
  const daily = forecast?.daily;

  const sunriseIso = daily?.sunrise?.[0];
  const sunsetIso = daily?.sunset?.[0];
  const nowIso = forecast?.current?.time;

  els.sunIcon.innerHTML = iconSunSvg();
  els.moonIcon.innerHTML = iconMoonSvg();

  // Live local time for the selected location.
  els.sunNow.textContent = fmtNowInTz(tz);

  const sunriseUtc = parseLocalIsoToUtcMs(sunriseIso, offset);
  const sunsetUtc = parseLocalIsoToUtcMs(sunsetIso, offset);
  const nowUtc = Date.now();
  const sunrise1Iso = daily?.sunrise?.[1] ?? null;
  const sunset1Iso = daily?.sunset?.[1] ?? null;
  const sunrise1Utc = parseLocalIsoToUtcMs(sunrise1Iso, offset);

  // Sun: day arc (sunrise->sunset) and night arc (sunset->next sunrise) below the horizon.
  let sunStartUtc = null;
  let sunEndUtc = null;
  let sunBelow = false;

  if (Number.isFinite(sunriseUtc) && Number.isFinite(sunsetUtc) && sunsetUtc > sunriseUtc) {
    if (nowUtc >= sunriseUtc && nowUtc <= sunsetUtc) {
      sunStartUtc = sunriseUtc;
      sunEndUtc = sunsetUtc;
      sunBelow = false;
      els.sunriseTime.textContent = fmtTimeLabel(sunriseIso, tz);
      els.sunsetTime.textContent = fmtTimeLabel(sunsetIso, tz);
    } else if (nowUtc < sunriseUtc) {
      // Pre-dawn: yesterday sunset -> today sunrise.
      sunStartUtc = sunsetUtc - 24 * 60 * 60 * 1000;
      sunEndUtc = sunriseUtc;
      sunBelow = true;
      els.sunriseTime.textContent = fmtClockFromUtcMs(sunStartUtc, tz);
      els.sunsetTime.textContent = fmtTimeLabel(sunriseIso, tz);
    } else {
      // After sunset: today sunset -> tomorrow sunrise.
      const endUtc = Number.isFinite(sunrise1Utc)
        ? sunrise1Utc
        : sunriseUtc + 24 * 60 * 60 * 1000;
      sunStartUtc = sunsetUtc;
      sunEndUtc = endUtc;
      sunBelow = true;
      els.sunriseTime.textContent = fmtTimeLabel(sunsetIso, tz);
      els.sunsetTime.textContent = sunrise1Iso
        ? fmtTimeLabel(sunrise1Iso, tz)
        : fmtClockFromUtcMs(endUtc, tz);
    }
  } else {
    els.sunriseTime.textContent = sunriseIso ? fmtTimeLabel(sunriseIso, tz) : "--";
    els.sunsetTime.textContent = sunsetIso ? fmtTimeLabel(sunsetIso, tz) : "--";
  }

  if (Number.isFinite(sunStartUtc) && Number.isFinite(sunEndUtc) && sunEndUtc > sunStartUtc) {
    const p = (nowUtc - sunStartUtc) / (sunEndUtc - sunStartUtc);
    const { x, y } = dotPosOnArc(p, { below: sunBelow });
    els.sunDot.setAttribute("cx", String(x.toFixed(2)));
    els.sunDot.setAttribute("cy", String(y.toFixed(2)));
    const inRange = p >= 0 && p <= 1;
    els.sunDot.style.opacity = inRange ? (sunBelow ? "0.55" : "1") : "0.25";
  } else {
    els.sunDot.style.opacity = "0.25";
  }

  // Moon: approximate "night arc" using sunset -> next sunrise.
  // Open-Meteo forecast does not provide moonrise/moonset; this is a visual aid.
  els.moonNow.textContent = fmtNowInTz(tz);
  const nextSunriseIso = sunrise1Iso;
  const nextSunriseUtc = parseLocalIsoToUtcMs(nextSunriseIso, offset);

  let moonStartUtc = null;
  let moonEndUtc = null;
  let note = "";

  const isBeforeSunrise =
    Number.isFinite(sunriseUtc) && nowUtc < sunriseUtc && Number.isFinite(sunsetUtc);

  if (isBeforeSunrise) {
    // Late night (e.g. 2am): yesterday sunset -> today sunrise.
    moonStartUtc = sunsetUtc - 24 * 60 * 60 * 1000;
    moonEndUtc = sunriseUtc;
    els.moonriseTime.textContent = fmtClockFromUtcMs(moonStartUtc, tz);
    els.moonsetTime.textContent = fmtTimeLabel(sunriseIso, tz);
  } else if (Number.isFinite(sunsetUtc) && Number.isFinite(nextSunriseUtc)) {
    moonStartUtc = sunsetUtc;
    moonEndUtc = nextSunriseUtc;
    els.moonriseTime.textContent = fmtTimeLabel(sunsetIso, tz);
    els.moonsetTime.textContent = fmtTimeLabel(nextSunriseIso, tz);
  } else if (Number.isFinite(sunsetUtc)) {
    moonStartUtc = sunsetUtc;
    moonEndUtc = sunsetUtc + 12 * 60 * 60 * 1000;
    els.moonriseTime.textContent = fmtTimeLabel(sunsetIso, tz);
    els.moonsetTime.textContent = "--";
  } else if (Number.isFinite(sunriseUtc)) {
    moonEndUtc = sunriseUtc;
    moonStartUtc = sunriseUtc - 12 * 60 * 60 * 1000;
    els.moonriseTime.textContent = "--";
    els.moonsetTime.textContent = fmtTimeLabel(sunriseIso, tz);
  } else {
    els.moonriseTime.textContent = "--";
    els.moonsetTime.textContent = "--";
  }

  if (Number.isFinite(moonStartUtc) && Number.isFinite(moonEndUtc) && moonEndUtc > moonStartUtc) {
    const p = (nowUtc - moonStartUtc) / (moonEndUtc - moonStartUtc);
    const { x, y } = dotPosOnArc(p);
    els.moonDot.setAttribute("cx", String(x.toFixed(2)));
    els.moonDot.setAttribute("cy", String(y.toFixed(2)));
    const up = p >= 0 && p <= 1;
    els.moonDot.style.opacity = up ? "1" : "0.18";
  } else {
    els.moonDot.style.opacity = "0.18";
  }

  // Next event helpers (show clearly when they "appear").
  const parts = [];
  let nextSunrise = null;
  if (sunriseIso && Number.isFinite(sunriseUtc) && nowUtc < sunriseUtc) {
    nextSunrise = sunriseIso;
  } else {
    nextSunrise = sunrise1Iso;
  }
  let nextSunset = null;
  if (sunsetIso && Number.isFinite(sunsetUtc) && nowUtc < sunsetUtc) {
    nextSunset = sunsetIso;
  } else {
    nextSunset = sunset1Iso;
  }
  if (nextSunrise) parts.push(`Sun rises: ${fmtTimeLabel(nextSunrise, tz)}`);
  if (nextSunset) parts.push(`Sun sets: ${fmtTimeLabel(nextSunset, tz)}`);

  // Moon is approximate: appears after sunset, ends at next sunrise.
  if (Number.isFinite(moonStartUtc))
    parts.push(`Moon appears: ${fmtClockFromUtcMs(moonStartUtc, tz)}`);
  if (Number.isFinite(moonEndUtc))
    parts.push(`Moon ends: ${fmtClockFromUtcMs(moonEndUtc, tz)}`);

  els.skyNote.textContent = [note, parts.join("  ·  ")].filter(Boolean).join("  ·  ");
  els.sky.hidden = false;
}

async function searchCity(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    q,
  )}&count=6&language=en&format=json`;
  const data = await fetchJson(url);
  return data?.results ?? [];
}

async function reverseGeocodeClient(lat, lon) {
  // Free client-side reverse geocode (no API key). Intended for current device coords.
  const url =
    "https://api.bigdatacloud.net/data/reverse-geocode-client" +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    "&localityLanguage=en";
  return await fetchJson(url);
}

function placeFromReverseGeocode(data, lat, lon) {
  const city = data?.city || data?.locality || "";
  const admin1 = data?.principalSubdivision || "";
  const country = data?.countryName || data?.countryCode || "";
  return {
    name: city || admin1 || "My location",
    admin1,
    country,
    latitude: lat,
    longitude: lon,
  };
}

async function fetchForecast(lat, lon) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    "&timezone=auto" +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m" +
    "&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index,visibility,dew_point_2m,surface_pressure" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max";
  return await fetchJson(url);
}

async function fetchAirQuality(lat, lon) {
  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    "&timezone=auto" +
    "&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide";
  return await fetchJson(url);
}

let forecastSeq = 0;
let searchSeq = 0;
let lastPlace = null;

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
    if (my !== forecastSeq) return;
    renderHero({ place, forecast });
    renderHourly(forecast);
    renderDaily(forecast);
    renderAirQuality(air);
    if (!silent) setStatus("");
  } catch (err) {
    if (my !== forecastSeq) return;
    if (!silent) {
      setStatus(
        `Could not fetch forecast. ${
          err?.name === "AbortError"
            ? "Timed out."
            : "Check internet, and open via http://localhost (not file://)."
        } ${err?.message ? `(${String(err.message).slice(0, 80)})` : ""}`,
        "bad",
      );
    }
    // Helpful during debugging if the user opens DevTools.
    console.error("Forecast fetch failed:", err);
  }
}

function renderAirQuality(air) {
  if (!air?.current) {
    els.aqi.textContent = "--";
    els.aqiCat.textContent = "Air quality unavailable";
    els.aqiCat.style.color = "var(--muted)";
    els.pm25.textContent = "--";
    els.pm10.textContent = "--";
    els.o3.textContent = "--";
    els.no2.textContent = "--";
    return;
  }

  const c = air.current;
  const aqi = c.us_aqi;
  els.aqi.textContent = Number.isFinite(aqi) ? String(Math.round(aqi)) : "--";

  const cat = aqiCategory(aqi);
  els.aqiCat.textContent = cat.label;
  els.aqiCat.style.color =
    cat.tone === "good"
      ? "var(--good)"
      : cat.tone === "bad"
        ? "var(--bad)"
        : "var(--warn)";

  els.pm25.textContent = Number.isFinite(c.pm2_5)
    ? `${c.pm2_5.toFixed(1)} µg/m³`
    : "--";
  els.pm10.textContent = Number.isFinite(c.pm10)
    ? `${c.pm10.toFixed(1)} µg/m³`
    : "--";
  els.o3.textContent = Number.isFinite(c.ozone)
    ? `${c.ozone.toFixed(0)} µg/m³`
    : "--";
  els.no2.textContent = Number.isFinite(c.nitrogen_dioxide)
    ? `${c.nitrogen_dioxide.toFixed(0)} µg/m³`
    : "--";
}

function locate() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.", "warn");
    return;
  }
  setStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      try {
        setStatus("Resolving location name…");
        const data = await reverseGeocodeClient(lat, lon);
        await selectPlace(placeFromReverseGeocode(data, lat, lon));
      } catch (err) {
        console.error("Reverse geocode failed:", err);
        await selectPlace({
          name: "My location",
          admin1: "",
          country: "",
          latitude: lat,
          longitude: lon,
        });
      }
    },
    (e) => {
      setStatus(
        e.code === e.PERMISSION_DENIED
          ? "Location permission denied."
          : "Could not read location.",
        "warn",
      );
    },
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
  );
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const onType = debounce(async () => {
  const q = els.q.value.trim();
  if (q.length < 3) {
    setSuggestions([]);
    return;
  }
  const my = ++searchSeq;
  try {
    const results = await searchCity(q);
    if (my !== searchSeq) return;
    setSuggestions(results);
  } catch {
    if (my !== searchSeq) return;
    setSuggestions([]);
  }
}, 220);

els.q.addEventListener("input", onType);
els.q.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setSuggestions([]);
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = els.q.value.trim();
  setSuggestions([]);
  if (q.length < 2) {
    setStatus("Type a city name first.", "warn");
    return;
  }
  setStatus("Searching…");
  const my = ++searchSeq;
  try {
    const results = await searchCity(q);
    if (my !== searchSeq) return;
    if (!results.length) {
      setStatus("No matching cities found.", "warn");
      return;
    }
    // Pick best match if user submitted without selecting.
    const best = results[0];
    setStatus("");
    await selectPlace({
      name: best.name,
      admin1: best.admin1,
      country: best.country,
      latitude: best.latitude,
      longitude: best.longitude,
    });
  } catch {
    if (my !== searchSeq) return;
    setStatus(
      "Search failed. Check internet, and open via http://localhost (not file://).",
      "bad",
    );
  }
});

els.locateBtn.addEventListener("click", locate);
els.badge.addEventListener("click", () => {
  if (!lastPlace) {
    setStatus("Search a city first.", "warn");
    return;
  }
  selectPlace(lastPlace);
});

// Bootstrap
const saved = loadPlace();
if (saved) {
  selectPlace(saved);
} else {
  els.q.value = `${DEFAULT_PLACE.name}, ${DEFAULT_PLACE.admin1}, ${DEFAULT_PLACE.country}`;
  selectPlace(DEFAULT_PLACE);
}

// Keep sun/moon positions moving as time passes.
setInterval(() => {
  try {
    renderSky();
  } catch {
    // ignore
  }
}, 60_000);

// Auto-refresh data periodically in the background.
setInterval(() => {
  if (!lastPlace) return;
  selectPlace(lastPlace, { silent: true });
}, 10 * 60_000);
