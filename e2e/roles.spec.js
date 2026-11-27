import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

/**
 * Regresión de permisos por rol (SCRUM-59): cada rol entra a sus pantallas y recibe
 * «no tienes acceso» en las de otros roles, también cambiando la URL a mano.
 */
const MATRIZ = [
  {
    rol: "inversionista",
    correo: "laura@correo.com",
    permitidas: ["/panel", "/acciones", "/operar", "/historial", "/portafolio", "/perfil"],
    prohibidas: ["/admin", "/auditoria", "/comisionista"],
  },
  {
    rol: "comisionista",
    correo: "carlos@correo.com",
    permitidas: ["/acciones", "/operar", "/comisionista", "/perfil"],
    prohibidas: ["/panel", "/historial", "/portafolio", "/admin"],
  },
  {
    rol: "administrador",
    correo: "admin@correo.com",
    permitidas: ["/admin"],
    prohibidas: ["/panel", "/operar", "/auditoria", "/comisionista"],
  },
  {
    rol: "legal",
    correo: "legal@correo.com",
    permitidas: ["/auditoria"],
    prohibidas: ["/admin", "/operar", "/historial"],
  },
  {
    rol: "junta directiva",
    correo: "junta@correo.com",
    permitidas: ["/reportes"],
    prohibidas: ["/operar", "/admin", "/auditoria"],
  },
];

test.describe("permisos por rol", () => {
  for (const { rol, correo, permitidas, prohibidas } of MATRIZ) {
    test(`${rol}: entra a sus pantallas y no a las ajenas`, async ({ page }) => {
      await iniciarSesion(page, correo);

      for (const ruta of permitidas) {
        await page.goto(`/#${ruta}`);
        await expect(page).toHaveURL(new RegExp(`#${ruta}$`));
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole("heading", { name: /no tienes acceso/i })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: /página no encontrada/i })).toHaveCount(0);
      }

      for (const ruta of prohibidas) {
        await page.goto(`/#${ruta}`);
        await expect(page.getByRole("heading", { name: /no tienes acceso/i })).toBeVisible();
      }
    });
  }
});
