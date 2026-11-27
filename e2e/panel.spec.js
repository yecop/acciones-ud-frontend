import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

const tarjeta = (page, etiqueta) =>
  page.getByText(etiqueta, { exact: true }).locator("xpath=ancestor::article");

test.describe("panel del inversionista", () => {
  test("mantiene las mismas secciones del menú al navegar", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const opciones = nav.getByRole("list").getByRole("button");
    await expect(nav.getByRole("button", { name: "Acciones", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Reportes", exact: true })).toBeVisible();
    const etiquetas = await opciones.allTextContents();

    for (const seccion of ["Acciones", "Operar", "Portafolio y órdenes", "Reportes", "Panel"]) {
      const boton = nav.getByRole("button", { name: seccion, exact: true });
      await boton.click();
      await expect(boton).toHaveAttribute("aria-current", "page");
      await expect(opciones).toHaveText(etiquetas);
    }
  });

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
