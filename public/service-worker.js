self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        /* a cópia antiga segue até o navegador buscar este arquivo de novo */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* idem */
      }
    })(),
  );
});
