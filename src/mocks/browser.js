import { setupWorker } from "msw/browser";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO, db } from "./db.js";
import { handlers } from "./handlers.js";
import { conectarPersistencia } from "./persistence.js";

/**
 * Levanta el servidor mock en el navegador (Service Worker de MSW).
 * Solo se importa cuando VITE_USE_MOCK=true (`npm start`).
 */
export async function iniciarMock() {
  try {
    conectarPersistencia(db, window.sessionStorage);
  } catch {
    /* modo privado */
  }
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
    /** Las cotizaciones responden 502 PROVEEDOR_NO_DISPONIBLE (true) o vuelven a la normalidad. */
    proveedorCaido: (caido = true) => {
      db.simulacion.proveedorCaido = caido;
    },
    /** Fuerza que un mercado figure abierto (true) o cerrado (false); `null` vuelve al horario real. */
    mercadoAbierto: (codigo, abierto = true) => {
      if (abierto === null) delete db.simulacion.mercadoAbierto[codigo];
      else db.simulacion.mercadoAbierto[codigo] = abierto;
    },
    /** Hace que la cotización de `ticker` tenga `segundos` de antigüedad (dato antiguo). */
    datoAntiguo: (ticker, segundos = 600) => {
      db.simulacion.edades[ticker] = segundos;
    },
  };

  console.info(
    "[mock] Servidor simulado activo.\n" +
      `  Cuentas: laura@ (INV), carlos@ (COM), admin@ (ADM), legal@ (LEG), junta@ (JD) + correo.com\n` +
      `  Contraseña: ${CONTRASENA_DEMO} · Código MFA: ${CODIGO_MFA_VALIDO}\n` +
      "  Consola: window.__mock.expirarToken() · proveedorCaido() · datoAntiguo('AAPL', 600) · mercadoAbierto('NYSE')"
  );
}
