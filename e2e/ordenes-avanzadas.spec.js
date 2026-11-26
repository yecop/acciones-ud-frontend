import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

async function abrirOperar(page, { mercadoAbierto }) {
  await iniciarSesion(page, "laura@correo.com");
  await page.evaluate((abierto) => window.__mock.ordenes.mercado(abierto), mercadoAbierto);
  await page
    .getByRole("button", { name: /^operar$/i })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Operar" })).toBeVisible();
}

test.describe("órdenes avanzadas y encolamiento", () => {
  test("un Stop Loss de venta por encima del precio actual muestra un aviso que no bloquea", async ({
    page,
  }) => {
    await abrirOperar(page, { mercadoAbierto: true });

    await page.getByRole("button", { name: "Vender" }).click();
    await page.getByRole("tab", { name: "Stop Loss" }).click();
    await page.getByLabel("Cantidad").fill("1");
    await page.getByLabel("Precio stop").fill("9999");

    await expect(page.getByText(/sobre el precio actual/i)).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /debería estar por debajo/i })
    ).toBeVisible();
  });

  test("con el mercado cerrado se explica el encolamiento antes de enviar", async ({ page }) => {
    await abrirOperar(page, { mercadoAbierto: false });

    await expect(page.getByRole("note")).toContainText(/encolada/i);
    await expect(page.getByRole("button", { name: "Encolar Orden" })).toBeVisible();
  });
});
