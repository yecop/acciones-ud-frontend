import { expect, test } from "@playwright/test";
import { iniciarSesion, irASeccion } from "./ayudas.js";

test.describe("portafolio", () => {
  test("preferencias no implementadas: muestra saldo y posiciones en Tabla con aviso", async ({
    page,
  }) => {
    // Simula el backend sin endpoint de preferencias sin bloquear los demás endpoints MSW.
    await page.addInitScript(() => {
      const original = window.fetch;
      window.fetch = (entrada, opciones) => {
        const url = entrada instanceof Request ? entrada.url : String(entrada);
        if (new URL(url, location.href).pathname.endsWith("/perfil/preferencias")) {
          return Promise.resolve(
            new Response(JSON.stringify({ codigo: "NO_ENCONTRADO" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return original(entrada, opciones);
      };
    });
    await iniciarSesion(page, "laura@correo.com");
    await page.goto("/#/portafolio");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText(
      "No pudimos leer tu vista guardada; se muestra Tabla."
    );
    await expect(page.getByText("NVDA", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("se muestra Tabla");
  });

  test("muestra dinero, resumen y posiciones desde el mock", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.goto("/#/portafolio");

    await expect(page.getByRole("heading", { name: /mi dinero y mis posiciones/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mi dinero", exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Resumen del portafolio", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mis posiciones", exact: true })).toBeVisible();
    await expect(page.getByText("NVDA").first()).toBeVisible();
  });
});

test.describe("perfil", () => {
  test("la persona llega al perfil desde el menú", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await irASeccion(page, "Perfil");

    await expect(page.getByRole("heading", { name: /perfil y preferencias/i })).toBeVisible();
  });
});
