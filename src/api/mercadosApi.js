import { http } from "./http.js";

/**
 * Mercados (contrato §4.4). Usa el cliente HTTP común: token, renovación automática,
 * X-Trace-Id y errores traducidos (`ApiError`) vienen incluidos.
 */

/**
 * GET /mercados
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{codigo:string,nombre:string,zonaHoraria:string,horaApertura:string,horaCierre:string,diasHabiles:string}>>}
 */
export const listarMercados = (signal) => http.get("/mercados", { signal });

/**
 * GET /mercados/{codigo}/estado
 * @param {string} codigo
 * @param {AbortSignal} [signal]
 */
export const obtenerEstadoMercado = (codigo, signal) =>
  http.get(`/mercados/${encodeURIComponent(codigo)}/estado`, { signal });
