import { expect, test } from "@playwright/test";
import { iniciarSesion, irASeccion } from "./ayudas.js";

test("recorre el pago de prueba, administra el seguimiento y cancela Premium", async ({ page }) => {
  await iniciarSesion(page);
  await irASeccion(page, "Premium");
  await expect(page.getByText("Plan básico", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver planes" })).toBeVisible();
  await page.getByRole("button", { name: "Elegir Premium mensual" }).click();
  const tarjeta = page.getByRole("combobox", { name: /tarjeta de prueba/i });
  const pagar = page.getByRole("button", { name: "Confirmar pago de prueba" });
  await tarjeta.selectOption("RECHAZADO");
  await pagar.click();
  await expect(page.getByRole("alert")).toContainText(/pago fue rechazado/i);
  await tarjeta.selectOption("APROBADO");
  await pagar.click();
  await expect(page.getByText("Premium activo", { exact: true })).toBeVisible();

  const watchlist = page.getByRole("region", { name: "Watchlist" });
  const alertas = page.getByRole("region", { name: "Alertas de precio" });
  await expect(watchlist.getByText("Tu watchlist está vacía.")).toBeVisible();
  await expect(alertas.getByText("Todavía no tienes alertas de precio.")).toBeVisible();
  await watchlist.getByRole("textbox", { name: "Símbolo de la acción" }).fill("AAPL");
  await watchlist.getByRole("button", { name: "Agregar acción" }).click();
  await alertas.getByRole("textbox", { name: "Símbolo de la acción" }).fill("AAPL");
  await alertas.getByRole("spinbutton", { name: "Precio objetivo" }).fill("250");
  await alertas.getByRole("button", { name: "Crear alerta" }).click();

  for (const seccion of [watchlist, alertas]) {
    await seccion.getByRole("button", { name: /^Eliminar AAPL/ }).click();
    await expect(seccion.getByText("Eliminada", { exact: true })).toBeVisible();
    await seccion.getByRole("button", { name: /^Reactivar AAPL/ }).click();
    await expect(seccion.getByText("Activa", { exact: true })).toBeVisible();
  }

  await page.reload();
  await expect(page.getByText("Premium activo", { exact: true })).toBeVisible();
  await expect(watchlist.getByRole("button", { name: "Eliminar AAPL" })).toBeVisible();
  await expect(alertas.getByRole("button", { name: /^Eliminar AAPL/ })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar suscripción" }).click();
  await page.getByRole("button", { name: "Confirmar cancelación" }).click();
  await expect(page.getByText("Suscripción cancelada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver planes" })).toBeVisible();
});

test("muestra el error de carga y permite reintentar", async ({ page }) => {
  await page.addInitScript(() => {
    const enviar = window.fetch.bind(window);
    window.fetch = (entrada, opciones) => {
      if (
        !sessionStorage.getItem("planes-disponibles") &&
        String(entrada).endsWith("/suscripciones/planes")
      ) {
        return Promise.reject(new TypeError("Fallo de red simulado"));
      }
      return enviar(entrada, opciones);
    };
  });
  await iniciarSesion(page);
  await irASeccion(page, "Premium");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("planes-disponibles", "true"));
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("button", { name: "Elegir Premium mensual" })).toBeVisible();
});
