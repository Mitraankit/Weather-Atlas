# Weather Atlas (No API key)

A small, dependency-free weather app using Open-Meteo:

- City search with suggestions
- "Use my location" (browser geolocation)
- Current conditions + next 12 hours + 7-day forecast
- Details: sunrise/sunset, UV, visibility, dew point, pressure, wind direction
- Air quality: US AQI + PM2.5/PM10/O3/NO2 (Open-Meteo air-quality API)

## Run locally

Browsers block `fetch()` from `file://`, so run a tiny local server:

```bash
cd /Users/ankitkumar/coding/weather-app
python3 -m http.server 5173
```

Then open `http://localhost:5173` (not `file://.../index.html`).
