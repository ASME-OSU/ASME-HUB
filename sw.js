const SHELL_CACHE = "asme-hub-shell-v79";
const SHELL_ASSETS = [
  "./assets/css/transition.css?v=20261008c",
  "./",
  "./index.html",
  "./manifest.webmanifest?v=20260919b",
  "./assets/hub-mark.svg?v=20260801b",
  "./assets/css/styles.css?v=20261003d",
  "./assets/fonts/dm-serif-display-latin.woff2",
  "./assets/fonts/inter-latin.woff2",
  "./assets/js/config.js?v=20261008c",
  "./assets/js/shared-resources.js?v=20260928b",
  "./assets/js/settings-readback.js?v=20261002a",
  "./assets/js/app.js?v=20261008c",
  "./assets/js/transition.js?v=20261008c",
  "./assets/js/annual-link-draft.js?v=20261008c",
  "./assets/js/annual-settings-input.js?v=20261008c",
  "./assets/js/transition-steps.js?v=20261008c",
  "./assets/js/transition-state.js?v=20261008c",
  "./assets/js/pwa.js?v=20260802f",
  "./assets/icons/icon-192.png?v=20260919b",
  "./assets/icons/icon-512.png?v=20260919b",
  "./assets/icons/icon-maskable-512.png?v=20260919b",
  "./assets/icons/apple-touch-icon.png?v=20260919b"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("asme-hub-shell-") && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  const staticDestinations = new Set(["style", "script", "image", "font", "manifest"]);
  if (!staticDestinations.has(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
