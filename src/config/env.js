/**
 * Configuración de entorno (variables VITE_*). Ver `.env.example`.
 *
 *  VITE_API_BASE_URL  Origen del backend, sin sufijo (p. ej. https://acciones-ud.example.com).
 *                     Vacío = mismo origen (el proxy de Vite o el mock resuelven `/api/v1`).
 *  VITE_USE_MOCK      "true" levanta el servidor mock (MSW) en el navegador.
 */
const env = import.meta.env ?? {};

/** Prefijo de versión del contrato: todas las rutas del contrato cuelgan de aquí. */
export const API_PREFIX = "/api/v1";

export const API_BASE_URL = String(env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/** URL base completa de la API (origen + prefijo de versión). */
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

export const USE_MOCK = env.VITE_USE_MOCK === "true";
