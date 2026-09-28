/* IncomeTracker service worker — app-shell caching for offline-first launch.
 * Phase B. Cache-first for shell assets; versioned cache with cleanup.
 * Note: service workers require http(s); on file:// the registration in
 * js/app.js fails silently and the app still works (minus precaching).
 */

const CACHE_NAME = 'income-tracker-v4';
const ASSETS = [
  './',
  './index.html',
  './css/tokens.css',
  './css/app.css',
  './js/report.js',
  './js/charts.js',
  './js/recurring.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(
      (cached) => cached || fetch(event.request).catch(() => caches.match('./index.html'))
    )
  );
});
