import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

test.describe("centro de notificaciones", () => {
  test("la campana cuenta las sin leer, abre el centro y se actualiza al marcar", async ({
    page,
  }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.getByRole("button", { name: "Notificaciones, 2 sin leer" }).click();
    await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible();

    await page.getByRole("button", { name: "Marcar como leída: Resumen de ayer" }).click();
    await expect(page.getByRole("button", { name: "Notificaciones, 1 sin leer" })).toBeVisible();

    await page.getByRole("button", { name: "Sin leer", exact: true }).click();
    await expect(
      page.getByRole("list", { name: /lista de notificaciones/i }).getByRole("listitem")
    ).toHaveCount(1);
  });

  test("una notificación nueva del mercado llega a la campana", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.evaluate(() => window.__mock.notificaciones.mercado("NASDAQ", true));
    await page
      .getByRole("button", { name: /^operar$/i })
      .first()
      .click();
    await expect(page.getByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeVisible();
  });

  test("desde una notificación de orden se llega al detalle", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.getByRole("button", { name: /^notificaciones/i }).click();
    await page.getByLabel("Tipo").selectOption("ORDEN_CANCELADA");
    await expect(
      page.getByRole("list", { name: /lista de notificaciones/i }).getByRole("listitem")
    ).toHaveCount(1);
    await page.getByRole("link", { name: "Ver orden" }).click();
    await expect(page.getByRole("heading", { name: /compra de tsla/i })).toBeVisible();
  });

  test("una cuenta sin notificaciones ve el estado vacío", async ({ page }) => {
    await iniciarSesion(page, "nuevo@correo.com");
    await page.getByRole("button", { name: "Notificaciones" }).click();
    await expect(page.getByText(/todavía no tienes notificaciones/i)).toBeVisible();
  });
});
