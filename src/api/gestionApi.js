import { http } from "./http.js";

export const listarHorarios = (opciones) => http.get("/admin/mercados", opciones);
export const actualizarHorario = (codigo, datos, opciones) =>
  http.patch(`/admin/mercados/${encodeURIComponent(codigo)}`, datos, opciones);
export const listarUsuarios = (opciones) => http.get("/admin/usuarios", opciones);
export const actualizarUsuario = (id, datos, opciones) =>
  http.patch(`/admin/usuarios/${encodeURIComponent(id)}`, datos, opciones);
export const obtenerParametros = (opciones) => http.get("/admin/parametros", opciones);
export const actualizarParametros = (datos, opciones) =>
  http.put("/admin/parametros", datos, opciones);
export const listarEventos = (query, opciones) =>
  http.get("/auditoria/eventos", { ...opciones, query });
export const obtenerTrazabilidad = (id, opciones) =>
  http.get(`/auditoria/ordenes/${encodeURIComponent(id)}/historial`, opciones);
export const listarRestricciones = (opciones) => http.get("/restricciones", opciones);
export const crearRestriccion = (datos, opciones) => http.post("/restricciones", datos, opciones);
export const levantarRestriccion = (id, datos, opciones) =>
  http.patch(`/restricciones/${encodeURIComponent(id)}`, datos, opciones);
export const listarReportes = (query, opciones) => http.get("/reportes", { ...opciones, query });
export const obtenerDashboardEmpresarial = (query, opciones) =>
  http.get("/reportes/dashboard", { ...opciones, query });
