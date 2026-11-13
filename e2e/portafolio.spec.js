import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

test.describe("portafolio", () => {
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
    await page.goto("/#/perfil");

    await expect(page.getByRole("heading", { name: /perfil y preferencias/i })).toBeVisible();
  });
});
