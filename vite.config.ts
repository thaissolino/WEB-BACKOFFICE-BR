import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT) || 3000;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico"],
        manifest: {
          name: "PDV Black Rabbit",
          short_name: "BR PDV",
          description: "PDV multi-tenant leve e mobile-first",
          theme_color: "#0f172a",
          background_color: "#f4f7fb",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/favicon.ico",
              sizes: "64x64 32x32 24x24 16x16",
              type: "image/x-icon",
            },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === "document",
              handler: "NetworkFirst",
              options: { cacheName: "pages-cache" },
            },
          ],
        },
      }),
    ],
    server: {
      port,
      host: true,
    },
    define: {
      "process.env.REACT_APP_API_URL": JSON.stringify(
        env.REACT_APP_API_URL || env.VITE_API_URL || "http://localhost:3333"
      ),
      "process.env.REACT_APP_ENV": JSON.stringify(
        env.REACT_APP_ENV || env.ENV || mode
      ),
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
  };
});
