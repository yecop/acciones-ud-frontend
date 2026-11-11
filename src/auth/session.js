/**
 * Almacén de sesión del frontend.
 *
 *  - `accessToken` vive solo en memoria (se pierde al recargar y se renueva con el refresh).
 *  - `refreshToken` y `usuario` viven en sessionStorage: sobreviven a una recarga de la
 *    pestaña y desaparecen al cerrarla.
 *  - `mfaToken` (reto de verificación en curso) también va en sessionStorage.
 *
 * Todo acceso a storage va en try/catch: puede lanzar en modo privado o con datos bloqueados.
 */
const KEY_REFRESH = "acciones-ud.refreshToken";
const KEY_USUARIO = "acciones-ud.usuario";
const KEY_MFA = "acciones-ud.mfaToken";

let accessToken = null;
const oyentesExpiracion = new Set();

function leer(clave) {
  try {
    return window.sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave, valor) {
  try {
    if (valor === null || valor === undefined) window.sessionStorage.removeItem(clave);
    else window.sessionStorage.setItem(clave, valor);
  } catch {
    /* sin storage disponible: la sesión dura lo que dure la memoria */
  }
}

export const session = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => leer(KEY_REFRESH),

  getUsuario() {
    const crudo = leer(KEY_USUARIO);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo);
    } catch {
      return null;
    }
  },

  getMfaToken: () => leer(KEY_MFA),
  setMfaToken: (token) => escribir(KEY_MFA, token),

  /** Guarda la respuesta de `/auth/mfa/verificar` o `/auth/refresh`. */
  setTokens({ accessToken: access, refreshToken }) {
    accessToken = access ?? null;
    if (refreshToken) escribir(KEY_REFRESH, refreshToken);
  },

  setUsuario: (usuario) => escribir(KEY_USUARIO, usuario ? JSON.stringify(usuario) : null),

  /** Cierra la sesión local (no llama al backend). */
  clear() {
    accessToken = null;
    escribir(KEY_REFRESH, null);
    escribir(KEY_USUARIO, null);
    escribir(KEY_MFA, null);
  },

  /** Notifica que la sesión no se pudo renovar y hay que volver a iniciar sesión. */
  expirar() {
    this.clear();
    oyentesExpiracion.forEach((fn) => fn());
  },

  /** @returns {() => void} función para cancelar la suscripción. */
  onExpirada(fn) {
    oyentesExpiracion.add(fn);
    return () => oyentesExpiracion.delete(fn);
  },
};
