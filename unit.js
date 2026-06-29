// Unit preference (°C / °F) — persisted to localStorage.

const KEY = "weather-atlas:unit";
let _unit = "C";
try { _unit = localStorage.getItem(KEY) === "F" ? "F" : "C"; } catch {}

export function getUnit() { return _unit; }

export function toggleUnit() {
  _unit = _unit === "C" ? "F" : "C";
  try { localStorage.setItem(KEY, _unit); } catch {}
  return _unit;
}
