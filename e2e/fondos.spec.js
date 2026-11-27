import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

test("valida montos y actualiza el saldo y el historial después de depositar o retirar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const enviar = window.fetch.bind(window);
    window.solicitudesFondos = [];
    window.fetch = (entrada, opciones) => {
      if (/\/cuenta\/(depositos|retiros)$/.test(String(entrada)) && opciones?.method === "POST") {
        window.solicitudesFondos.push(String(entrada));
      }
      return enviar(entrada, opciones);
    };
  });
  await iniciarSesion(page, "nuevo@correo.com");
  await page.goto("/#/portafolio");
  await page.getByRole("link", { name: "Depósitos y retiros" }).click();
  await expect(page.getByRole("heading", { name: "Depósitos y retiros" })).toBeVisible();
  const historial = page.getByRole("region", { name: "Historial de movimientos" });
  const saldo = page.getByRole("region", { name: "Mi dinero" });
  const monto = page.getByLabel("Monto (USD)");
  await expect(historial.getByText("Todavía no tienes movimientos.")).toBeVisible();

  await monto.fill("2,345");
  await page.getByRole("button", { name: "Confirmar depósito" }).click();
  await expect(page.getByRole("alert")).toContainText(/máximo dos decimales/);
  expect(await page.evaluate(() => window.solicitudesFondos)).toEqual([]);

  await monto.fill("50,00");
  await page.getByRole("button", { name: "Confirmar depósito" }).click();
  await expect(page.getByText(/Depósito de .*50,00 completado/)).toBeVisible();
  await expect(saldo).toContainText("50,00");
  await expect(historial.getByRole("listitem")).toHaveCount(1);
  await expect(historial.getByRole("listitem").first()).toContainText("Depósito");

  await page.getByRole("radio", { name: "Retiro" }).check();
  await monto.fill("50.01");
  await page.getByRole("button", { name: "Confirmar retiro" }).click();
  await expect(page.getByRole("alert")).toContainText("supera tu saldo disponible");
  await expect(saldo).toContainText("50,00");
  await expect(historial.getByRole("listitem")).toHaveCount(1);
  expect(await page.evaluate(() => window.solicitudesFondos)).toHaveLength(1);

  await monto.fill("12.50");
  await page.getByRole("button", { name: "Confirmar retiro" }).click();
  await expect(page.getByText(/Retiro de .*12,50 completado/)).toBeVisible();
  await expect(saldo).toContainText("37,50");
  await expect(historial.getByRole("listitem")).toHaveCount(2);
  await expect(historial.getByRole("listitem").first()).toContainText("Retiro");
  await page.getByRole("link", { name: "Volver al portafolio" }).click();
  await expect(page.getByRole("region", { name: "Mi dinero" })).toContainText("37,50");
});

test("un reintento tras perder la respuesta conserva la clave del depósito", async ({ page }) => {
  await page.addInitScript(() => {
    const enviar = window.fetch.bind(window);
    const claves = [];
    window.clavesDeposito = claves;
    window.fetch = async (entrada, opciones) => {
      const respuesta = await enviar(entrada, opciones);
      if (String(entrada).endsWith("/cuenta/depositos") && opciones?.method === "POST") {
        claves.push(new Headers(opciones.headers).get("Idempotency-Key"));
        if (claves.length <= 3) return new Response(null, { status: 504 });
      }
      return respuesta;
    };
  });
  await iniciarSesion(page, "nuevo@correo.com");
  await page.goto("/#/portafolio/fondos");
  await page.getByLabel("Monto (USD)").fill("50");
  const confirmar = page.getByRole("button", { name: "Confirmar depósito" });
  await confirmar.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await confirmar.click();
  await expect(page.getByText(/Depósito de .*50,00 completado/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Mi dinero" })).toContainText("50,00");
  await expect(
    page.getByRole("region", { name: "Historial de movimientos" }).getByRole("listitem")
  ).toHaveCount(1);
  const claves = await page.evaluate(() => window.clavesDeposito);
  expect(claves).toHaveLength(4);
  expect(new Set(claves).size).toBe(1);
  expect(claves[0]).toBeTruthy();
});
