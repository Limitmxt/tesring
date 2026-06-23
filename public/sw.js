// Minimal service worker. Its main job is to make the app installable
// (browsers require a registered SW with a fetch handler) and to provide a
// basic offline fallback by caching same-origin GET responses.
const CACHE = "phone-deal-scanner-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache POST/PATCH/DELETE

  // Network-first: always try the network, fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
