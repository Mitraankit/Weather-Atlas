const CACHE = 'weather-atlas-v14';

const STATIC = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './api.js',
  './els.js',
  './icons.js',
  './render.js',
  './sky.js',
  './utils.js',
  './weather.js',
  './unit.js',
  './favorites.js',
  './manifest.json',
  './icons/icon.svg',
];

const API_HOSTS = [
  'api.open-meteo.com',
  'geocoding-api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'api.bigdatacloud.net',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (API_HOSTS.some(h => url.hostname === h)) return; // always network for weather data

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      });
    })
  );
});
