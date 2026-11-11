import { http } from "./http.js";

/**
 * Perfil y comisionista asociado (contrato §4.2).
 */

/** GET /perfil */
export const obtenerPerfil = (opciones) => http.get("/perfil", opciones);

/** PATCH /perfil — nombre, celular e intereses. */
export const actualizarPerfil = (cambios) => http.patch("/perfil", cambios);

/** GET /perfil/preferencias */
export const obtenerPreferencias = (opciones) => http.get("/perfil/preferencias", opciones);

/** PUT /perfil/preferencias — reemplaza todas las preferencias. */
export const reemplazarPreferencias = (preferencias) =>
  http.put("/perfil/preferencias", preferencias);

/** GET /comisionistas */
export const listarComisionistas = (opciones) => http.get("/comisionistas", opciones);

/** PUT /perfil/comisionista */
export const asociarComisionista = ({ comisionistaId, operaEnNombre }) =>
  http.put("/perfil/comisionista", { comisionistaId, operaEnNombre });

/** DELETE /perfil/comisionista */
export const desasociarComisionista = () => http.delete("/perfil/comisionista");
