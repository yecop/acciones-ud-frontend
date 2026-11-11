import { http } from "./http.js";

/**
 * Autenticación y seguridad (contrato §4.1). Todos son endpoints PUB salvo `logout`.
 */

/** POST /auth/registro */
export const registrar = (datos) => http.post("/auth/registro", datos, { auth: false });

/**
 * POST /auth/login — primer factor.
 * @returns {Promise<{mfaToken:string, canal:"EMAIL"|"SMS", expiraEn:number}>}
 */
export const iniciarSesion = ({ correo, contrasena }) =>
  http.post("/auth/login", { correo, contrasena }, { auth: false });

/**
 * POST /auth/mfa/verificar — segundo factor.
 * @returns {Promise<{accessToken:string, refreshToken:string, tokenType:string, expiraEn:number,
 *   usuario:{id:string, nombre:string, rol:string}}>}
 */
export const verificarMfa = ({ mfaToken, codigo }) =>
  http.post("/auth/mfa/verificar", { mfaToken, codigo }, { auth: false });

/** POST /auth/mfa/reenviar */
export const reenviarMfa = ({ mfaToken }) =>
  http.post("/auth/mfa/reenviar", { mfaToken }, { auth: false });

/** POST /auth/logout */
export const cerrarSesion = () => http.post("/auth/logout");
