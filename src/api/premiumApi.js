import { http } from "./http.js";

// Contrato provisional del mock hasta integrar SCRUM-54 y SCRUM-55.
export const listarPlanes = (opciones) => http.get("/suscripciones/planes", opciones);
export const obtenerSuscripcion = (opciones) => http.get("/suscripciones/actual", opciones);
export const iniciarPago = (datos) => http.post("/suscripciones/checkout", datos);
export const cancelarSuscripcion = () => http.delete("/suscripciones/actual");

export const listarSeguimiento = (recurso, opciones) => http.get(`/${recurso}`, opciones);
export const agregarSeguimiento = (recurso, datos) => http.post(`/${recurso}`, datos);
export const quitarSeguimiento = (recurso, id) =>
  http.delete(`/${recurso}/${encodeURIComponent(id)}`);
export const reactivarSeguimiento = (recurso, id) =>
  http.patch(`/${recurso}/${encodeURIComponent(id)}`, { activa: true });
