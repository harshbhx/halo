/* Face Whisper offline cache.
   Caches the app's own files (code, fonts, face models, WebAssembly) so it keeps
   working without a connection after the first visit. It never caches or sees
   personal data: people live in IndexedDB, not in HTTP responses. */
const PREFIX = 'face-whisper-';

async function precacheList() {
  const res = await fetch('./precache.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('precache list missing');
  return res.json();
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const { version, files } = await precacheList();
      const cache = await caches.open(PREFIX + version);
      await cache.addAll(['./', ...files]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const { version } = await precacheList().catch(() => ({ version: null }));
      if (version) {
        for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== PREFIX + version) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/precache.json')) return;

  // Pages: network first so updates arrive, cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(PREFIX + 'pages');
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const page = url.pathname.endsWith('/') ? new URL('index.html', url).href : req.url;
          return (
            (await caches.match(req, { ignoreSearch: true, ignoreVary: true })) ||
            (await caches.match(page, { ignoreSearch: true, ignoreVary: true })) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Everything else (hashed assets, models, wasm): cache first.
  event.respondWith(
    (async () => {
      const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(PREFIX + 'runtime')).put(req, res.clone());
      return res;
    })(),
  );
});
