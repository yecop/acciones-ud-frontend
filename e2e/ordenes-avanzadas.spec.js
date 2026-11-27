import { expect, test } from "@playwright/test";
import { iniciarSesion, irASeccion } from "./ayudas.js";

async function abrirOperar(page, { mercadoAbierto }) {
  await iniciarSesion(page, "laura@correo.com");
  await page.evaluate((abierto) => window.__mock.ordenes.mercado(abierto), mercadoAbierto);
  await irASeccion(page, "Operar");
  await expect(page.getByRole("heading", { name: "Operar" })).toBeVisible();
}

test.describe("órdenes avanzadas y encolamiento", () => {
  test("un Stop Loss de venta por encima del precio actual se bloquea con su motivo", async ({
    page,
  }) => {
    await abrirOperar(page, { mercadoAbierto: true });

    await page.getByRole("button", { name: "Vender" }).click();
    await page.getByRole("tab", { name: "Stop Loss" }).click();
    await page.getByLabel("Cantidad").fill("1");
    await page.getByLabel("Precio stop").fill("9999");

    await expect(page.getByText(/sobre el precio actual/i)).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: /debe estar por debajo/i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Ejecutar Orden" })).toBeDisabled();
  });

  test("con el mercado cerrado se explica el encolamiento antes de enviar", async ({ page }) => {
    await abrirOperar(page, { mercadoAbierto: false });

    await expect(page.getByRole("note")).toContainText(/encolada/i);
    await expect(page.getByRole("note")).toContainText(/próxima apertura:.*hora de Nueva York/i);
    await expect(page.getByRole("button", { name: "Encolar Orden" })).toBeVisible();
  });

  test("una orden en revisión o detenida explica qué se puede hacer", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await irASeccion(page, "Historial");

    await page
      .getByRole("link", { name: /ver detalle de la orden de aapl/i })
      .first()
      .click();
    await expect(
      page.getByRole("complementary", { name: /qué significa este estado/i })
    ).toBeVisible();
    await page.getByRole("link", { name: /volver al historial/i }).click();

    const filtros = page.getByRole("form", { name: "Filtros de órdenes" });
    await filtros.getByRole("combobox", { name: "Estado", exact: true }).selectOption("DETENIDA");
    await filtros.getByRole("button", { name: "Aplicar" }).click();
    const tabla = page.getByRole("region", { name: /tabla de órdenes/i });
    await expect(tabla.getByRole("row")).toHaveCount(2);
    await tabla.getByRole("link", { name: /ver detalle de la orden de tsla/i }).click();
    await expect(
      page.getByRole("complementary", { name: /qué significa este estado/i })
    ).toContainText(/no se puede reactivar ni cancelar/i);
  });
});
