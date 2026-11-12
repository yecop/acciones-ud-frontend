import { nuevoUuid } from "../api/httpClient.js";

/**
 * Base de datos en memoria del servidor mock. Se reinicia al recargar la página
 * (o con `window.__mock.reiniciar()`). Nada de esto existe en producción.
 */

/** Contraseña de todas las cuentas demo. */
export const CONTRASENA_DEMO = "Demo1234";
/** Código MFA válido. */
export const CODIGO_MFA_VALIDO = "482913";
/** Código que el mock trata como vencido (para probar `MFA_EXPIRADO`). */
export const CODIGO_MFA_EXPIRADO = "111111";

/** Vida del access token en ms. Configurable con VITE_MOCK_ACCESS_TTL_SECONDS. */
export const TTL_ACCESS_MS = Number(import.meta.env?.VITE_MOCK_ACCESS_TTL_SECONDS ?? 900) * 1000;

function usuariosIniciales() {
  const base = (id, correo, nombre, rol) => ({
    id,
    correo,
    nombre,
    rol,
    contrasena: CONTRASENA_DEMO,
    celular: "3001234567",
    nivelExperiencia: "PRINCIPIANTE",
    intereses: { mercados: ["NYSE", "NASDAQ"], sectores: ["TECNOLOGIA"] },
    comisionista: null,
    preferencias: {
      notificaciones: { canales: ["EMAIL"] },
      visualizacion: { tema: "esmeralda" },
      operaciones: { confirmarAntesDeEnviar: true },
    },
  });
  return [
    base("5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01", "laura@correo.com", "Laura", "INVERSIONISTA"),
    base("5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e02", "carlos@correo.com", "Carlos", "COMISIONISTA"),
    base("5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e03", "admin@correo.com", "Admin", "ADMINISTRADOR"),
    base("5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e04", "legal@correo.com", "Legal", "LEGAL"),
    base("5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e05", "junta@correo.com", "Junta", "JUNTA_DIRECTIVA"),
  ];
}

export const COMISIONISTAS = [
  {
    id: "c1000000-0000-4000-8000-000000000001",
    nombre: "Carlos R.",
    especialidad: "Tecnología y energía",
    perfil: "MODERADO",
  },
  {
    id: "c1000000-0000-4000-8000-000000000002",
    nombre: "Andrea P.",
    especialidad: "Salud y consumo",
    perfil: "CONSERVADOR",
  },
];

export const db = {
  usuarios: usuariosIniciales(),
  /** token → { usuarioId, expiraEn } (los vencidos se conservan para responder TOKEN_EXPIRADO). */
  tokensAcceso: new Map(),
  /** refreshToken → usuarioId */
  tokensRefresh: new Map(),
  /** mfaToken → { usuarioId, intentos, reenvios } */
  retosMfa: new Map(),
  /** Contadores para inspeccionar el comportamiento en pruebas. */
  contadores: { refresh: 0 },

  reiniciar() {
    this.usuarios = usuariosIniciales();
    this.tokensAcceso.clear();
    this.tokensRefresh.clear();
    this.retosMfa.clear();
    this.contadores.refresh = 0;
  },

  /** Emite un par de tokens para el usuario. */
  emitirTokens(usuarioId) {
    const accessToken = `mock-access-${nuevoUuid()}`;
    const refreshToken = `mock-refresh-${nuevoUuid()}`;
    this.tokensAcceso.set(accessToken, { usuarioId, expiraEn: Date.now() + TTL_ACCESS_MS });
    this.tokensRefresh.set(refreshToken, usuarioId);
    return { accessToken, refreshToken, tokenType: "Bearer", expiraEn: TTL_ACCESS_MS / 1000 };
  },

  /** Vence todos los access tokens vigentes (simula que pasó el tiempo). */
  expirarAccessTokens() {
    this.tokensAcceso.forEach((registro) => {
      registro.expiraEn = 0;
    });
  },
};
