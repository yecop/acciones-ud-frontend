import { expect } from "@playwright/test";

export const CONTRASENA = "Demo1234";
export const CODIGO_VALIDO = "482913";
export const CODIGO_VENCIDO = "111111";

/** Paso 1: credenciales. */
export async function enviarCredenciales(page, correo, contrasena = CONTRASENA) {
  await page.getByLabel(/correo electrónico/i).fill(correo);
  await page.getByLabel(/^contraseña$/i).fill(contrasena);
  await page.getByRole("button", { name: /continuar/i }).click();
}

/** Paso 2: código MFA. */
export async function enviarCodigo(page, codigo = CODIGO_VALIDO) {
  await page.getByLabel("Dígito 1").click();
  await page.keyboard.type(codigo);
  await page.getByRole("button", { name: /verificar e ingresar/i }).click();
}

/** Recorre login + MFA completo y espera a salir de la pantalla de ingreso. */
export async function iniciarSesion(page, correo = "laura@correo.com") {
  await page.goto("/#/ingreso");
  await enviarCredenciales(page, correo);
  await expect(page.getByText(/paso 2 de 2/i)).toBeVisible();
  await enviarCodigo(page);
  await expect(page.getByRole("button", { name: /salir/i })).toBeVisible();
}
