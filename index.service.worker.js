// A release must replace the HTML and game pack together, including existing tabs.
const CACHE_PREFIX = '구구말 플랫포머-sw-cache-';
const CACHE_NAME = CACHE_PREFIX + 'cbd1397589fceb89';
const ASSETS = new Set([
  /* motion packs */ "motion-packs.json", "motion-fa49657dfb876f94-01.pck", "motion-b450cdf46edd59fd-02.pck",
  'index.html', 'index.js', 'index.wasm', 'index.pck', 'index.png',
  'index.offline.html', 'index.icon.png', 'index.apple-touch-icon.png',
  'index.audio.worklet.js', 'index.audio.position.worklet.js',
].map(name => new URL(name, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const old = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
    await Promise.all(old.map(name => caches.delete(name)));
    await self.clients.claim();
    // Only upgrading tabs reload. A fresh installation does not restart loading.
    if (old.length) {
      const windows = await self.clients.matchAll({type: 'window'});
      // Navigation fetches wait for activation; do not await them here.
      windows.forEach(client => { client.navigate(client.url).catch(() => {}); });
    }
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  const navigate = event.request.mode === 'navigate';
  if (!url.href.startsWith(self.registration.scope) || (!navigate && !ASSETS.has(url.href))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (!navigate) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
    }
    try {
      // Browser HTTP cache may also contain the old pack for ten minutes.
      const response = await fetch(event.request, {cache: 'no-store'});
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(cache.put(event.request, copy).catch(() => {}));
      }
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (navigate) {
        const offline = await cache.match(new URL('index.html', self.registration.scope).href);
        if (offline) return offline;
      }
      throw error;
    }
  })());
});
