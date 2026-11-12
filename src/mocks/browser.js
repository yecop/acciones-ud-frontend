import { setupWorker } from "msw/browser";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO, db } from "./db.js";
import { handlers } from "./handlers.js";

/**
 * Levanta el servidor mock en el navegador (Service Worker de MSW).
 * Solo se importa cuando VITE_USE_MOCK=true (`npm start`).
 */
export async function iniciarMock() {
  const worker = setupWorker(...handlers);
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    quiet: true,
  });

  // Utilidades para depurar desde la consola del navegador.
  window.__mock = {
    /** Vence el access token actual: la siguiente llamada debe renovarse sola. */
    expirarToken: () => db.expirarAccessTokens(),
    /** Cuántas veces se renovó el token desde que cargó la página. */
    renovaciones: () => db.contadores.refresh,
    reiniciar: () => db.reiniciar(),
  };

  console.info(
    "[mock] Servidor simulado activo.\n" +
      `  Cuentas: laura@ (INV), carlos@ (COM), admin@ (ADM), legal@ (LEG), junta@ (JD) + correo.com\n` +
      `  Contraseña: ${CONTRASENA_DEMO} · Código MFA: ${CODIGO_MFA_VALIDO}\n` +
      "  Consola: window.__mock.expirarToken()"
  );
}
