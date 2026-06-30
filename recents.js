const KEY = "weather-atlas:recents";
const MAX = 5;

export function getRecents() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function addRecent(place) {
  const filtered = getRecents().filter(r =>
    !(Math.abs(r.latitude - place.latitude) < 0.02 && Math.abs(r.longitude - place.longitude) < 0.02)
  );
  filtered.unshift({
    name: place.name,
    admin1: place.admin1 || "",
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude,
  });
  try { localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX))); } catch {}
}
