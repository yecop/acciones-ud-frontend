import { expect, test } from "@playwright/test";
import { iniciarSesion, irASeccion } from "./ayudas.js";

async function abrirHistorial(page) {
  await iniciarSesion(page, "laura@correo.com");
  await page.evaluate(() => window.__mock.ordenes.mercado(true));
  await irASeccion(page, "Historial");
  await expect(page.getByRole("heading", { name: "Historial de órdenes" })).toBeVisible();
  await expect(page.getByRole("region", { name: /tabla de órdenes/i })).toBeVisible();
}

test.describe("historial de órdenes", () => {
  test("filtra por estado, abre el detalle y ve la línea de tiempo", async ({ page }) => {
    await abrirHistorial(page);

    await page.getByLabel("Estado").selectOption("CANCELADA");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByRole("row")).toHaveCount(2); // encabezado + TSLA

    await page.getByRole("link", { name: /ver detalle de la orden de tsla/i }).click();
    await expect(page.getByRole("heading", { name: /compra de tsla/i })).toBeVisible();
    const linea = page.getByRole("list", { name: /cambios de estado/i });
    await expect(linea.getByRole("listitem")).toHaveCount(2);
    await expect(linea.getByText(/Cancelada por el usuario/)).toBeVisible();

    await page.getByRole("link", { name: /volver al historial/i }).click();
    await expect(page.getByRole("heading", { name: "Historial de órdenes" })).toBeVisible();
  });

  test("cancela una orden pendiente desde su detalle", async ({ page }) => {
    await abrirHistorial(page);

    await page
      .getByRole("link", { name: /ver detalle de la orden de msft/i })
      .first()
      .click();
    await page.getByRole("button", { name: /cancelar orden de msft/i }).click();
    await page.getByRole("button", { name: /sí, cancelar/i }).click();

    await expect(page.getByText(/orden cancelada/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /cancelar orden de msft/i })).toHaveCount(0);
  });
});
