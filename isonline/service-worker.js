/* eslint-disable no-restricted-globals */
const CACHE_NAME = "isonline-v2";
const APP_SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      self.clients.claim();
    })()
  );
});

// Network-first so reload pulls fresh assets; cache fallback for offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin navigations/assets.
  if (url.origin !== self.location.origin) return;
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Try network first to always refresh on reload.
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        if (fresh && fresh.ok) {
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch {
        // Offline fallback.
        if (req.mode === "navigate") {
          const cachedIndex = await cache.match("./index.html");
          if (cachedIndex) return cachedIndex;
        }
        const cached = await cache.match(req);
        if (cached) return cached;
        throw new Error("Offline and not cached");
      }
    })()
  );
});

