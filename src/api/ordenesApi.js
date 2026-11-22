import { http } from "./http.js";
import { nuevoUuid } from "./httpClient.js";

/**
 * Órdenes (contrato §4.6). Montos como texto con 2 decimales.
 * Las listas (`GET /ordenes`) usan la paginación del resto de la API; su forma exacta y los
 * estados intermedios están pendientes de validar con backend (docs/trading-mock.md).
 */

/** POST /ordenes/simulacion — calcula costos sin crear la orden (INV, COM). */
export const simularOrden = (solicitud, opciones) =>
  http.post("/ordenes/simulacion", solicitud, opciones);

/**
 * POST /ordenes — crea la orden. `Idempotency-Key` es obligatoria; si no se pasa se genera una.
 * Para reintentar tras 502/504 hay que reutilizar la MISMA clave (el cliente HTTP ya lo hace).
 */
export const crearOrden = (solicitud, { idempotencyKey = nuevoUuid(), ...opciones } = {}) =>
  http.post("/ordenes", solicitud, { ...opciones, idempotencyKey });

/** GET /ordenes — filtros: estado, ticker, lado, desde, hasta, pagina, tamano. */
export const listarOrdenes = (filtros = {}, opciones) =>
  http.get("/ordenes", { ...opciones, query: filtros });

/** GET /ordenes/{id} */
export const obtenerOrden = (id, opciones) => http.get(`/ordenes/${id}`, opciones);

/** GET /ordenes/{id}/historial */
export const obtenerHistorialOrden = (id, opciones) =>
  http.get(`/ordenes/${id}/historial`, opciones);

/** POST /ordenes/{id}/cancelar */
export const cancelarOrden = (id, opciones) => http.post(`/ordenes/${id}/cancelar`, {}, opciones);
