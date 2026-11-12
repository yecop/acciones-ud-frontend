/**
 * Capa de servicio para la funcionalidad de saldo y portafolio (SCRUM-25).
 *
 * Usa `fetch` (sin dependencias extra, igual que el resto del proyecto) para
 * consumir los endpoints del backend. Todos los montos llegan como texto con
 * 2 decimales (p. ej. "1500.00"); la capa de presentación decide el formato.
 *
 * La URL base se toma de `import.meta.env.VITE_API_BASE_URL`. Si está vacía,
 * las peticiones a `/api` las resuelve el proxy de Vite hacia el backend.
 */

const BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "";

/** Identificador de usuario simulado (un usuario nuevo recibe saldo inicial). */
const USUARIO_ID = "usuario-demo";

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Usuario-Id": USUARIO_ID,
    },
  });

  if (!response.ok) {
    throw new Error(`El servidor respondió ${response.status} en ${path}`);
  }
  return response.json();
}

/**
 * GET /api/v1/cuenta/saldo
 * @returns {Promise<{disponible:string, reservado:string, total:string}>}
 */
export function fetchSaldo() {
  return getJson("/api/v1/cuenta/saldo");
}

/**
 * GET /api/v1/portafolio (resumen del valor total del portafolio).
 * @returns {Promise<{valorTotal:string, costoTotal:string, gananciaPerdidaTotal:string, porcentajeGananciaPerdidaTotal:string, numeroPosiciones:number}>}
 */
export function fetchResumenPortafolio() {
  return getJson("/api/v1/portafolio");
}

/**
 * GET /api/v1/portafolio/posiciones (detalle de posiciones valoradas).
 * @returns {Promise<Array<{activo:string, cantidad:string, precioCompra:string, precioActual:string, valorActual:string, gananciaPerdida:string, porcentajeGananciaPerdida:string}>>}
 */
export function fetchPosiciones() {
  return getJson("/api/v1/portafolio/posiciones");
}
