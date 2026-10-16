self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) =>
        Promise.all(
          clients.map((client) => {
            if (!client.url || client.url.startsWith("about:")) return Promise.resolve();
            return client.navigate(client.url);
          }),
        ),
      ),
    ),
  );
});
