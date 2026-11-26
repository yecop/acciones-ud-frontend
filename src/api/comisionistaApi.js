import { http } from "./http.js";

/**
 * Comisionista: clientes asignados y estrategias (SCRUM-65).
 * ⚠ Endpoints [Propuesta]: backend aún no los define (docs/trading-mock.md).
 */

/** GET /clientes — clientes asignados al comisionista (paginado). */
export const listarClientes = (filtros = {}, opciones) =>
  http.get("/clientes", { ...opciones, query: filtros });

/** GET /clientes/{id} — 404 si no existe o no está asignado a este comisionista. */
export const obtenerCliente = (id, opciones) =>
  http.get(`/clientes/${encodeURIComponent(id)}`, opciones);

/** GET /clientes/{id}/portafolio/posiciones */
export const posicionesDeCliente = (id, opciones) =>
  http.get(`/clientes/${encodeURIComponent(id)}/portafolio/posiciones`, opciones);

/** GET /clientes/{id}/ordenes (paginado) */
export const ordenesDeCliente = (id, filtros = {}, opciones) =>
  http.get(`/clientes/${encodeURIComponent(id)}/ordenes`, { ...opciones, query: filtros });

/** GET /estrategias — filtro opcional `estado` (ACTIVA | ARCHIVADA). */
export const listarEstrategias = (filtros = {}, opciones) =>
  http.get("/estrategias", { ...opciones, query: filtros });

/** POST /estrategias */
export const crearEstrategia = (datos) => http.post("/estrategias", datos);

/** PATCH /estrategias/{id} — nombre, descripcion, perfilRiesgo o estado. */
export const actualizarEstrategia = (id, cambios) =>
  http.patch(`/estrategias/${encodeURIComponent(id)}`, cambios);
