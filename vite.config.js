import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      // `npm run dev`: las peticiones a /api van al backend (sin CORS ni URLs absolutas).
      // Con `npm start` (mock) no llegan aquí: las intercepta el Service Worker de MSW.
      proxy: {
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.js",
      css: true,
      // Las pruebas de extremo a extremo (e2e/) las corre Playwright, no Vitest.
      include: ["src/**/*.{test,spec}.{js,jsx}"],
      // Las pruebas de flujo completo (login, MFA, rutas) teclean con userEvent y pueden tardar
      // más de los 5 s por defecto en equipos lentos o en el CI.
      testTimeout: 20000,
      // fetch de Node exige URL absoluta: las pruebas apuntan a un origen ficticio que MSW intercepta.
      env: { VITE_API_BASE_URL: "http://localhost:3000" },
    },
  };
});
