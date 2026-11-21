import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

const panel = (page) => page.getByRole("region", { name: "Mercados y acciones" });
const mercado = (page, nombre) => panel(page).getByRole("region", { name: nombre });
const actualizar = (page) => page.getByRole("button", { name: /^actualizar$/i }).click();

test.describe("dashboard de mercados", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await expect(page.getByRole("heading", { name: "Mercados y acciones" })).toBeVisible();
  });

  test("muestra los cinco mercados y marca LSE, TSE y ASX como cierre diario simulado", async ({
    page,
  }) => {
    for (const nombre of [/new york/i, /nasdaq/i, /london/i, /tokyo/i, /australian/i]) {
      await expect(mercado(page, nombre)).toBeVisible();
    }
    for (const nombre of [/london/i, /tokyo/i, /australian/i]) {
      await expect(mercado(page, nombre).getByText("Cierre diario")).toBeVisible();
      await expect(mercado(page, nombre).getByText("Ejecución simulada")).toBeVisible();
    }
    await expect(mercado(page, /nasdaq/i).getByText("Cierre diario")).toHaveCount(0);
  });

  test("cada acción trae su último precio, bid, ask y spread", async ({ page }) => {
    const aapl = mercado(page, /new york/i).locator('tr[data-ticker="AAPL"]');
    await expect(aapl).toContainText("176,50");
    await expect(aapl).toContainText("176,48");
    await expect(aapl).toContainText("176,52");
    await expect(aapl).toContainText("0,04");
  });

  test("la advertencia de dato antiguo aparece con el mercado abierto y una cotización vieja", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.__mock.mercadoAbierto("NYSE", true);
      window.__mock.datoAntiguo("AAPL", 600);
    });
    await actualizar(page);

    const aapl = mercado(page, /new york/i).locator('tr[data-ticker="AAPL"]');
    await expect(aapl.getByText(/dato antiguo/i)).toBeVisible();
    await expect(mercado(page, /new york/i).getByText(/dato antiguo/i)).toHaveCount(1);
  });

  test("con el mercado cerrado no se advierte: es el último cierre", async ({ page }) => {
    await page.evaluate(() => {
      window.__mock.mercadoAbierto("NYSE", false);
      window.__mock.datoAntiguo("AAPL", 600);
    });
    await actualizar(page);

    await expect(
      mercado(page, /new york/i)
        .getByText(/último cierre/i)
        .first()
    ).toBeVisible();
    await expect(mercado(page, /new york/i).getByText(/dato antiguo/i)).toHaveCount(0);
  });

  test("si el proveedor falla lo dice claro y se recupera al volver", async ({ page }) => {
    await page.evaluate(() => window.__mock.proveedorCaido(true));
    await actualizar(page);

    await expect(
      page.getByText(/el proveedor de datos de mercado no está disponible/i)
    ).toBeVisible();
    await expect(
      panel(page)
        .getByText(/cotización no disponible/i)
        .first()
    ).toBeVisible();

    await page.evaluate(() => window.__mock.proveedorCaido(false));
    await actualizar(page);

    await expect(
      page.getByText(/el proveedor de datos de mercado no está disponible/i)
    ).toHaveCount(0);
    await expect(mercado(page, /new york/i).locator('tr[data-ticker="AAPL"]')).toContainText(
      "176,50"
    );
  });
});
