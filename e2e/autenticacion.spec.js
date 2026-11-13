import { expect, test } from "@playwright/test";
import { CODIGO_VENCIDO, enviarCodigo, enviarCredenciales, iniciarSesion } from "./ayudas.js";

test.describe("ingreso con verificación en dos pasos", () => {
  test("flujo feliz: credenciales, código y llegada al panel", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");

    await expect(page).toHaveURL(/#\/panel$/);
    await expect(page.getByRole("heading", { name: /hola, laura/i })).toBeVisible();
  });

  test("cada rol aterriza en su pantalla inicial", async ({ page }) => {
    await iniciarSesion(page, "admin@correo.com");

    await expect(page).toHaveURL(/#\/admin$/);
    await expect(page.getByRole("heading", { name: "Administración" })).toBeVisible();
  });

  test("credenciales incorrectas muestran un mensaje y no avanzan", async ({ page }) => {
    await page.goto("/#/ingreso");
    await enviarCredenciales(page, "laura@correo.com", "ClaveIncorrecta1");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/paso 2 de 2/i)).toHaveCount(0);
  });

  test("tras 5 fallos se bloquea el envío con cuenta regresiva", async ({ page }) => {
    await page.goto("/#/ingreso");
    for (let i = 0; i < 6; i += 1) {
      const boton = page.getByRole("button", { name: /continuar|disponible en/i });
      if (await boton.isDisabled()) break;
      await enviarCredenciales(page, "carlos@correo.com", "ClaveIncorrecta1");
      await expect(page.getByRole("alert")).toBeVisible();
    }

    await expect(page.getByText(/disponible en \d\d:\d\d/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /disponible en/i })).toBeDisabled();
  });

  test("código incorrecto muestra el error y permite reintentar", async ({ page }) => {
    await page.goto("/#/ingreso");
    await enviarCredenciales(page, "laura@correo.com");
    await enviarCodigo(page, "000000");

    await expect(page.getByRole("alert")).toContainText(/incorrecto/i);
    await expect(page.getByLabel("Dígito 1")).toBeVisible();
  });

  test("código vencido avisa y permite pedir uno nuevo", async ({ page }) => {
    await page.goto("/#/ingreso");
    await enviarCredenciales(page, "laura@correo.com");
    await enviarCodigo(page, CODIGO_VENCIDO);

    await expect(page.getByRole("alert")).toContainText(/venci/i);
    await expect(page.getByRole("button", { name: /verificar e ingresar/i })).toBeDisabled();
  });

  test("recargar la página del código conserva el reto", async ({ page }) => {
    await page.goto("/#/ingreso");
    await enviarCredenciales(page, "laura@correo.com");
    await expect(page.getByText(/paso 2 de 2/i)).toBeVisible();

    await page.reload();

    await expect(page.getByText(/paso 2 de 2/i)).toBeVisible();
  });
});

test.describe("sesión y rutas protegidas", () => {
  test("sin sesión, una ruta protegida lleva al ingreso", async ({ page }) => {
    await page.goto("/#/portafolio");

    await expect(page.getByRole("heading", { name: /ingresa a tu cuenta/i })).toBeVisible();
  });

  test("un rol sin permiso ve «no tienes acceso»", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.goto("/#/admin");

    await expect(page.getByRole("heading", { name: /no tienes acceso/i })).toBeVisible();
  });

  test("salir cierra la sesión y la ruta protegida vuelve a pedir ingreso", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page.getByRole("button", { name: /salir/i }).click();
    await expect(page.getByRole("heading", { name: /ingresa a tu cuenta/i })).toBeVisible();

    await page.goto("/#/panel");

    await expect(page.getByRole("heading", { name: /ingresa a tu cuenta/i })).toBeVisible();
  });

  test("si el token expira, la app renueva la sesión sin sacar a la persona", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");

    await page.evaluate(() => window.__mock.expirarToken());
    await page.getByRole("button", { name: "Perfil" }).first().click();

    await expect(page.getByRole("heading", { name: /perfil y preferencias/i })).toBeVisible();
    // El heading se pinta antes de que termine la renovación: se espera a que se registre.
    await expect.poll(() => page.evaluate(() => window.__mock.renovaciones())).toBeGreaterThan(0);
    // Y la persona sigue dentro, con sus datos cargados, sin volver al ingreso.
    await expect(page.getByRole("button", { name: /salir/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /ingresa a tu cuenta/i })).toHaveCount(0);
  });

  test("una ruta inexistente muestra 404", async ({ page }) => {
    await page.goto("/#/no-existe");

    await expect(page.getByRole("heading", { name: /página no encontrada/i })).toBeVisible();
  });
});
