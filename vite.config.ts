import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT) || 3000;

  return {
    plugins: [react()],
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
