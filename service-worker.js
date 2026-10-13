
const CACHE_NAME = "school-college-offline-v3";
const BASE = "/school-college-management/";

const FILES_TO_CACHE = [
  BASE,
  BASE + "index.html",
  BASE + "styles.css",
  BASE + "app.js?v=20261011-4",
  BASE + "accounts.js?v=20261011-2",
  BASE + "profiles.css?v=20261011-1",
  BASE + "profiles.js?v=20261011-1",
  BASE + "auth.js?v=3",
  BASE + "manifest.json",
  BASE + "icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(
        FILES_TO_CACHE.map(async file => {
          try {
            await cache.add(file);
          } catch (error) {
            console.warn("Could not cache:", file);
          }
        })
      );
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith("school-college-offline-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(BASE + "index.html", copy)
          );
        }
        return response;
      }).catch(async () => {
        return (
          await caches.match(request) ||
          await caches.match(BASE + "index.html") ||
          Response.error()
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(request, copy)
          );
        }
        return response;
      });
    })
  );
});
