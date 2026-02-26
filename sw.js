const CACHE_NAME = 'od-tracker-v2';
const API_CACHE = 'od-api-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isApi = url.hostname.includes('script.google.com') ||
                url.hostname.includes('script.googleusercontent.com');

  if (isApi) {
    // Skip cache for POST (mutations)
    if (event.request.method === 'POST') {
      event.respondWith(fetch(event.request));
      return;
    }

    // Stale-while-revalidate for GET (reads)
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        const networkFetch = fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          // Notify app only if we served stale cache above
          if (cached) {
            self.clients.matchAll().then((clients) => {
              clients.forEach((c) => c.postMessage({ type: 'api-updated' }));
            });
          }
          return response;
        });

        // Return cached immediately, or wait for network
        return cached || networkFetch;
      })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
