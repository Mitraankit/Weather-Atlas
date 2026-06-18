// Sun and moon arc rendering.
//
// The SVG track has viewBox "0 0 240 60". The horizon sits at y=50.
// dotPosOnArc() maps a 0→1 progress value to a point on the above-horizon arc:
//   x goes 10→230, y peaks at ~8 (halfway) then returns to 50.
// During nighttime the sun is parked at the horizon edge it's nearest to,
// since the below-horizon path would be clipped by the SVG viewport.

import { els } from "./els.js";
import { clamp, fmtTimeLabel, fmtClockFromUtcMs, fmtNowInTz } from "./utils.js";
import { iconSunSvg, iconMoonSvg } from "./icons.js";

// Shared state — set by renderHero() via setLastSky() each time data loads.
let lastSky = null;

export function setLastSky(data) {
  lastSky = data;
}

// Converts an Open-Meteo local ISO timestamp to a UTC epoch (ms).
// Open-Meteo omits the UTC offset, so we subtract it ourselves.
function parseLocalIsoToUtcMs(isoLocal, utcOffsetSeconds) {
  if (typeof isoLocal !== "string") return null;
  const m = isoLocal.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss = "0"] = m;
  const vals = [y, mo, d, hh, mm, ss].map(Number);
  if (!vals.every(Number.isFinite)) return null;
  const utcMs = Date.UTC(vals[0], vals[1] - 1, vals[2], vals[3], vals[4], vals[5])
    - utcOffsetSeconds * 1000;
  return Number.isFinite(utcMs) ? utcMs : null;
}

// Maps a progress value (0 = left horizon, 1 = right horizon) to SVG coordinates
// along the above-horizon arc.  Values outside [0,1] are clamped to the endpoints.
function dotPosOnArc(progress) {
  const p = clamp(progress, 0, 1);
  const x = 10 + 220 * p;
  const y = 50 - 42 * Math.sin(Math.PI * p);
  return { x, y };
}

// --- Sun arc ---
// Daytime  (sunrise→sunset):  travels above the arc, full opacity.
// Nighttime (sunset→next sunrise OR yesterday sunset→sunrise): parked at the
//   nearest horizon edge with reduced opacity (below-arc path is SVG-clipped).

function updateSunDot({ sunriseUtc, sunsetUtc, sunrise1Utc, sunriseIso, sunsetIso, sunrise1Iso, tz, nowUtc }) {
  let startUtc = null;
  let endUtc   = null;
  let isNight  = false;

  if (Number.isFinite(sunriseUtc) && Number.isFinite(sunsetUtc) && sunsetUtc > sunriseUtc) {
    if (nowUtc >= sunriseUtc && nowUtc <= sunsetUtc) {
      // Daytime
      startUtc = sunriseUtc;
      endUtc   = sunsetUtc;
      els.sunriseTime.textContent = fmtTimeLabel(sunriseIso, tz);
      els.sunsetTime.textContent  = fmtTimeLabel(sunsetIso,  tz);
    } else if (nowUtc < sunriseUtc) {
      // Pre-dawn: yesterday sunset → today sunrise
      startUtc = sunsetUtc - 24 * 60 * 60 * 1000;
      endUtc   = sunriseUtc;
      isNight  = true;
      els.sunriseTime.textContent = fmtClockFromUtcMs(startUtc, tz);
      els.sunsetTime.textContent  = fmtTimeLabel(sunriseIso, tz);
    } else {
      // After sunset: today sunset → tomorrow sunrise
      const nextSunrise = Number.isFinite(sunrise1Utc)
        ? sunrise1Utc
        : sunriseUtc + 24 * 60 * 60 * 1000;
      startUtc = sunsetUtc;
      endUtc   = nextSunrise;
      isNight  = true;
      els.sunriseTime.textContent = fmtTimeLabel(sunsetIso, tz);
      els.sunsetTime.textContent  = sunrise1Iso
        ? fmtTimeLabel(sunrise1Iso, tz)
        : fmtClockFromUtcMs(nextSunrise, tz);
    }
  } else {
    els.sunriseTime.textContent = sunriseIso ? fmtTimeLabel(sunriseIso, tz) : "--";
    els.sunsetTime.textContent  = sunsetIso  ? fmtTimeLabel(sunsetIso,  tz) : "--";
  }

  if (!Number.isFinite(startUtc) || !Number.isFinite(endUtc) || endUtc <= startUtc) {
    els.sunDot.style.opacity = "0.25";
    return;
  }

  if (isNight) {
    // Park sun at the edge it's nearest to rather than clipping off-screen
    const afterSunset = Number.isFinite(sunsetUtc) && nowUtc > sunsetUtc;
    els.sunDot.setAttribute("cx", afterSunset ? "230" : "10");
    els.sunDot.setAttribute("cy", "50");
    els.sunDot.style.opacity = "0.4";
  } else {
    const p = (nowUtc - startUtc) / (endUtc - startUtc);
    const { x, y } = dotPosOnArc(p);
    els.sunDot.setAttribute("cx", x.toFixed(2));
    els.sunDot.setAttribute("cy", y.toFixed(2));
    els.sunDot.style.opacity = p >= 0 && p <= 1 ? "1" : "0.25";
  }
}

// --- Moon arc ---
// The moon approximates the night window: sunset → next sunrise.
// During daytime (p < 0) the dot is parked at the left start with reduced opacity.
// During night (0 ≤ p ≤ 1) it travels the arc at full opacity.
// After moonset (p > 1) it fades.

function updateMoonDot({ sunriseUtc, sunsetUtc, sunrise1Utc, sunriseIso, sunsetIso, sunrise1Iso, tz, nowUtc }) {
  let startUtc = null;
  let endUtc   = null;

  const isBeforeSunrise = Number.isFinite(sunriseUtc) && nowUtc < sunriseUtc && Number.isFinite(sunsetUtc);

  if (isBeforeSunrise) {
    // Late night: yesterday sunset → today sunrise
    startUtc = sunsetUtc - 24 * 60 * 60 * 1000;
    endUtc   = sunriseUtc;
    els.moonriseTime.textContent = fmtClockFromUtcMs(startUtc, tz);
    els.moonsetTime.textContent  = fmtTimeLabel(sunriseIso, tz);
  } else if (Number.isFinite(sunsetUtc) && Number.isFinite(sunrise1Utc)) {
    startUtc = sunsetUtc;
    endUtc   = sunrise1Utc;
    els.moonriseTime.textContent = fmtTimeLabel(sunsetIso,  tz);
    els.moonsetTime.textContent  = fmtTimeLabel(sunrise1Iso, tz);
  } else if (Number.isFinite(sunsetUtc)) {
    startUtc = sunsetUtc;
    endUtc   = sunsetUtc + 12 * 60 * 60 * 1000;
    els.moonriseTime.textContent = fmtTimeLabel(sunsetIso, tz);
    els.moonsetTime.textContent  = "--";
  } else if (Number.isFinite(sunriseUtc)) {
    endUtc   = sunriseUtc;
    startUtc = sunriseUtc - 12 * 60 * 60 * 1000;
    els.moonriseTime.textContent = "--";
    els.moonsetTime.textContent  = fmtTimeLabel(sunriseIso, tz);
  } else {
    els.moonriseTime.textContent = "--";
    els.moonsetTime.textContent  = "--";
  }

  if (!Number.isFinite(startUtc) || !Number.isFinite(endUtc) || endUtc <= startUtc) {
    els.moonDot.style.opacity = "0.18";
    return;
  }

  const p = (nowUtc - startUtc) / (endUtc - startUtc);
  const { x, y } = dotPosOnArc(p); // clamps p→[0,1], so daytime parks at left (10,50)
  els.moonDot.setAttribute("cx", x.toFixed(2));
  els.moonDot.setAttribute("cy", y.toFixed(2));

  if (p < 0)      els.moonDot.style.opacity = "0.45"; // daytime: waiting at start
  else if (p <= 1) els.moonDot.style.opacity = "1";   // night: travelling
  else            els.moonDot.style.opacity = "0.18"; // past moonset

  return { startUtc, endUtc };
}

// --- Sky note (next event summary) ---

function buildSkyNote({ sunriseUtc, sunsetUtc, sunrise1Iso, sunset1Iso, moonStartUtc, moonEndUtc, tz, nowUtc, sunriseIso, sunsetIso }) {
  const parts = [];

  const nextSunrise = sunriseIso && Number.isFinite(sunriseUtc) && nowUtc < sunriseUtc
    ? sunriseIso
    : sunrise1Iso;
  const nextSunset = sunsetIso && Number.isFinite(sunsetUtc) && nowUtc < sunsetUtc
    ? sunsetIso
    : sunset1Iso;

  if (nextSunrise) parts.push(`Sun rises: ${fmtTimeLabel(nextSunrise, tz)}`);
  if (nextSunset)  parts.push(`Sun sets: ${fmtTimeLabel(nextSunset, tz)}`);
  if (Number.isFinite(moonStartUtc)) parts.push(`Moon appears: ${fmtClockFromUtcMs(moonStartUtc, tz)}`);
  if (Number.isFinite(moonEndUtc))   parts.push(`Moon ends: ${fmtClockFromUtcMs(moonEndUtc, tz)}`);

  return parts.join("  ·  ");
}

// --- Main entry point (called by renderHero and the 60s interval) ---

export function renderSky() {
  if (!lastSky?.forecast) return;

  const { forecast } = lastSky;
  const tz     = forecast?.timezone;
  const offset = Number(forecast?.utc_offset_seconds) || 0;
  const daily  = forecast?.daily;
  const nowUtc = Date.now();

  els.sunIcon.innerHTML  = iconSunSvg();
  els.moonIcon.innerHTML = iconMoonSvg();
  els.sunNow.textContent  = fmtNowInTz(tz);
  els.moonNow.textContent = fmtNowInTz(tz);

  const sunriseIso  = daily?.sunrise?.[0] ?? null;
  const sunsetIso   = daily?.sunset?.[0]  ?? null;
  const sunrise1Iso = daily?.sunrise?.[1] ?? null;
  const sunset1Iso  = daily?.sunset?.[1]  ?? null;

  const sunriseUtc  = parseLocalIsoToUtcMs(sunriseIso,  offset);
  const sunsetUtc   = parseLocalIsoToUtcMs(sunsetIso,   offset);
  const sunrise1Utc = parseLocalIsoToUtcMs(sunrise1Iso, offset);

  const ctx = { sunriseUtc, sunsetUtc, sunrise1Utc, sunriseIso, sunsetIso, sunrise1Iso, tz, nowUtc };

  updateSunDot(ctx);
  const moon = updateMoonDot(ctx);

  els.skyNote.textContent = buildSkyNote({
    ...ctx,
    sunset1Iso,
    moonStartUtc: moon?.startUtc ?? null,
    moonEndUtc:   moon?.endUtc   ?? null,
  });

  els.sky.hidden = false;
}
