import { http } from "./http.js";

/**
 * Notificaciones (contrato §4.x). Cada usuario solo ve y marca las suyas. La forma de cada una
 * y `PATCH /notificaciones/{id}/leida` son propuestas del backend (docs/trading-mock.md).
 */

/**
 * GET /notificaciones — filtros: tipo, desde (ISO 8601), pagina, tamano y, solo en el mock,
 * `leida` (true | false) para contar las no leídas.
 * @returns {Promise<{contenido: Array<{id:string, tipo:string, titulo:string, mensaje:string, leida:boolean, creadaEn:string, referenciaId:string|null}>, pagina:number, tamano:number, totalElementos:number, totalPaginas:number}>}
 */
export const listarNotificaciones = (filtros = {}, opciones) =>
  http.get("/notificaciones", { ...opciones, query: filtros });

/** PATCH /notificaciones/{id}/leida — marca una notificación como leída. */
export const marcarNotificacionLeida = (id, opciones) =>
  http.patch(`/notificaciones/${id}/leida`, undefined, opciones);
