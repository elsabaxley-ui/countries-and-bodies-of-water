// GitHub Pages serves index.html with `cache-control: max-age=600`, so for ten
// minutes after a deploy a plain refresh can keep showing the old page. This
// worker goes to the network first and bypasses the HTTP cache while doing it,
// so one refresh always gets the current build. The cached copy is only a
// fallback for when the network is gone — which also makes the quiz work
// offline once it has been opened.
const CACHE = 'atlas-drill-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      if (fresh && fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
      return fresh;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) return hit;
      throw err;
    }
  })());
});
