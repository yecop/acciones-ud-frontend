import { http } from "./http.js";

/**
 * Propuestas del comisionista al inversionista (SCRUM-65).
 * Flujo [Propuesta]: el comisionista crea → el cliente aprueba o rechaza → el comisionista firma.
 * ⚠ Endpoints y estados sin confirmar con backend (docs/trading-mock.md).
 */

/** GET /propuestas — del cliente (INV) o del comisionista (COM); filtros `estado`, `clienteId`. */
export const listarPropuestas = (filtros = {}, opciones) =>
  http.get("/propuestas", { ...opciones, query: filtros });

/** GET /propuestas/{id} — incluye `historial`. 404 si no es tuya. */
export const obtenerPropuesta = (id, opciones) =>
  http.get(`/propuestas/${encodeURIComponent(id)}`, opciones);

/** POST /propuestas (COM) — `{ clienteId, titulo, nota?, estrategiaId?, ordenes, venceEn }`. */
export const crearPropuesta = (datos) => http.post("/propuestas", datos);

/** POST /propuestas/{id}/aprobar (INV) */
export const aprobarPropuesta = (id) => http.post(`/propuestas/${encodeURIComponent(id)}/aprobar`);

/** POST /propuestas/{id}/rechazar (INV) — `motivo` obligatorio. */
export const rechazarPropuesta = (id, motivo) =>
  http.post(`/propuestas/${encodeURIComponent(id)}/rechazar`, { motivo });

/** POST /propuestas/{id}/firmar (COM) — crea las órdenes del cliente. */
export const firmarPropuesta = (id) => http.post(`/propuestas/${encodeURIComponent(id)}/firmar`);
