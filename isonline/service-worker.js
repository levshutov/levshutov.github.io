/* eslint-disable no-restricted-globals */
const CACHE_NAME = "yt-check-v1";
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

// Offline-first for app shell, network for everything else.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin navigations/assets.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Navigation: serve cached index.html, update in background.
      if (req.mode === "navigate") {
        const cached = await cache.match("./index.html");
        if (cached) {
          event.waitUntil(
            (async () => {
              try {
                const fresh = await fetch(req);
                if (fresh && fresh.ok) await cache.put("./index.html", fresh.clone());
              } catch {
                // ignore
              }
            })()
          );
          return cached;
        }
      }

      // Asset: cache-first.
      const cached = await cache.match(req);
      if (cached) return cached;

      // Fallback to network, then cache if ok.
      const res = await fetch(req);
      if (res && res.ok) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })()
  );
});

