import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

test.describe("acciones", () => {
  test("lista las acciones, filtra por mercado y muestra el detalle", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.goto("/#/acciones");

    const aapl = page.getByRole("button", { name: /cotización de AAPL/i });
    await expect(aapl).toBeVisible();

    await page.getByLabel("Mercado").selectOption("NASDAQ");
    await expect(aapl).toHaveCount(0);

    await page.getByLabel("Mercado").selectOption("NYSE");
    await aapl.click();
    await expect(page.getByRole("region", { name: "AAPL" })).toBeVisible();
  });

  test("el comisionista también consulta las acciones", async ({ page }) => {
    await iniciarSesion(page, "carlos@correo.com");
    await page.goto("/#/acciones");

    await expect(page.getByRole("button", { name: /cotización de AAPL/i })).toBeVisible();
  });
});
