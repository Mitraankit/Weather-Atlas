// DOM render functions — one per UI section.
// Each function receives data and writes to the DOM; no fetching here.

import { els } from "./els.js";
import {
  escapeHtml,
  fmtTempC, fmtWind, fmtWindDir, fmtKmFromMeters,
  fmtTimeLabel, fmtClockFromUtcMs, fmtNowInTz, fmtDayLabel,
  nearestTimeIndex,
} from "./utils.js";
import {
  iconDropletSvg, iconUvSvg, iconRefreshSvg,
  iconWindArrowSvg, wxIconSvg,
} from "./icons.js";
import { wxLabel, themeFromWeatherCode, applyTheme, aqiCategory } from "./weather.js";
import { setLastSky, renderSky } from "./sky.js";

// --- Status bar ---

export function setStatus(msg, tone = "muted") {
  els.status.textContent = msg || "";
  els.status.style.color =
    tone === "bad"  ? "var(--bad)"  :
    tone === "warn" ? "var(--warn)" :
                      "var(--muted)";
}

// --- Search suggestions dropdown ---
// onSelect(place) is called when the user clicks a result.

export function setSuggestions(items, onSelect) {
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
      setSuggestions([], onSelect);
      els.q.value = `${it.name}${sub ? ", " + sub : ""}`;
      onSelect({ name: it.name, admin1: it.admin1, country: it.country, latitude: it.latitude, longitude: it.longitude });
    });
    els.suggest.appendChild(div);
  }
}

// --- Hero panel ---

export function renderHero({ place, forecast }) {
  const tz    = forecast?.timezone;
  const curr  = forecast?.current;
  const daily = forecast?.daily;
  const hourly = forecast?.hourly;

  // Location + timestamp
  els.place.textContent = [place?.name, place?.admin1, place?.country].filter(Boolean).join(", ") || "Unknown place";
  const updated = forecast?.current?.time ? `Updated: ${fmtTimeLabel(forecast.current.time, tz)}` : "";
  const coords  = typeof place?.latitude === "number" && typeof place?.longitude === "number"
    ? `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`
    : "";
  els.meta.textContent = [updated, coords].filter(Boolean).join("  ·  ");

  // Temperature
  const temp = curr?.temperature_2m;
  els.tempValue.textContent = typeof temp === "number" ? String(Math.round(temp)) : "--";
  els.tempUnit.textContent  = "°C";

  // Condition
  const code = curr?.weather_code;
  els.wxText.textContent = code == null ? "" : wxLabel(code);
  applyTheme(themeFromWeatherCode(code));

  // Subtitle: high/low/wind
  const hi   = daily?.temperature_2m_max?.[0] != null ? `H ${Math.round(daily.temperature_2m_max[0])}°` : null;
  const lo   = daily?.temperature_2m_min?.[0] != null ? `L ${Math.round(daily.temperature_2m_min[0])}°` : null;
  const wind = curr?.wind_speed_10m        != null ? `Wind ${Math.round(curr.wind_speed_10m)} km/h` : null;
  els.wxSub.textContent = [hi, lo, wind].filter(Boolean).join("  ·  ");

  // Refresh icon in the badge button
  els.wxIcon.innerHTML = iconRefreshSvg();

  // Stats grid
  els.stats.hidden = false;
  els.feels.textContent = fmtTempC(curr?.apparent_temperature);
  els.hum.textContent   = curr?.relative_humidity_2m != null ? `${Math.round(curr.relative_humidity_2m)}%` : "--";
  els.wind.textContent  = fmtWind(curr?.wind_speed_10m, curr?.wind_direction_10m);
  els.windDir.innerHTML = `<span class="vIcon">${iconWindArrowSvg(curr?.wind_direction_10m)}<span>${escapeHtml(fmtWindDir(curr?.wind_direction_10m))}</span></span>`;
  els.precip.innerHTML  = curr?.precipitation != null
    ? `<span class="vIcon">${iconDropletSvg()}<span>${escapeHtml(`${curr.precipitation.toFixed(1)} mm`)}</span></span>`
    : "--";

  // Hourly-derived stats (rain chance, dew point, UV, visibility, pressure)
  const nowIso = forecast?.current?.time;
  const idx    = Array.isArray(hourly?.time) && nowIso ? nearestTimeIndex(hourly.time, nowIso) : -1;

  const pop  = idx >= 0 ? hourly?.precipitation_probability?.[idx] : null;
  els.popNow.innerHTML = Number.isFinite(pop)
    ? `<span class="vIcon">${iconDropletSvg()}<span>${escapeHtml(`${Math.round(pop)}%`)}</span></span>`
    : "--";

  els.dew.textContent = fmtTempC(idx >= 0 ? hourly?.dew_point_2m?.[idx] : null);

  const uv = idx >= 0 ? hourly?.uv_index?.[idx] : null;
  els.uv.innerHTML = Number.isFinite(uv)
    ? `<span class="vIcon">${iconUvSvg()}<span>${escapeHtml(uv.toFixed(1))}</span></span>`
    : "--";

  const uvMax = daily?.uv_index_max?.[0];
  els.uvMax.innerHTML = Number.isFinite(uvMax)
    ? `<span class="vIcon">${iconUvSvg()}<span>${escapeHtml(uvMax.toFixed(1))}</span></span>`
    : "--";

  els.vis.textContent   = fmtKmFromMeters(idx >= 0 ? hourly?.visibility?.[idx] : null);
  els.press.textContent = Number.isFinite(idx >= 0 ? hourly?.surface_pressure?.[idx] : null)
    ? `${Math.round(hourly.surface_pressure[idx])} hPa`
    : "--";

  // Sunrise/sunset summary text
  const sunrise = daily?.sunrise?.[0];
  const sunset  = daily?.sunset?.[0];
  els.sun.textContent = sunrise && sunset
    ? `${fmtTimeLabel(sunrise, tz)} / ${fmtTimeLabel(sunset, tz)}`
    : "--";

  // Trigger sky arc update
  setLastSky({ forecast, place });
  renderSky();
}

// --- Hourly forecast panel ---

export function renderHourly(forecast) {
  const tz    = forecast?.timezone;
  const h     = forecast?.hourly;
  const times = h?.time;

  if (!Array.isArray(times) || times.length === 0) {
    els.hourly.innerHTML    = "";
    els.hourlyHint.textContent = "";
    return;
  }

  const nowIso   = forecast?.current?.time;
  const startIdx = nowIso ? nearestTimeIndex(times, nowIso) : 0;
  const idx0     = Math.max(0, Math.min(startIdx, times.length - 1));
  const take     = 24;

  els.hourlyHint.textContent = nowIso ? `Starting ${fmtTimeLabel(times[idx0], tz)}` : "";

  const cards = [];
  for (let i = 0; i < take; i++) {
    const idx  = idx0 + i;
    if (idx >= times.length) break;
    const temp = h.temperature_2m?.[idx];
    const code = h.weather_code?.[idx];
    const pop  = h.precipitation_probability?.[idx];
    const wind = h.wind_speed_10m?.[idx];
    cards.push({
      time: fmtTimeLabel(times[idx], tz),
      temp: Number.isFinite(temp) ? `${Math.round(temp)}°` : "--",
      icon: wxIconSvg(code),
      pop:  Number.isFinite(pop)  ? `${Math.round(pop)}%`  : "--",
      wind: Number.isFinite(wind) ? `${Math.round(wind)} km/h` : "--",
    });
  }

  els.hourly.innerHTML = cards.map((c) => `
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
  `).join("");
}

// --- 7-day daily forecast panel ---

export function renderDaily(forecast) {
  const tz    = forecast?.timezone;
  const d     = forecast?.daily;
  const times = d?.time;

  if (!Array.isArray(times) || times.length === 0) {
    els.daily.innerHTML = "";
    return;
  }

  const rows = [];
  for (let i = 0; i < Math.min(7, times.length); i++) {
    const code = d.weather_code?.[i];
    const hi   = d.temperature_2m_max?.[i];
    const lo   = d.temperature_2m_min?.[i];
    const pr   = d.precipitation_sum?.[i];
    rows.push({
      day:    fmtDayLabel(times[i], tz),
      icon:   wxIconSvg(code),
      desc:   wxLabel(code),
      hi:     Number.isFinite(hi) ? `${Math.round(hi)}°` : "--",
      lo:     Number.isFinite(lo) ? `${Math.round(lo)}°` : "--",
      precip: Number.isFinite(pr) ? `${pr.toFixed(1)} mm` : "--",
    });
  }

  els.daily.innerHTML = rows.map((r) => `
    <div class="dRow">
      <div class="dLeft">
        <div class="dIcon" aria-hidden="true">${r.icon}</div>
        <div class="dName" title="${escapeHtml(r.desc)}">${escapeHtml(r.day)} <span style="color: var(--muted); font-weight: 600;">${escapeHtml(r.desc)}</span></div>
      </div>
      <div class="dMid">${escapeHtml(r.precip)}</div>
      <div class="dHi">${escapeHtml(r.hi)}</div>
      <div class="dLo">${escapeHtml(r.lo)}</div>
    </div>
  `).join("");
}

// --- Air quality panel ---

export function renderAirQuality(air) {
  if (!air?.current) {
    els.aqi.textContent   = "--";
    els.aqiCat.textContent = "Air quality unavailable";
    els.aqiCat.style.color = "var(--muted)";
    els.pm25.textContent  = "--";
    els.pm10.textContent  = "--";
    els.o3.textContent    = "--";
    els.no2.textContent   = "--";
    return;
  }

  const c   = air.current;
  const aqi = c.us_aqi;
  els.aqi.textContent = Number.isFinite(aqi) ? String(Math.round(aqi)) : "--";

  const cat = aqiCategory(aqi);
  els.aqiCat.textContent = cat.label;
  els.aqiCat.style.color =
    cat.tone === "good" ? "var(--good)" :
    cat.tone === "bad"  ? "var(--bad)"  :
                          "var(--warn)";

  els.pm25.textContent = Number.isFinite(c.pm2_5)           ? `${c.pm2_5.toFixed(1)} µg/m³`           : "--";
  els.pm10.textContent = Number.isFinite(c.pm10)            ? `${c.pm10.toFixed(1)} µg/m³`            : "--";
  els.o3.textContent   = Number.isFinite(c.ozone)           ? `${c.ozone.toFixed(0)} µg/m³`           : "--";
  els.no2.textContent  = Number.isFinite(c.nitrogen_dioxide) ? `${c.nitrogen_dioxide.toFixed(0)} µg/m³` : "--";
}
