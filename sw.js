// Minimal service worker — just enough to make the app installable.
// Caches the app shell (HTML/CSS/JS/icons) so it opens instantly even on
// a weak connection. It does NOT cache API responses — those always need
// a live network call, since the whole point is fresh outreach data.

const CACHE_NAME = "clovr-shell-v2";
const SHELL_FILES = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache calls to the Apps Script API — always go to network.
  if (url.hostname.includes("script.google")) {
    return;
  }

  // index.html (and any navigation request) is ALWAYS fetched fresh from
  // the network first. This is the file that changes most often during
  // development — caching it aggressively caused a real bug where GitHub
  // had the fixed code live but the browser kept serving an old cached
  // copy. Only fall back to cache if the network is genuinely unreachable.
  const isHtmlOrNav = event.request.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/");
  if (isHtmlOrNav) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (icons, manifest) can stay cache-first — they rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
