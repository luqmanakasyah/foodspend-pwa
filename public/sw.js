// Increment BUILD_VERSION automatically during build by injecting a timestamp via Vite define (fallback here)
const BUILD_VERSION = self?.__BUILD_VERSION__ || Date.now().toString();
const CACHE_STATIC = 'fs-static-' + BUILD_VERSION;
const ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

// Install: pre-cache core shell using network fresh copies (cache-bust) and activate immediately.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIC);
    await Promise.all(ASSETS.map(async (url) => {
      try { const res = await fetch(url + '?v=' + BUILD_VERSION, { cache: 'no-store' }); if(res.ok) cache.put(url, res.clone()); } catch {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(CACHE_STATIC)).map(k => caches.delete(k)));
    await self.clients.claim();
    // Notify clients a new version is active
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const client of clientsList) {
      client.postMessage({ type: 'SW_ACTIVATED', version: BUILD_VERSION });
    }
  })());
});

// Only handle same-origin GET requests to avoid interfering with Google Auth / other third-party flows.
// Network-first for HTML & core assets; cache-first for others.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isDoc = request.mode === 'navigate' || (request.destination === 'document');
  e.respondWith((async () => {
    if (isDoc) {
      try { return await fetch(request, { cache: 'no-store' }); } catch { /* fallback */ }
    }
    const cache = await caches.open(CACHE_STATIC);
    const cached = await cache.match(request);
    try {
      const fresh = await fetch(request, { cache: 'no-store' });
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch {
      if (cached) return cached;
      throw new Error('offline');
    }
  })());
});

// Listen for manual skipWaiting trigger from client (optional future hook)
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
