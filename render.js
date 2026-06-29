// DOM render functions — one per UI section.
// Each function receives data and writes to the DOM; no fetching here.

import { els } from "./els.js";
import {
  escapeHtml,
  fmtTemp, fmtWind, fmtWindSpeed, fmtWindDir, fmtKmFromMeters,
  fmtTimeLabel, fmtClockFromUtcMs, fmtNowInTz, fmtDayLabel,
  nearestTimeIndex,
} from "./utils.js";
import {
  iconDropletSvg, iconUvSvg, iconRefreshSvg,
  iconWindArrowSvg, wxIconSvg,
} from "./icons.js";
import { wxLabel, themeFromWeatherCode, applyTheme, aqiCategory } from "./weather.js";
import { setLastSky, renderSky } from "./sky.js";
import { getUnit } from "./unit.js";

// Arc state shared with the hourly scroll handler
let _arcState = null;

// --- Weather particle FX ---
let _lastFxTheme = null;

function renderWeatherFx(theme, isDay = true, windKmh = 0) {
  const key = `${theme}|${isDay ? "d" : "n"}`;
  if (key === _lastFxTheme) return;
  _lastFxTheme = key;

  const c = els.weatherFx;
  c.innerHTML = "";
  c.dataset.theme = theme;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const mk  = (cls) => { const d = document.createElement("div"); d.className = cls; return d; };

  if (theme === "rain" || theme === "storm") {
    const mul = theme === "storm" ? 1.25 : 1;
    for (let i = 0; i < Math.round(18 * mul); i++) {
      const d = mk("fxDropBg");
      d.style.left              = `${rnd(-5, 105)}%`;
      d.style.height            = `${rnd(12, 22)}px`;
      d.style.animationDuration = `${rnd(0.7, 1.1)}s`;
      d.style.animationDelay    = `${-rnd(0, 1.5)}s`;
      d.style.opacity           = String(rnd(0.15, 0.28));
      c.appendChild(d);
    }
    for (let i = 0; i < Math.round(30 * mul); i++) {
      const d = mk("fxDrop");
      d.style.left              = `${rnd(-5, 105)}%`;
      d.style.height            = `${rnd(22, 45)}px`;
      d.style.animationDuration = `${rnd(0.35, 0.6)}s`;
      d.style.animationDelay    = `${-rnd(0, 1.2)}s`;
      d.style.opacity           = String(rnd(0.28, theme === "storm" ? 0.50 : 0.42));
      c.appendChild(d);
    }
    if (theme === "storm") c.appendChild(mk("fxLightning"));

  } else if (theme === "snow") {
    for (let i = 0; i < 45; i++) {
      const s = rnd(4, 10);
      const d = mk("fxSnow");
      d.style.left              = `${rnd(-5, 105)}%`;
      d.style.width             = `${s}px`;
      d.style.height            = `${s}px`;
      d.style.animationDuration = `${rnd(5, 12)}s`;
      d.style.animationDelay    = `${-rnd(0, 12)}s`;
      d.style.opacity           = String(rnd(0.40, 0.72));
      c.appendChild(d);
    }

  } else if (theme === "fog") {
    for (let i = 0; i < 6; i++) {
      const d = mk("fxFog");
      d.style.top               = `${4 + i * 14}%`;
      d.style.height            = `${rnd(90, 160)}px`;
      d.style.animationDuration = `${rnd(18, 28)}s`;
      d.style.animationDelay    = `${-rnd(0, 18)}s`;
      d.style.animationDirection = i % 2 === 0 ? "normal" : "reverse";
      d.style.opacity           = String(rnd(0.10, 0.20));
      c.appendChild(d);
    }

  } else if (theme === "clear") {
    if (isDay) {
      for (let i = 0; i < 6; i++) {
        const d = mk("fxRay");
        d.style.left              = `${6 + i * 13}%`;
        d.style.width             = `${rnd(7, 13)}%`;
        d.style.transform         = `rotate(${rnd(-15, 15)}deg)`;
        d.style.animationDuration = `${rnd(4, 7)}s`;
        d.style.animationDelay    = `${-rnd(0, 7)}s`;
        c.appendChild(d);
      }
    } else {
      for (let i = 0; i < 55; i++) {
        const d = mk("fxStar");
        const sz = rnd(1, 3.2);
        d.style.left              = `${rnd(0, 100)}%`;
        d.style.top               = `${rnd(0, 88)}%`;
        d.style.width             = `${sz}px`;
        d.style.height            = `${sz}px`;
        d.style.animationDuration = `${rnd(1.5, 5)}s`;
        d.style.animationDelay    = `${-rnd(0, 5)}s`;
        d.style.setProperty("--star-op", rnd(0.28, 0.85).toFixed(2));
        c.appendChild(d);
      }
    }

  } else if (theme === "cloud") {
    for (let i = 0; i < 4; i++) {
      const d = mk("fxCloud");
      d.style.width             = `${rnd(250, 500)}px`;
      d.style.height            = `${rnd(80, 180)}px`;
      d.style.top               = `${rnd(2, 45)}%`;
      d.style.left              = "110%";
      d.style.animationDuration = `${rnd(40, 70)}s`;
      d.style.animationDelay    = `${-rnd(0, 60)}s`;
      d.style.opacity           = String(rnd(0.15, 0.30));
      c.appendChild(d);
    }
  }

  // Wind streaks overlay for any theme when wind is strong
  if (windKmh > 35) {
    const count = windKmh > 60 ? 20 : 12;
    for (let i = 0; i < count; i++) {
      const d = mk("fxWind");
      d.style.top               = `${rnd(0, 100)}%`;
      d.style.width             = `${rnd(40, 120)}px`;
      d.style.animationDuration = `${rnd(0.4, 0.9)}s`;
      d.style.animationDelay    = `${-rnd(0, 1.5)}s`;
      d.style.opacity           = String(rnd(0.12, 0.28));
      c.appendChild(d);
    }
  }
}

function uvColor(uv) {
  if (!Number.isFinite(uv)) return "";
  if (uv <= 2)  return "#6be4c7";
  if (uv <= 5)  return "#ffd97d";
  if (uv <= 7)  return "#ffaa55";
  if (uv <= 10) return "#ff6b6b";
  return "#c77dff";
}

function tempColor(celsius) {
  if (!Number.isFinite(celsius)) return "";
  if (celsius <= 0)  return "#82c4ff";
  if (celsius <= 10) return "#a8d8ea";
  if (celsius <= 18) return "#b5e0af";
  if (celsius <= 25) return "#ffd97d";
  if (celsius <= 32) return "#ffaa55";
  return "#ff6b6b";
}

const ARC_CSS_H = 76; // CSS height of the tempArc SVG in px

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
  const tz     = forecast?.timezone;
  const curr   = forecast?.current;
  const daily  = forecast?.daily;
  const hourly = forecast?.hourly;
  const unit   = getUnit();
  const conv   = (c) => unit === "F" ? c * 9 / 5 + 32 : c;

  // Location + timestamp
  els.place.textContent = [place?.name, place?.admin1, place?.country].filter(Boolean).join(", ") || "Unknown place";
  const updated = forecast?.current?.time ? `Updated: ${fmtTimeLabel(forecast.current.time, tz)}` : "";
  const coords  = typeof place?.latitude === "number" && typeof place?.longitude === "number"
    ? `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`
    : "";
  els.meta.textContent = [updated, coords].filter(Boolean).join("  ·  ");

  // Temperature
  const temp = curr?.temperature_2m;
  els.tempValue.textContent = typeof temp === "number" ? String(Math.round(conv(temp))) : "--";
  els.tempUnit.textContent  = unit === "F" ? "°F" : "°C";

  // Condition
  const code = curr?.weather_code;
  els.wxText.textContent = code == null ? "" : wxLabel(code);
  const theme = themeFromWeatherCode(code);
  applyTheme(theme);
  const sunrise0 = daily?.sunrise?.[0];
  const sunset0  = daily?.sunset?.[0];
  const nowMs    = forecast?.current?.time ? new Date(forecast.current.time).getTime() : Date.now();
  const isDay    = (sunrise0 && sunset0)
    ? nowMs >= new Date(sunrise0).getTime() && nowMs < new Date(sunset0).getTime()
    : true;
  document.body.dataset.tod = isDay ? "day" : "night";
  renderWeatherFx(theme, isDay, curr?.wind_speed_10m ?? 0);

  // Subtitle: high/low/wind
  const hi   = daily?.temperature_2m_max?.[0] != null ? `H ${Math.round(conv(daily.temperature_2m_max[0]))}°` : null;
  const lo   = daily?.temperature_2m_min?.[0] != null ? `L ${Math.round(conv(daily.temperature_2m_min[0]))}°` : null;
  const wind = curr?.wind_speed_10m        != null ? `Wind ${fmtWindSpeed(curr.wind_speed_10m, unit)}` : null;
  els.wxSub.textContent = [hi, lo, wind].filter(Boolean).join("  ·  ");

  // Show current weather icon in badge (spins during refresh)
  els.wxIcon.innerHTML = code != null ? wxIconSvg(code) : iconRefreshSvg();

  // Stats grid
  els.stats.hidden = false;
  const feelsC = curr?.apparent_temperature;
  if (Number.isFinite(feelsC) && Number.isFinite(temp)) {
    const diffC = feelsC - temp;
    const diff  = Math.round(unit === "F" ? diffC * 9 / 5 : diffC);
    els.feels.textContent = fmtTemp(feelsC, unit) + (diff !== 0 ? ` ${diff > 0 ? "↑" : "↓"}${Math.abs(diff)}°` : "");
  } else {
    els.feels.textContent = fmtTemp(feelsC, unit);
  }
  els.hum.textContent   = curr?.relative_humidity_2m != null ? `${Math.round(curr.relative_humidity_2m)}%` : "--";
  els.wind.textContent  = fmtWind(curr?.wind_speed_10m, curr?.wind_direction_10m, unit);
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

  els.dew.textContent = fmtTemp(idx >= 0 ? hourly?.dew_point_2m?.[idx] : null, unit);

  const uv = idx >= 0 ? hourly?.uv_index?.[idx] : null;
  els.uv.innerHTML = Number.isFinite(uv)
    ? `<span class="vIcon">${iconUvSvg()}<span style="color:${uvColor(uv)}">${escapeHtml(uv.toFixed(1))}</span></span>`
    : "--";

  const uvMax = daily?.uv_index_max?.[0];
  els.uvMax.innerHTML = Number.isFinite(uvMax)
    ? `<span class="vIcon">${iconUvSvg()}<span style="color:${uvColor(uvMax)}">${escapeHtml(uvMax.toFixed(1))}</span></span>`
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
    els.hourly.innerHTML       = "";
    els.hourlyHint.textContent = "";
    els.tempArc.hidden         = true;
    return;
  }

  const nowIso   = forecast?.current?.time;
  const startIdx = nowIso ? nearestTimeIndex(times, nowIso) : 0;
  const idx0     = Math.max(0, Math.min(startIdx, times.length - 1));
  const take     = 24;

  els.hourlyHint.textContent = nowIso ? `Starting ${fmtTimeLabel(times[idx0], tz)}` : "";

  const unit  = getUnit();
  const convT = (c) => unit === "F" ? c * 9 / 5 + 32 : c;
  const cards = [];

  const startDay = times[idx0]?.slice(0, 10);

  for (let i = 0; i < take; i++) {
    const idx  = idx0 + i;
    if (idx >= times.length) break;
    const temp  = h.temperature_2m?.[idx];
    const appar = h.apparent_temperature?.[idx];
    const code  = h.weather_code?.[idx];
    const pop   = h.precipitation_probability?.[idx];
    const wind  = h.wind_speed_10m?.[idx];
    const cloud = h.cloud_cover?.[idx];

    const cardDay  = times[idx]?.slice(0, 10);
    const dayLabel = cardDay !== startDay ? fmtDayLabel(times[idx], tz).split(",")[0] + " " : "";

    cards.push({
      isNow:    i === 0,
      newDay:   i > 0 && cardDay !== times[idx - 1]?.slice(0, 10),
      dayName:  cardDay !== startDay ? fmtDayLabel(times[idx], tz).split(",")[0] : "",
      time:     i === 0 ? "Now" : `${dayLabel}${fmtTimeLabel(times[idx], tz)}`,
      temp:     Number.isFinite(temp)  ? `${Math.round(convT(temp))}°`  : "--",
      icon:     wxIconSvg(code),
      pop:      Number.isFinite(pop)   ? `${Math.round(pop)}%`          : "--",
      wind:     fmtWindSpeed(wind, unit),
      feels:    Number.isFinite(appar) ? `${Math.round(convT(appar))}°` : "--",
      cloud:    Number.isFinite(cloud) ? `${Math.round(cloud)}%`        : "--",
      rawTemp:  Number.isFinite(temp)  ? convT(temp) : null,
      tempC:    Number.isFinite(temp)  ? temp        : null,
      rawPop:   Number.isFinite(pop)   ? pop         : 0,
    });
  }

  // Temperature arc — same visual style as sun/moon arc
  const arcTemps        = cards.map(c => c.rawTemp);
  const arcTempsCelsius = cards.map(c => c.tempC);
  const validArcTemps   = arcTemps.filter(v => v !== null);
  if (validArcTemps.length >= 2) {
    const tMin  = Math.min(...validArcTemps);
    const tMax  = Math.max(...validArcTemps);
    const range = tMax - tMin || 1;
    const n     = arcTemps.length;
    const toY   = (t) => 48 - (t - tMin) / range * 40; // tMin→y=48, tMax→y=8

    // Build a linearGradient with one stop per hourly point for a smooth color transition
    const gradStops = arcTemps.map((t, i) => {
      if (t === null) return "";
      const pct = (i / (n - 1) * 100).toFixed(1);
      return `<stop offset="${pct}%" stop-color="${tempColor(arcTempsCelsius[i] ?? 0)}"/>`;
    }).join("");

    const pts = arcTemps.map((t, i) => {
      if (t === null) return null;
      const x = 10 + (i / (n - 1)) * 220;
      return `${x.toFixed(1)},${toY(t).toFixed(1)}`;
    }).filter(Boolean).join(" ");

    const dotCy   = toY(arcTemps[0] ?? tMin);
    const dotLeft = (10 / 240 * 100).toFixed(1);
    const dotTop  = (dotCy / 60 * ARC_CSS_H).toFixed(1);
    const endCard = cards[cards.length - 1];

    _arcState = { arcTemps, arcTempsCelsius, tMin, tMax };

    els.tempArc.innerHTML = `
      <svg viewBox="0 0 240 60" class="tempArcSvg" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tempGrad" x1="10" y1="0" x2="230" y2="0" gradientUnits="userSpaceOnUse">
            ${gradStops}
          </linearGradient>
        </defs>
        <path class="skyArc" d="M10 50 Q120 6 230 50" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>
        <polyline class="tempArcLine" stroke="url(#tempGrad)" points="${pts}" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="tempArcDot" style="left:${dotLeft}%;top:${dotTop}px">${escapeHtml(cards[0]?.temp || "--")}</div>
      <div class="tempArcFooter">
        <span class="tempArcNow">${escapeHtml(cards[0]?.temp || "--")} · Now</span>
        <span class="tempArcEnd">${escapeHtml(endCard?.temp || "--")} · ${escapeHtml(endCard?.time || "")}</span>
      </div>`;
    els.tempArc.hidden = false;
  } else {
    els.tempArc.hidden = true;
  }

  els.hourly.innerHTML = cards.map((c) => `
    ${c.newDay ? `<div class="hDaySep" aria-hidden="true"><span>${escapeHtml(c.dayName)}</span></div>` : ""}
    <div class="hCard${c.isNow ? " hCardNow" : ""}${c.newDay ? " hCardNewDay" : ""}" style="--tc:${c.tempC !== null ? tempColor(c.tempC) : "rgba(255,255,255,0.14)"}">
      <div class="hPrecipBar" style="height:${Math.round(c.rawPop * 0.38)}px" aria-hidden="true"></div>
      <div class="hTime">${escapeHtml(c.time)}</div>
      <div class="hMain">
        <div class="hTemp"${c.tempC !== null ? ` style="color:${tempColor(c.tempC)}"` : ""}>${escapeHtml(c.temp)}</div>
        <div class="hIcon" aria-hidden="true">${c.icon}</div>
      </div>
      <div class="hSub">
        <span>${escapeHtml(c.pop)}</span>
        <span>${escapeHtml(c.wind)}</span>
      </div>
      <div class="hSub hSub2">
        <span>Feels ${escapeHtml(c.feels)}</span>
        <span>&#9729; ${escapeHtml(c.cloud)}</span>
      </div>
    </div>
  `).join("");
}

// --- Arc scroll tracking ---
// Registered once; advances the arc dot as the user scrolls hourly cards.
els.hourly.addEventListener("scroll", () => {
  if (!_arcState) return;
  const dot = els.tempArc.querySelector(".tempArcDot");
  if (!dot) return;

  const maxScroll = els.hourly.scrollWidth - els.hourly.clientWidth;
  if (maxScroll <= 0) return;
  const progress = Math.min(1, els.hourly.scrollLeft / maxScroll);

  const { arcTemps, arcTempsCelsius, tMin, tMax } = _arcState;
  const n     = arcTemps.length;
  const range = tMax - tMin || 1;

  const idxF = progress * (n - 1);
  const i0   = Math.min(Math.floor(idxF), n - 2);
  const frac  = idxF - i0;
  const t0   = arcTemps[i0] ?? tMin;
  const t1   = arcTemps[i0 + 1] ?? tMin;
  const t    = t0 + (t1 - t0) * frac;

  const c0   = arcTempsCelsius?.[i0] ?? 0;
  const c1   = arcTempsCelsius?.[i0 + 1] ?? 0;
  const tC   = c0 + (c1 - c0) * frac;

  const cx = 10 + progress * 220;
  const cy = 48 - (t - tMin) / range * 40;
  const col = tempColor(tC);

  dot.style.left        = `${(cx / 240 * 100).toFixed(1)}%`;
  dot.style.top         = `${(cy / 60 * ARC_CSS_H).toFixed(1)}px`;
  dot.style.borderColor = col;
  dot.style.color       = col;
  dot.textContent       = `${Math.round(t)}°`;

  // Highlight the card under the arc dot
  const hCards = els.hourly.querySelectorAll(".hCard");
  const activeIdx = Math.round(idxF);
  hCards.forEach((el, i) => el.classList.toggle("hCardActive", i === activeIdx));
}, { passive: true });

// --- 7-day daily forecast panel ---

export function renderDaily(forecast) {
  const tz    = forecast?.timezone;
  const d     = forecast?.daily;
  const times = d?.time;

  if (!Array.isArray(times) || times.length === 0) {
    els.daily.innerHTML = "";
    return;
  }

  const unit = getUnit();
  const conv = (c) => unit === "F" ? c * 9 / 5 + 32 : c;

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
      hi:     Number.isFinite(hi) ? `${Math.round(conv(hi))}°` : "--",
      lo:     Number.isFinite(lo) ? `${Math.round(conv(lo))}°` : "--",
      precip: Number.isFinite(pr) ? `${pr.toFixed(1)} mm` : "--",
      rawHiC:    Number.isFinite(hi) ? hi : null,
      rawLoC:    Number.isFinite(lo) ? lo : null,
      rawPrecip: Number.isFinite(pr) ? pr : null,
    });
  }

  const validPrecip = rows.map(r => r.rawPrecip).filter(Number.isFinite);
  const maxPrecip   = validPrecip.length ? Math.max(...validPrecip, 0.1) : 0.1;

  const validLo = rows.map(r => r.rawLoC).filter(Number.isFinite);
  const validHi = rows.map(r => r.rawHiC).filter(Number.isFinite);
  const gLo     = validLo.length ? Math.min(...validLo) : 0;
  const gHi     = validHi.length ? Math.max(...validHi) : 1;
  const gRange  = gHi - gLo || 1;

  els.daily.innerHTML = rows.map((r) => {
    const barLeft   = r.rawLoC !== null ? ((r.rawLoC - gLo) / gRange * 100).toFixed(1) : "0";
    const barWidth  = (r.rawLoC !== null && r.rawHiC !== null) ? ((r.rawHiC - r.rawLoC) / gRange * 100).toFixed(1) : "0";
    const precipPct = r.rawPrecip !== null ? Math.min(100, r.rawPrecip / maxPrecip * 100).toFixed(1) : "0";
    return `
    <div class="dRow">
      <div class="dLeft">
        <div class="dIcon" aria-hidden="true">${r.icon}</div>
        <div class="dName" title="${escapeHtml(r.desc)}">${escapeHtml(r.day)} <span style="color:var(--muted);font-weight:600">${escapeHtml(r.desc)}</span></div>
      </div>
      <div class="dMid">
        <div>${escapeHtml(r.precip)}</div>
        <div class="dPrecipBar"><div class="dPrecipFill" style="width:${precipPct}%"></div></div>
      </div>
      <div class="dHi"${r.rawHiC !== null ? ` style="color:${tempColor(r.rawHiC)}"` : ""}>${escapeHtml(r.hi)}</div>
      <div class="dLo"${r.rawLoC !== null ? ` style="color:${tempColor(r.rawLoC)}"` : ""}>${escapeHtml(r.lo)}</div>
      <div class="dTempBar" aria-hidden="true"><div class="dTempFill" style="margin-left:${barLeft}%;width:${barWidth}%"></div></div>
    </div>`;
  }).join("");
}

// --- Air quality panel ---

export function renderAirQuality(air) {
  if (!air?.current) {
    els.aqi.textContent    = "--";
    els.aqiCat.textContent = "Air quality unavailable";
    els.aqiCat.style.color = "var(--muted)";
    els.pm25.textContent   = "--";
    els.pm10.textContent   = "--";
    els.o3.textContent     = "--";
    els.no2.textContent    = "--";
    els.aqiGauge.hidden    = true;
    return;
  }

  const c   = air.current;
  const aqi = c.us_aqi;
  els.aqi.textContent = Number.isFinite(aqi) ? String(Math.round(aqi)) : "--";

  if (Number.isFinite(aqi)) {
    els.aqiGaugeDot.style.left = `${Math.min(98, aqi / 300 * 100).toFixed(1)}%`;
    els.aqiGauge.hidden = false;
  } else {
    els.aqiGauge.hidden = true;
  }

  const cat = aqiCategory(aqi);
  els.aqiCat.textContent = cat.label;
  els.aqiCat.style.color =
    cat.tone === "good" ? "var(--good)" :
    cat.tone === "bad"  ? "var(--bad)"  :
                          "var(--warn)";

  els.pm25.textContent = Number.isFinite(c.pm2_5)            ? `${c.pm2_5.toFixed(1)} µg/m³`            : "--";
  els.pm10.textContent = Number.isFinite(c.pm10)             ? `${c.pm10.toFixed(1)} µg/m³`             : "--";
  els.o3.textContent   = Number.isFinite(c.ozone)            ? `${c.ozone.toFixed(0)} µg/m³`            : "--";
  els.no2.textContent  = Number.isFinite(c.nitrogen_dioxide) ? `${c.nitrogen_dioxide.toFixed(0)} µg/m³` : "--";
}
