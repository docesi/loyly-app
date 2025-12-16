const CACHE_NAME = 'loyly-cache-v2';
const urlsToCache = [
  '/manifest.json',
  '/saunas.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Navigaatiopyynnöt aina verkosta (välttää jumittumisen vanhaan UI-versioon)
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req));
    return;
  }

  // Muut resurssit: cache ensin, fallback verkkoon
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
