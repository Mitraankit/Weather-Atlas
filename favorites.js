// Favorite cities — up to 5, persisted to localStorage.

const KEY = "weather-atlas:favorites";
const MAX = 5;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
}
function same(a, b) {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}
function trim(p) {
  return { name: p.name, admin1: p.admin1 || "", country: p.country || "", latitude: p.latitude, longitude: p.longitude };
}

export function getFavorites() { return load(); }
export function isFavorite(place) { return load().some(f => same(f, place)); }
export function addFavorite(place) {
  const arr = load().filter(f => !same(f, place));
  arr.unshift(trim(place));
  save(arr.slice(0, MAX));
}
export function removeFavorite(place) { save(load().filter(f => !same(f, place))); }
export function toggleFavorite(place) {
  if (isFavorite(place)) { removeFavorite(place); return false; }
  addFavorite(place); return true;
}
