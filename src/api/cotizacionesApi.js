import { http } from "./http.js";

/**
 * CotizacionesService (SCRUM-24): acciones y cotizaciones servidas desde la caché del
 * backend. El frontend nunca consulta a Alpaca; el backend refresca la caché cada 5 s.
 *
 * Usa el cliente HTTP común (token, renovación, X-Trace-Id y `ApiError` traducido).
 */

/**
 * @typedef {object} Advertencia
 * @property {"DATO_DESACTUALIZADO"|"PROVEEDOR_NO_DISPONIBLE"|"SIN_COTIZACION"} codigo
 * @property {string} mensaje
 */

/**
 * @typedef {object} Cotizacion
 * @property {string} ticker
 * @property {string} precio          Texto con 2 decimales (p. ej. "190.12").
 * @property {string} [bid]
 * @property {string} [ask]
 * @property {string} [spread]
 * @property {number} volumen
 * @property {string} actualizadoEn   ISO-8601 (UTC).
 * @property {string} fuente          p. ej. "ALPACA_IEX".
 * @property {number} antiguedadSegundos
 * @property {number} umbralAntiguedadSegundos  Máximo esperado para su mercado (15 s en EE. UU.).
 * @property {boolean} desactualizada
 * @property {Advertencia} [advertencia]
 */

/**
 * @typedef {object} Accion
 * @property {string} ticker
 * @property {string} nombre
 * @property {"NYSE"|"NASDAQ"|"LSE"|"TSE"|"ASX"} mercado
 * @property {string} sector
 * @property {string} moneda
 * @property {Cotizacion} [cotizacion]
 * @property {Advertencia} [advertencia]
 */

/**
 * GET /acciones — listado paginado con filtros.
 * @param {{mercado?:string, sector?:string, q?:string, pagina?:number, tamano?:number}} [filtros]
 * @param {{signal?:AbortSignal}} [opciones]
 * @returns {Promise<{contenido:Accion[], pagina:number, tamano:number, totalElementos:number, totalPaginas:number}>}
 */
export const listarAcciones = (filtros = {}, opciones = {}) =>
  http.get("/acciones", {
    ...opciones,
    query: {
      mercado: filtros.mercado,
      sector: filtros.sector,
      q: filtros.q?.trim(),
      pagina: filtros.pagina ?? 0,
      tamano: filtros.tamano ?? 20,
    },
  });

/**
 * GET /acciones/{ticker} — detalle con la última cotización en caché.
 * @param {string} ticker
 * @param {{signal?:AbortSignal}} [opciones]
 * @returns {Promise<Accion>}
 */
export const obtenerAccion = (ticker, opciones) =>
  http.get(`/acciones/${encodeURIComponent(ticker)}`, opciones);

/**
 * GET /acciones/{ticker}/cotizacion — 502 `PROVEEDOR_NO_DISPONIBLE` si nunca hubo dato.
 * @param {string} ticker
 * @param {{signal?:AbortSignal}} [opciones]
 * @returns {Promise<Cotizacion>}
 */
export const obtenerCotizacion = (ticker, opciones) =>
  http.get(`/acciones/${encodeURIComponent(ticker)}/cotizacion`, opciones);

export const CotizacionesService = { listarAcciones, obtenerAccion, obtenerCotizacion };

export default CotizacionesService;
