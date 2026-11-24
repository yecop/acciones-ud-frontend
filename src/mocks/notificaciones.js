import { HttpResponse, http as rest } from "msw";
import { nuevoUuid } from "../api/httpClient.js";

/**
 * Mock de notificaciones (SCRUM-35, parte 2). Cada usuario solo ve y marca las suyas.
 *
 * [Definido] canales SMS, EMAIL y WHATSAPP; eventos configurables APERTURA_CIERRE_MERCADO,
 * RESUMEN_DIARIO_OPERACIONES y ORDEN_EJECUTADA. [Propuesta] forma
 * `{ id, tipo, titulo, mensaje, leida, creadaEn, referenciaId }` y `PATCH /notificaciones/{id}/leida`.
 * El backend dijo que probablemente se añadan tipos para propuestas y alertas.
 */

const RAIZ = "*/api/v1";
const USUARIO_LAURA = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01";

export const TIPOS_NOTIFICACION = [
  "APERTURA_CIERRE_MERCADO",
  "RESUMEN_DIARIO_OPERACIONES",
  "ORDEN_EJECUTADA",
  // ⚠ El contrato dice que cancelar crea una notificación, pero no define su tipo.
  "ORDEN_CANCELADA",
];

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;
const hace = (ms) => new Date(Date.now() - ms).toISOString();

/** Agrega una notificación al estado (más reciente primero). Devuelve el registro. */
export function crearNotificacion(
  lista,
  usuarioId,
  { tipo, titulo, mensaje, referenciaId = null }
) {
  const registro = {
    id: nuevoUuid(),
    usuarioId,
    tipo,
    titulo,
    mensaje,
    leida: false,
    creadaEn: new Date().toISOString(),
    referenciaId,
  };
  lista.unshift(registro);
  return registro;
}

/** Notificaciones demo de `laura@` (`nuevo@` no tiene: estado vacío). */
export function notificacionesIniciales() {
  const n = (numero, tipo, titulo, mensaje, antes, leida, referenciaId = null) => ({
    id: `0b000000-0000-4000-8000-00000000000${numero}`,
    usuarioId: USUARIO_LAURA,
    tipo,
    titulo,
    mensaje,
    leida,
    creadaEn: hace(antes),
    referenciaId,
  });
  return [
    n(
      1,
      "RESUMEN_DIARIO_OPERACIONES",
      "Resumen de ayer",
      "Ayer tuviste 1 orden ejecutada y 0 canceladas.",
      3 * HORA,
      false
    ),
    n(
      2,
      "APERTURA_CIERRE_MERCADO",
      "NYSE abrió",
      "El mercado NYSE abrió a las 9:30 (hora de Nueva York).",
      5 * HORA,
      false
    ),
    n(
      3,
      "ORDEN_CANCELADA",
      "Orden cancelada",
      "Cancelaste la compra de 2 TSLA. Se liberaron 489.60 USD.",
      8 * DIA,
      true,
      "0a000000-0000-4000-8000-000000000003"
    ),
    n(
      4,
      "ORDEN_EJECUTADA",
      "Orden ejecutada",
      "Se ejecutó la compra de 10 AAPL a 170.00 USD.",
      20 * DIA,
      true,
      "0a000000-0000-4000-8000-000000000002"
    ),
  ];
}

function vista({ usuarioId: _usuarioId, ...n }) {
  return n;
}

/**
 * Handlers de notificaciones. `conSimulacion` (latencia y errores forzados) lo aporta el módulo
 * de órdenes para no duplicarlo: `window.__mock.ordenes.fallar(codigo, { ruta: "/notificaciones" })`.
 */
export function crearHandlersNotificaciones({ db, error, protegido, pagina, conSimulacion }) {
  const ROLES = ["INVERSIONISTA", "COMISIONISTA"];
  const ruta = (resolver) => protegido(ROLES, (ctx) => conSimulacion(resolver)(ctx));
  const propias = (usuario) => db.trading.notificaciones.filter((n) => n.usuarioId === usuario.id);

  return [
    rest.get(
      `${RAIZ}/notificaciones`,
      ruta(async ({ request, usuario }) => {
        const url = new URL(request.url);
        const q = (nombre) => url.searchParams.get(nombre);
        const desde = q("desde") ? Date.parse(q("desde")) : null;
        if (q("desde") && Number.isNaN(desde)) {
          return error(request, 400, "VALIDACION_FALLIDA", "Fecha inválida.", {
            detalles: [{ campo: "desde", mensaje: "Usa formato ISO 8601." }],
          });
        }
        if (q("leida") && !["true", "false"].includes(q("leida"))) {
          return error(request, 400, "VALIDACION_FALLIDA", "Filtro inválido.", {
            detalles: [{ campo: "leida", mensaje: "Debe ser true o false." }],
          });
        }
        const lista = propias(usuario)
          .filter((n) => !q("tipo") || n.tipo === q("tipo"))
          .filter((n) => desde === null || Date.parse(n.creadaEn) >= desde)
          // ⚠ El filtro `leida` no está en el contrato: lo añadimos para la insignia de no leídas.
          .filter((n) => !q("leida") || String(n.leida) === q("leida"))
          .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn))
          .map(vista);
        return HttpResponse.json(pagina(lista, url));
      })
    ),

    rest.patch(
      `${RAIZ}/notificaciones/:id/leida`,
      ruta(async ({ request, usuario, params }) => {
        // Una notificación ajena responde 404, igual que las órdenes.
        const notificacion = propias(usuario).find((n) => n.id === params.id);
        if (!notificacion) {
          return error(request, 404, "NO_ENCONTRADO", "La notificación no existe.");
        }
        notificacion.leida = true;
        return HttpResponse.json(vista(notificacion));
      })
    ),
  ];
}

/** Utilidades de consola `window.__mock.notificaciones` (y para pruebas). */
export function utilidadesNotificaciones(db) {
  return {
    /** Crea una notificación para `usuarioId` (por defecto, Laura). */
    crear: (datos = {}, usuarioId = USUARIO_LAURA) =>
      crearNotificacion(db.trading.notificaciones, usuarioId, {
        tipo: "APERTURA_CIERRE_MERCADO",
        titulo: "Notificación de prueba",
        mensaje: "Creada desde la consola del mock.",
        ...datos,
      }),
    /** Simula que un mercado abrió o cerró. */
    mercado: (codigo = "NYSE", abierto = true, usuarioId = USUARIO_LAURA) =>
      crearNotificacion(db.trading.notificaciones, usuarioId, {
        tipo: "APERTURA_CIERRE_MERCADO",
        titulo: abierto ? `${codigo} abrió` : `${codigo} cerró`,
        mensaje: `El mercado ${codigo} ${abierto ? "abrió" : "cerró"}.`,
      }),
    /** Cuántas notificaciones sin leer tiene cada usuario. */
    noLeidas: (usuarioId = USUARIO_LAURA) =>
      db.trading.notificaciones.filter((n) => n.usuarioId === usuarioId && !n.leida).length,
  };
}
