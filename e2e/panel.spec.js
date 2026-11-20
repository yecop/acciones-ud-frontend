import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

const tarjeta = (page, etiqueta) =>
  page.getByText(etiqueta, { exact: true }).locator("xpath=ancestor::article");

test.describe("panel del inversionista", () => {
  test("las tarjetas muestran saldo, portafolio y ganancia que devuelve la API", async ({
    page,
  }) => {
    await iniciarSesion(page, "laura@correo.com");

    await expect(tarjeta(page, "Fondos disponibles")).toContainText("4.250,00");
    await expect(tarjeta(page, "Fondos disponibles")).toContainText("351,20");
    await expect(tarjeta(page, "Valor del portafolio")).toContainText("5 posiciones");
    await expect(tarjeta(page, "Ganancia de hoy")).toContainText("96,30");
  });

  test("la acción destacada alimenta el gráfico y el formulario de orden, y avisa que el trazo es de ejemplo", async ({
    page,
  }) => {
    await iniciarSesion(page, "laura@correo.com");

    await expect(page.getByText(/AAPL · Apple Inc\. · NYSE/)).toBeVisible();
    await expect(page.getByText(/trazo y estadísticas de ejemplo/i)).toBeVisible();
    await expect(page.getByText("Saldo disponible")).toBeVisible();
  });

  test("una cuenta nueva ve sus tarjetas en cero, sin datos ajenos", async ({ page }) => {
    await iniciarSesion(page, "nuevo@correo.com");

    await expect(tarjeta(page, "Valor del portafolio")).toContainText("0 posiciones");
    await expect(tarjeta(page, "Fondos disponibles")).toContainText("0,00");
  });
});
