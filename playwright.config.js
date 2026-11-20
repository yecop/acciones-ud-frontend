import { defineConfig, devices } from "@playwright/test";

const PUERTO = 5199;

/**
 * Pruebas de extremo a extremo: levantan la app en modo mock (`npm start`) y la recorren
 * en un navegador real. En CI se instala Chromium con `npx playwright install chromium`.
 * Si ya tienes Chrome y no quieres descargar el navegador de Playwright, define
 * `PW_CHROMIUM_PATH` con la ruta del ejecutable.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } },
    },
    { name: "movil", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 800 } } },
  ],
  webServer: {
    command: `npx vite --mode mock --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
