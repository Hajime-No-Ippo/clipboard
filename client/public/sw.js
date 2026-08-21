// Minimal service worker: exists so the app installs as a PWA and the shell
// opens offline. Deliberately conservative for a realtime app:
//
//   - /api is NEVER touched — clipboards are live data and the WebSocket
//     upgrade must reach the network untouched.
//   - Hashed build assets are cache-first: their names change when their
//     content does, so a cache hit is always correct.
//   - Navigations are network-first with the cached shell as offline fallback,
//     so deploys are picked up on the next open, not trapped behind a cache.
const CACHE = "clipboard-shell-v2";
const SHELL = ["/", "/cork-v2.webp", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // live data + WebSocket: hands off

  // Hashed assets: immutable by construction.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Navigations and the rest: network first, cache as offline fallback.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === "GET") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(event.request);
        if (hit) return hit;
        if (event.request.mode === "navigate") return caches.match("/");
        return Response.error();
      }),
  );
});
