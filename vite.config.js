import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    css: true,
=======
  server: {
    // En desarrollo, las peticiones a /api se redirigen al backend Spring Boot.
    // Permite consumir la API sin configurar CORS ni URLs absolutas (SCRUM-25).
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
>>>>>>> origin/main
  },
});
