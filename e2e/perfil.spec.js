import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

test.describe("perfil y preferencias", () => {
  test("guarda los datos básicos y el cambio se ve en el resto de la app", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.goto("/#/perfil");

    await expect(page.getByLabel("Nombre completo")).toHaveValue("Laura");
    await page.getByLabel("Nombre completo").fill("Laura Pérez");
    await page.getByRole("button", { name: "Guardar datos básicos" }).click();
    await expect(page.getByText("Tus datos básicos se guardaron.")).toBeVisible();

    await page.goto("/#/panel");
    await expect(page.getByRole("heading", { name: /hola, laura pérez/i })).toBeVisible();
  });

  test("valida el celular sin enviar y conserva lo escrito", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.goto("/#/perfil");

    await page.getByLabel("Celular").fill("12");
    await page.getByRole("button", { name: "Guardar datos básicos" }).click();

    await expect(page.getByText("Tus datos básicos se guardaron.")).toHaveCount(0);
    await expect(page.getByLabel("Celular")).toHaveValue("12");
  });

  test("el comisionista edita sus datos sin ver preferencias de inversionista", async ({
    page,
  }) => {
    await iniciarSesion(page, "carlos@correo.com");
    await page.goto("/#/perfil");

    await expect(page.getByLabel("Nombre completo")).toHaveValue("Carlos");
    await expect(page.getByLabel("Límite diario (USD)")).toHaveCount(0);
  });
});
