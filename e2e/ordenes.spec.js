import { expect, test } from "@playwright/test";
import { iniciarSesion, irASeccion } from "./ayudas.js";

/** Entra, fuerza el mercado abierto (el horario real cambiaría el resultado) y abre «Operar». */
async function abrirOperar(page) {
  await iniciarSesion(page, "laura@correo.com");
  await page.evaluate(() => window.__mock.ordenes.mercado(true));
  await irASeccion(page, "Operar");
  await expect(page.getByRole("heading", { name: "Operar" })).toBeVisible();
  await expect(page.getByRole("region", { name: /tabla de órdenes/i })).toBeVisible();
}

test.describe("operar: crear y cancelar órdenes", () => {
  test("crea una orden de mercado con la comisión del backend y aparece en la lista", async ({
    page,
  }) => {
    await abrirOperar(page);
    const filasAntes = await page.getByRole("row").count();

    await page.getByLabel("Cantidad").fill("2");
    await expect(page.getByText(/360,06/).first()).toBeVisible();
    await page.getByRole("button", { name: "Ejecutar Orden" }).click();

    await expect(page.getByText(/Orden creada · En ejecución/)).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(filasAntes + 1);
  });

  test("cancela una orden pendiente con confirmación y se libera el saldo", async ({ page }) => {
    await abrirOperar(page);

    await page.getByRole("button", { name: /cancelar orden de msft/i }).click();
    await expect(page.getByText(/¿cancelar compra de 1 msft\?/i)).toBeVisible();
    await page.getByRole("button", { name: /sí, cancelar/i }).click();

    await expect(page.getByText(/se liberaron .*351,20/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /cancelar orden de msft/i })).toHaveCount(0);
  });

  test("mercado cerrado: pide confirmar el encolamiento y la orden queda pendiente", async ({
    page,
  }) => {
    await abrirOperar(page);
    await page.evaluate(() => window.__mock.ordenes.mercado(false));
    await page.getByLabel("Cantidad").fill("1");

    await page.getByRole("button", { name: "Encolar Orden" }).click();
    await expect(page.getByRole("alertdialog", { name: /confirmar encolamiento/i })).toBeVisible();
    await page.getByRole("button", { name: /confirmar y encolar/i }).click();
    await expect(page.getByText(/Orden encolada · Pendiente/)).toBeVisible();
  });

  test("una cuenta sin órdenes ve el estado vacío", async ({ page }) => {
    await iniciarSesion(page, "nuevo@correo.com");
    await irASeccion(page, "Operar");
    await expect(page.getByText(/todavía no tienes órdenes/i)).toBeVisible();
  });
});
