import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT) || 3000;

  return {
    base: "/",
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "manifest.webmanifest"],
        manifest: false,
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
