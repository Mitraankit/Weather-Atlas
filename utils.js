// Pure utility helpers and value formatters.

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// --- compass helpers (used only by formatters below) ---

function degToCompass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

function degToCompassLong(deg) {
  const dirs = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

// --- value formatters ---

export function fmtTempC(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "--";
  return `${Math.round(n)}°C`;
}

export function fmtWind(kmh, deg) {
  if (!Number.isFinite(kmh)) return "--";
  const d = Number.isFinite(deg) ? ` ${degToCompass(deg)}` : "";
  return `${Math.round(kmh)} km/h${d}`;
}

export function fmtWindDir(deg) {
  if (!Number.isFinite(deg)) return "--";
  return `${degToCompassLong(deg)} ${Math.round(deg)}°`;
}

export function fmtKmFromMeters(m) {
  if (!Number.isFinite(m)) return "--";
  const km = m / 1000;
  return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
}

// --- time formatters ---

export function fmtTimeLabel(iso, tz) {
  // Open-Meteo returns local wall-clock timestamps — parse directly to avoid tz conversion.
  if (typeof iso === "string") {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m) return `${String(Number(m[4]))}:${m[5]}`;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function fmtClockFromUtcMs(utcMs, tz) {
  if (!Number.isFinite(utcMs)) return "--";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || undefined,
    }).format(new Date(utcMs));
  } catch {
    return "--";
  }
}

export function fmtNowInTz(tz) {
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

export function fmtDayLabel(iso, tz) {
  // Daily dates come as YYYY-MM-DD — render at noon UTC to avoid date-boundary drift.
  if (typeof iso === "string") {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(utc));
    }
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: tz || undefined,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function nearestTimeIndex(isoList, targetIso) {
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return 0;
  let bestIdx = 0;
  let best = Infinity;
  for (let i = 0; i < isoList.length; i++) {
    const diff = Math.abs(new Date(isoList[i]).getTime() - target);
    if (diff < best) { best = diff; bestIdx = i; }
  }
  return bestIdx;
}
