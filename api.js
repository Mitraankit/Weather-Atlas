// Network layer — all fetch calls are isolated here.
// Nothing in this file touches the DOM.

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
      } catch { /* ignore */ }
      throw new Error(`HTTP ${res.status}${detail}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Forward geocoding — returns an array of place results.
export async function searchCity(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
  const data = await fetchJson(url);
  return data?.results ?? [];
}

// Reverse geocoding from device coordinates (no API key required).
export async function reverseGeocodeClient(lat, lon) {
  const url =
    "https://api.bigdatacloud.net/data/reverse-geocode-client" +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    "&localityLanguage=en";
  return await fetchJson(url);
}

// Shapes the raw reverse-geocode response into our internal place object.
export function placeFromReverseGeocode(data, lat, lon) {
  return {
    name: data?.city || data?.locality || data?.principalSubdivision || "My location",
    admin1: data?.principalSubdivision || "",
    country: data?.countryName || data?.countryCode || "",
    latitude: lat,
    longitude: lon,
  };
}

// Weather forecast — current + hourly + daily.
export async function fetchForecast(lat, lon) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    "&timezone=auto" +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m" +
    "&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index,visibility,dew_point_2m,surface_pressure,cloud_cover" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset,uv_index_max";
  return await fetchJson(url);
}

// Air quality — current pollutants.
export async function fetchAirQuality(lat, lon) {
  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    "&timezone=auto" +
    "&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide";
  return await fetchJson(url);
}
