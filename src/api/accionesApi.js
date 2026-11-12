import { http } from "./http.js";

/**
 * Acciones y cotizaciones (contrato §4.4). Disponible para todos los roles.
 */

/**
 * GET /acciones — acciones disponibles, paginadas.
 * @param {{mercado?:string, sector?:string, q?:string, pagina?:number, tamano?:number}} [filtros]
 * @param {AbortSignal} [signal]
 * @returns {Promise<{contenido:Array<{ticker:string,nombre:string,mercado:string,sector:string,moneda:string}>, pagina:number, tamano:number, totalElementos:number, totalPaginas:number}>}
 */
export const listarAcciones = (filtros = {}, signal) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") params.set(clave, String(valor));
  });
  const consulta = params.toString();
  return http.get(`/acciones${consulta ? `?${consulta}` : ""}`, { signal });
};

/**
 * GET /acciones/{ticker}/cotizacion — último precio, bid, ask y spread.
 * Puede responder 404 (ticker inexistente) o 502 `PROVEEDOR_NO_DISPONIBLE`.
 * @param {string} ticker
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ticker:string, precio:string, bid:string, ask:string, spread:string, variacionPorcentaje?:string, actualizadoEn?:string}>}
 */
export const obtenerCotizacion = (ticker, signal) =>
  http.get(`/acciones/${encodeURIComponent(ticker)}/cotizacion`, { signal });
