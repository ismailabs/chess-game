// Service Worker for Chess by Ismail Studio
// Version: 2.0.0
// Provides robust offline support for app shell and Stockfish WASM bot games.

const CACHE_NAME = "chess-v2-cache-v1";
const ENGINE_CACHE = "chess-v2-engine-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/logo.svg",
  "/logo-mark.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
];

const ENGINE_ASSETS = [
  "/engine/stockfish-18-lite-single.js",
  "/engine/stockfish-18-lite-single.wasm",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(ENGINE_CACHE).then((cache) => {
        // Cache engine assets for offline bot play; fail silently if not yet copied
        return cache.addAll(ENGINE_ASSETS).catch((err) => {
          console.warn("ServiceWorker: Engine assets preload failed", err);
        });
      }),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== ENGINE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin API calls (e.g. Supabase, external APIs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. Stockfish WASM Engine assets -> Cache First with network fallback
  if (url.pathname.startsWith("/engine/")) {
    event.respondWith(
      caches.open(ENGINE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return new Response("Engine asset offline", { status: 503 });
        }
      })
    );
    return;
  }

  // 2. Vite hashed assets (/assets/*) -> Cache First (immutable)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // 3. Navigation requests -> Network First with App Shell cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const shell = await cache.match("/index.html");
        return shell || Response.error();
      })
    );
    return;
  }

  // 4. Other same-origin static requests -> Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkRes.clone()));
          }
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
