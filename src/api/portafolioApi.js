import { http } from "./http.js";

/**
 * Cuenta y portafolio (contrato §4.5). Solo rol INVERSIONISTA. Todos los montos llegan como
 * texto con 2 decimales (p. ej. "1500.00"); la capa de presentación decide el formato.
 */

/**
 * GET /cuenta/saldo
 * @returns {Promise<{disponible:string, reservado:string, total:string}>}
 */
export const obtenerSaldo = (opciones) => http.get("/cuenta/saldo", opciones);

/**
 * GET /portafolio — resumen del valor total.
 * @returns {Promise<{valorTotal:string, costoTotal:string, gananciaPerdidaTotal:string, porcentajeGananciaPerdidaTotal:string, numeroPosiciones:number}>}
 */
export const obtenerResumenPortafolio = (opciones) => http.get("/portafolio", opciones);

/**
 * GET /portafolio/posiciones — detalle de posiciones valoradas.
 * @returns {Promise<Array<{activo:string, cantidad:string, precioCompra:string, precioActual:string, valorActual:string, gananciaPerdida:string, porcentajeGananciaPerdida:string}>>}
 */
export const listarPosiciones = (opciones) => http.get("/portafolio/posiciones", opciones);
