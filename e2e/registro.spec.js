import { expect, test } from "@playwright/test";
import { enviarCredenciales } from "./ayudas.js";

async function completar(page, correo) {
  await page.getByLabel("Nombre completo").fill("Ana Pérez");
  await page.getByLabel("Correo electrónico").fill(correo);
  await page.getByLabel("Celular").fill("+57 300 123 4567");
  await page.getByLabel("Contraseña", { exact: true }).fill("Segura123");
  await page.getByLabel("Confirmar contraseña").fill("Segura123");
  await page.getByRole("radio", { name: "Principiante" }).check();
  await page.getByRole("radio", { name: "Moderado" }).check();
  await page.getByRole("checkbox", { name: "NYSE" }).check();
  await page.getByRole("checkbox", { name: "Tecnología" }).check();
  await page.getByRole("checkbox", { name: "Ahorrar a largo plazo" }).check();
}

const crear = (page) => page.getByRole("button", { name: "Crear cuenta y continuar" });

test.describe("registro", () => {
  test("crea la cuenta, queda pendiente de alta y no puede ingresar todavía", async ({ page }) => {
    await page.goto("/#/registro");
    await completar(page, "ana.nueva@correo.com");
    await crear(page).click();

    await expect(
      page.getByRole("heading", { name: "Tu cuenta está pendiente de alta" })
    ).toBeVisible();

    await page.getByRole("link", { name: "Ir al ingreso" }).click();
    await enviarCredenciales(page, "ana.nueva@correo.com", "Segura123");
    await expect(page.getByRole("alert")).toContainText(/pendiente de alta/i);
  });

  test("un correo repetido se señala en el campo y se puede corregir", async ({ page }) => {
    await page.goto("/#/registro");
    await completar(page, "laura@correo.com");
    await crear(page).click();

    await expect(page.getByLabel("Correo electrónico")).toHaveAccessibleDescription(
      /ya existe una cuenta/i
    );

    await page.getByLabel("Correo electrónico").fill("ana.otra@correo.com");
    await crear(page).click();
    await expect(page.getByRole("heading", { name: /pendiente de alta/i })).toBeVisible();
  });

  test("no envía con campos inválidos y conserva lo escrito", async ({ page }) => {
    await page.goto("/#/registro");
    await page.getByLabel("Nombre completo").fill("Ana Pérez");
    await crear(page).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByLabel("Nombre completo")).toHaveValue("Ana Pérez");
    await expect(page.getByRole("heading", { name: /pendiente de alta/i })).toHaveCount(0);
  });
});
