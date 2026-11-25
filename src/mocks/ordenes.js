import { HttpResponse, http as rest } from "msw";
import { nuevoUuid } from "../api/httpClient.js";
import { ACCIONES, estadoDeMercado, MERCADOS, monto } from "./mercadosData.js";

/**
 * Mock de órdenes (SCRUM-35). Estado en memoria, coherente con saldo y portafolio:
 * crear una compra reserva fondos, ejecutarla mueve el saldo y la posición, cancelarla libera.
 *
 * Las reglas siguen las respuestas del backend (22-nov). Lo que ellos marcaron como [Propuesta]
 * y lo que sigue sin definir está en docs/trading-mock.md; puede cambiar.
 */

const RAIZ = "*/api/v1";
/** [Definido] 2,00 % del total de la transacción (configurable en el backend). */
const PORCENTAJE_COMISION = 2;
/** [Definido] Con comisionista: 60 % Acciones UD y 40 % comisionista. */
const PARTE_COMISIONISTA = 0.4;
export const CODIGO_AUTORIZACION_VALIDO = "654321";
const VIGENCIA_AUTORIZACION_MS = 5 * 60_000;
const TIPOS = ["MARKET", "LIMIT", "STOP_LOSS", "TAKE_PROFIT"];
const LADOS = ["COMPRA", "VENTA"];

/** [Definido] No existe EJECUTADA: las ejecuciones (también las parciales) van aparte. */
export const ESTADOS_ORDEN = [
  "PENDIENTE",
  "ENVIADA",
  "FIRMADA_POR_COMISIONISTA",
  "EN_EJECUCION",
  "CANCELADA",
  "RECHAZADA",
  "EXPIRADA",
  "EN_REVISION",
  "FALLIDA",
  "DETENIDA",
];
/** [Propuesta] Solo se puede cancelar en PENDIENTE o EN_REVISION. */
const CANCELABLES = new Set(["PENDIENTE", "EN_REVISION"]);
/** Estados finales que liberan los fondos reservados de una compra. */
const LIBERAN_FONDOS = new Set(["CANCELADA", "RECHAZADA", "EXPIRADA", "FALLIDA"]);
/**
 * ⚠ Sin definir: el backend no tiene EJECUTADA. El mock deja la orden completamente ejecutada
 * en este estado, con `cantidadEjecutada === cantidad`.
 */
const ESTADO_AL_EJECUTAR = "EN_EJECUCION";

const STATUS_POR_CODIGO = {
  VALIDACION_FALLIDA: 400,
  NO_AUTENTICADO: 401,
  TOKEN_EXPIRADO: 401,
  ACCESO_DENEGADO: 403,
  USUARIO_RESTRINGIDO: 403,
  FUNCION_PREMIUM: 403,
  DOBLE_AUTORIZACION_REQUERIDA: 403,
  NO_ENCONTRADO: 404,
  MERCADO_CERRADO: 409,
  ORDEN_NO_CANCELABLE: 409,
  TRANSICION_INVALIDA: 409,
  CONFLICTO_IDEMPOTENCIA: 409,
  FONDOS_INSUFICIENTES: 422,
  ACCIONES_INSUFICIENTES: 422,
  LIMITE_DIARIO_EXCEDIDO: 422,
  DEMASIADAS_SOLICITUDES: 429,
  ERROR_INTERNO: 500,
  PROVEEDOR_NO_DISPONIBLE: 502,
  TIEMPO_AGOTADO: 504,
};

const redondear = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const hace = (ms) => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

// ------------------------------------------------------------------- estado

export const USUARIO_LAURA = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01";
const SISTEMA = { tipo: "SISTEMA", id: null };

const precioDe = (ticker) => ACCIONES.find((a) => a.ticker === ticker)?.precio ?? 0;

/** Entrada del historial: [Definido] estado, fecha, actor, motivo, precio de referencia, bid, ask y traceId. */
function entradaHistorial(estado, fecha, actor, motivo, ticker) {
  const precio = precioDe(ticker);
  return {
    estado,
    fecha,
    actor,
    motivo,
    precioReferencia: monto(precio),
    bid: monto(precio - 0.02),
    ask: monto(precio + 0.02),
    traceId: nuevoUuid(),
  };
}

function calcularTotales(lado, cantidad, precio) {
  const total = redondear(cantidad * precio);
  const comision = redondear((total * PORCENTAJE_COMISION) / 100);
  return {
    total,
    comision,
    totalDescontado: redondear(lado === "COMPRA" ? total + comision : total - comision),
  };
}

function semillas() {
  const laura = { tipo: "USUARIO", id: USUARIO_LAURA };
  const nueva = (n, ticker, lado, tipo, cantidad, precio, { estado, antes, motivos, extras }) => {
    const c = calcularTotales(lado, cantidad, precio);
    const creada = hace(antes);
    const historial = motivos.map(([est, desfase, actor, motivo]) =>
      entradaHistorial(est, hace(antes - desfase), actor, motivo, ticker)
    );
    return {
      id: `0a000000-0000-4000-8000-00000000000${n}`,
      usuarioId: USUARIO_LAURA,
      ticker,
      lado,
      tipo,
      cantidad,
      precioLimite: tipo === "LIMIT" ? monto(precio) : null,
      precioStop: null,
      precioEstimado: monto(precio),
      totalTransaccion: monto(c.total),
      comisionValor: c.comision,
      conComisionista: false,
      totalDescontado: c.totalDescontado,
      valorRestante: 0,
      estado,
      encolada: false,
      ejecuciones: [],
      validadaPor: null,
      validadaEn: null,
      creadaEn: creada,
      actualizadaEn: historial.at(-1).fecha,
      historial,
      ...extras,
    };
  };
  return [
    // Pendiente con fondos reservados: 344.31 + 2 % (6.89) = 351.20, el reservado del saldo demo.
    nueva(1, "MSFT", "COMPRA", "LIMIT", 1, 344.31, {
      estado: "PENDIENTE",
      antes: 2 * HORA,
      motivos: [["PENDIENTE", 0, laura, "Orden creada"]],
      extras: { valorRestante: 351.2 },
    }),
    nueva(2, "AAPL", "COMPRA", "MARKET", 10, 170.0, {
      estado: ESTADO_AL_EJECUTAR,
      antes: 20 * DIA,
      motivos: [[ESTADO_AL_EJECUTAR, 0, laura, "Orden creada"]],
      extras: {
        ejecuciones: [{ cantidad: 10, precio: "170.00", fecha: hace(20 * DIA - 4000) }],
      },
    }),
    nueva(3, "TSLA", "COMPRA", "LIMIT", 2, 240.0, {
      estado: "CANCELADA",
      antes: 9 * DIA,
      motivos: [
        ["PENDIENTE", 0, laura, "Orden creada"],
        ["CANCELADA", DIA, laura, "Cancelada por el usuario"],
      ],
    }),
    nueva(4, "XOM", "VENTA", "STOP_LOSS", 2, 100.0, {
      estado: "RECHAZADA",
      antes: 5 * DIA,
      motivos: [
        ["PENDIENTE", 0, laura, "Orden creada"],
        ["RECHAZADA", 60_000, SISTEMA, "Rechazada: precio stop fuera de rango"],
      ],
      extras: { precioStop: "100.00" },
    }),
    nueva(5, "NVDA", "COMPRA", "LIMIT", 1, 100.0, {
      estado: "EXPIRADA",
      antes: 12 * DIA,
      motivos: [
        ["PENDIENTE", 0, laura, "Orden creada"],
        ["EXPIRADA", 11 * DIA, SISTEMA, "Venció sin ejecutarse"],
      ],
    }),
    nueva(6, "AAPL", "VENTA", "LIMIT", 1, 190.0, {
      estado: "EN_REVISION",
      antes: 3 * HORA,
      motivos: [
        ["PENDIENTE", 0, laura, "Orden creada"],
        ["EN_REVISION", 60_000, SISTEMA, "En revisión por monto inusual"],
      ],
    }),
    nueva(7, "NVDA", "COMPRA", "MARKET", 1, 105.5, {
      estado: "FALLIDA",
      antes: 7 * DIA,
      motivos: [
        ["EN_EJECUCION", 0, laura, "Orden creada"],
        ["FALLIDA", 30_000, SISTEMA, "Falló el envío al proveedor"],
      ],
    }),
    nueva(8, "TSLA", "VENTA", "LIMIT", 1, 300.0, {
      estado: "DETENIDA",
      antes: 4 * DIA,
      motivos: [
        ["PENDIENTE", 0, laura, "Orden creada"],
        ["DETENIDA", HORA, SISTEMA, "Acción detenida por el mercado"],
      ],
    }),
  ];
}

const SALDOS_INICIALES = {
  [USUARIO_LAURA]: { disponible: 4250.0, reservado: 351.2 },
};

/** Estado de trading del mock; `db.trading` lo apunta y `db.reiniciar()` lo restablece. */
export function crearEstadoTrading() {
  return {
    ordenes: semillas(),
    /** `usuarioId:Idempotency-Key` → { huella, status, cuerpo } (única por cuenta, no expira). */
    idempotencia: new Map(),
    /** autorizacionId → { usuarioId, cuerpo, expira, resultado } (doble autorización). */
    autorizaciones: new Map(),
    saldos: JSON.parse(JSON.stringify(SALDOS_INICIALES)),
    /** usuarioId → ticker → { cantidad, precio } (cambios sobre las posiciones base). */
    tenencias: new Map(),
    /** null = según horario real; true/false fuerza el mercado abierto/cerrado. */
    mercadoForzado: null,
    /** ms que tarda una orden de mercado en ejecutarse completa. */
    ejecucionMs: 3000,
    /** Errores forzados: { codigo, status, veces, ruta? } */
    fallos: [],
    /** ms de latencia extra (para ver estados de carga). */
    latenciaExtraMs: 0,
  };
}

export const SALDO_VACIO = { disponible: 0, reservado: 0 };

export function saldoDe(trading, usuario) {
  if (usuario.cuentaVacia) return { ...SALDO_VACIO };
  return trading.saldos[usuario.id] ?? { ...SALDO_VACIO };
}

/** Saldo con la forma de GET /cuenta/saldo. */
export function vistaSaldo(trading, usuario) {
  const s = saldoDe(trading, usuario);
  return {
    disponible: monto(s.disponible),
    reservado: monto(s.reservado),
    total: monto(s.disponible + s.reservado),
  };
}

/** Aplica las ejecuciones del mock sobre la lista base de posiciones del usuario. */
export function aplicarTenencias(trading, usuario, base) {
  const cambios = trading.tenencias.get(usuario.id);
  if (!cambios?.size) return base;
  const mapa = new Map(base.map((p) => [p.activo, { ...p }]));
  for (const [ticker, c] of cambios) {
    const previa = mapa.get(ticker);
    const cantidad = (previa?.cantidad ?? 0) + c.cantidad;
    if (cantidad <= 0) {
      mapa.delete(ticker);
      continue;
    }
    // Compra: promedia el costo; venta: conserva el precio de compra.
    const costoPrevio = (previa?.cantidad ?? 0) * (previa?.precioCompra ?? 0);
    const precioCompra =
      c.cantidad > 0
        ? (costoPrevio + c.cantidad * c.precio) / cantidad
        : (previa?.precioCompra ?? 0);
    mapa.set(ticker, { activo: ticker, cantidad, precioCompra });
  }
  return [...mapa.values()];
}

function cantidadTenida(trading, usuario, posicionesBase, ticker) {
  const lista = aplicarTenencias(trading, usuario, usuario.cuentaVacia ? [] : posicionesBase);
  return lista.find((p) => p.activo === ticker)?.cantidad ?? 0;
}

// ----------------------------------------------------------------- cálculos

function resolverAccion(ticker) {
  return ACCIONES.find((a) => a.ticker === String(ticker ?? "").toUpperCase());
}

function validarSolicitud(cuerpo) {
  const detalles = [];
  const accion = resolverAccion(cuerpo.ticker);
  if (!cuerpo.ticker) detalles.push({ campo: "ticker", mensaje: "Es obligatorio." });
  else if (!accion) detalles.push({ campo: "ticker", mensaje: "El ticker no existe." });
  if (!LADOS.includes(cuerpo.lado))
    detalles.push({ campo: "lado", mensaje: "Debe ser COMPRA o VENTA." });
  if (!TIPOS.includes(cuerpo.tipo))
    detalles.push({ campo: "tipo", mensaje: `Debe ser uno de: ${TIPOS.join(", ")}.` });
  if (!Number.isInteger(cuerpo.cantidad) || cuerpo.cantidad < 1)
    detalles.push({ campo: "cantidad", mensaje: "Debe ser un entero mayor o igual a 1." });
  const positivo = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
  if (cuerpo.tipo === "LIMIT" && !positivo(cuerpo.precioLimite))
    detalles.push({ campo: "precioLimite", mensaje: "Obligatorio y positivo para órdenes LIMIT." });
  if (["STOP_LOSS", "TAKE_PROFIT"].includes(cuerpo.tipo) && !positivo(cuerpo.precioStop))
    detalles.push({ campo: "precioStop", mensaje: "Obligatorio y positivo para este tipo." });
  return { detalles, accion };
}

function calcular(cuerpo, accion) {
  const precio = cuerpo.tipo === "LIMIT" ? Number(cuerpo.precioLimite) : accion.precio;
  return { precio, ...calcularTotales(cuerpo.lado, cuerpo.cantidad, precio) };
}

/** [Definido] 60 % plataforma / 40 % comisionista si hay comisionista; si no, 100 % plataforma. */
function vistaComision(valor, conComisionista) {
  const comisionista = conComisionista ? redondear(valor * PARTE_COMISIONISTA) : 0;
  return {
    porcentaje: monto(PORCENTAJE_COMISION),
    valor: monto(valor),
    valorPlataforma: monto(valor - comisionista),
    valorComisionista: monto(comisionista),
  };
}

/** Prioridad: `ordenes.mercado()` (global) > `mercadoAbierto(codigo)` del panel > horario real. */
function estadoMercado(trading, accion, forzadoPorMercado = {}) {
  const estado = estadoDeMercado(MERCADOS.find((m) => m.codigo === accion.mercado));
  const abierto = trading.mercadoForzado ?? forzadoPorMercado[accion.mercado];
  if (abierto === undefined || abierto === null) return estado;
  return {
    ...estado,
    abierto,
    estado: abierto ? "ABIERTO" : "CERRADO",
    proximaApertura: abierto
      ? null
      : (estado.proximaApertura ?? new Date(Date.now() + 12 * HORA).toISOString()),
  };
}

// ------------------------------------------------------------ transiciones

const cantidadEjecutada = (orden) => orden.ejecuciones.reduce((s, e) => s + e.cantidad, 0);

function registrar(orden, estado, actor, motivo) {
  const entrada = entradaHistorial(estado, new Date().toISOString(), actor, motivo, orden.ticker);
  orden.estado = estado;
  orden.actualizadaEn = entrada.fecha;
  orden.historial.push(entrada);
}

/** Devuelve a disponible lo que una compra tenía reservado. */
function liberarReserva(trading, orden) {
  let liberado = 0;
  if (orden.lado === "COMPRA" && orden.valorRestante > 0) {
    liberado = orden.valorRestante;
    const saldo = trading.saldos[orden.usuarioId];
    if (saldo) {
      saldo.reservado = redondear(Math.max(0, saldo.reservado - liberado));
      saldo.disponible = redondear(saldo.disponible + liberado);
    }
  }
  orden.valorRestante = 0;
  return liberado;
}

/** Ejecuta `cantidad` acciones de la orden: mueve saldo y posición y deja la ejecución aparte. */
function ejecutarTramo(trading, orden, cantidad) {
  const accion = resolverAccion(orden.ticker);
  const precio = orden.tipo === "LIMIT" ? Number(orden.precioLimite) : accion.precio;
  const pendiente = orden.cantidad - cantidadEjecutada(orden);
  const qty = Math.min(cantidad, pendiente);
  if (qty <= 0) return 0;
  const saldo = trading.saldos[orden.usuarioId];
  const completa = qty === pendiente;
  const parte = completa
    ? orden.valorRestante
    : redondear((orden.totalDescontado * qty) / orden.cantidad);
  orden.valorRestante = redondear(orden.valorRestante - parte);

  const cambios = trading.tenencias.get(orden.usuarioId) ?? new Map();
  const previo = cambios.get(orden.ticker) ?? { cantidad: 0, precio: 0 };
  if (orden.lado === "COMPRA") {
    if (saldo) saldo.reservado = redondear(Math.max(0, saldo.reservado - parte));
    cambios.set(orden.ticker, { cantidad: previo.cantidad + qty, precio });
  } else {
    if (saldo) saldo.disponible = redondear(saldo.disponible + parte);
    cambios.set(orden.ticker, { cantidad: previo.cantidad - qty, precio: previo.precio });
  }
  trading.tenencias.set(orden.usuarioId, cambios);

  orden.ejecuciones.push({ cantidad: qty, precio: monto(precio), fecha: new Date().toISOString() });
  if (orden.estado !== ESTADO_AL_EJECUTAR) {
    registrar(orden, ESTADO_AL_EJECUTAR, SISTEMA, completa ? "Ejecutada" : "Ejecución parcial");
  } else {
    orden.actualizadaEn = new Date().toISOString();
  }
  return qty;
}

/** Avanza por tiempo: una orden EN_EJECUCION sin ejecuciones se ejecuta completa tras `ejecucionMs`. */
export function avanzarOrdenes(trading) {
  const ahora = Date.now();
  for (const orden of trading.ordenes) {
    if (
      orden.estado === "EN_EJECUCION" &&
      orden.ejecuciones.length === 0 &&
      ahora - Date.parse(orden.actualizadaEn) >= trading.ejecucionMs
    ) {
      ejecutarTramo(trading, orden, orden.cantidad);
    }
  }
}

const EJECUTABLES = new Set(["PENDIENTE", "ENVIADA", "EN_EJECUCION"]);

/** Ejecuta ya lo que falte de las órdenes PENDIENTE, ENVIADA y EN_EJECUCION. Devuelve cuántas. */
export function ejecutarPendientes(trading) {
  let n = 0;
  for (const orden of trading.ordenes) {
    if (EJECUTABLES.has(orden.estado) && ejecutarTramo(trading, orden, orden.cantidad) > 0) n += 1;
  }
  return n;
}

/** Ejecuta la mitad (mínimo 1) de la primera orden ejecutable con 2+ acciones por ejecutar. */
export function ejecutarParcial(trading) {
  const orden = trading.ordenes.find(
    (o) => EJECUTABLES.has(o.estado) && o.cantidad - cantidadEjecutada(o) >= 2
  );
  if (!orden) return 0;
  return ejecutarTramo(trading, orden, Math.floor((orden.cantidad - cantidadEjecutada(orden)) / 2));
}

/** Fuerza el estado de una orden (para ver las 10 variantes en pantalla). */
export function forzarEstado(trading, id, estado, motivo = "Estado forzado desde el mock") {
  const orden = trading.ordenes.find((o) => o.id === id);
  if (!orden) return false;
  if (!ESTADOS_ORDEN.includes(estado)) throw new Error(`Estado desconocido: ${estado}`);
  if (LIBERAN_FONDOS.has(estado)) liberarReserva(trading, orden);
  registrar(orden, estado, SISTEMA, motivo);
  return true;
}

// -------------------------------------------------------------------- vistas

function vistaOrden(orden) {
  const ejecutada = cantidadEjecutada(orden);
  const importe = orden.ejecuciones.reduce((s, e) => s + e.cantidad * Number(e.precio), 0);
  return {
    id: orden.id,
    ticker: orden.ticker,
    lado: orden.lado,
    tipo: orden.tipo,
    cantidad: orden.cantidad,
    precioLimite: orden.precioLimite,
    precioStop: orden.precioStop,
    precioEstimado: orden.precioEstimado,
    cantidadEjecutada: ejecutada,
    precioEjecucion: ejecutada ? monto(importe / ejecutada) : null,
    ejecuciones: orden.ejecuciones,
    totalTransaccion: orden.totalTransaccion,
    comision: vistaComision(orden.comisionValor, orden.conComisionista),
    totalDescontado: monto(orden.totalDescontado),
    estado: orden.estado,
    encolada: orden.encolada,
    validadaPor: orden.validadaPor,
    validadaEn: orden.validadaEn,
    creadaEn: orden.creadaEn,
    actualizadaEn: orden.actualizadaEn,
  };
}

// ----------------------------------------------------------------- handlers

/**
 * Crea los handlers de órdenes. Recibe los helpers del módulo de handlers para evitar una
 * importación circular (handlers.js importa este archivo).
 */
export function crearHandlersOrdenes({ db, error, protegido, leerCuerpo, pagina, posicionesBase }) {
  const trading = () => db.trading;
  const CON_ORDENES = ["INVERSIONISTA"];

  /** Aplica latencia extra y errores forzados antes del resolver real. */
  const conSimulacion = (resolver) => async (contexto) => {
    const t = trading();
    if (t.latenciaExtraMs) await new Promise((r) => setTimeout(r, t.latenciaExtraMs));
    const camino = new URL(contexto.request.url).pathname;
    const indice = t.fallos.findIndex((f) => !f.ruta || camino.endsWith(f.ruta));
    if (indice >= 0) {
      const fallo = t.fallos[indice];
      fallo.veces -= 1;
      if (fallo.veces <= 0) t.fallos.splice(indice, 1);
      return error(contexto.request, fallo.status, fallo.codigo, fallo.mensaje, {
        datos: fallo.datos,
      });
    }
    return resolver(contexto);
  };
  const ruta = (roles, resolver) => protegido(roles, (ctx) => conSimulacion(resolver)(ctx));

  const ordenDelUsuario = (usuario, id) =>
    trading().ordenes.find((o) => o.id === id && o.usuarioId === usuario.id);

  /** [Propuesta] Orden de otro usuario: 404, para no revelar que existe. */
  const noEncontrada = (request) =>
    error(request, 404, "NO_ENCONTRADO", "La orden no existe o no te pertenece.");

  /** Validaciones de negocio previas a crear. Devuelve `{ respuesta }` o `{ accion, c, mercado }`. */
  function verificar(request, usuario, cuerpo) {
    const t = trading();
    const { detalles, accion } = validarSolicitud(cuerpo);
    if (detalles.length) {
      return {
        respuesta: error(request, 400, "VALIDACION_FALLIDA", "Revisa los datos de la orden.", {
          detalles,
        }),
      };
    }
    const c = calcular(cuerpo, accion);
    const mercado = estadoMercado(t, accion, db.simulacion?.mercadoAbierto);
    const saldo = t.saldos[usuario.id] ?? { disponible: 0, reservado: 0 };
    const compra = cuerpo.lado === "COMPRA";

    if (!mercado.abierto && cuerpo.confirmarEncolamiento !== true) {
      return {
        respuesta: error(
          request,
          409,
          "MERCADO_CERRADO",
          `El mercado ${accion.mercado} está cerrado.`,
          { datos: { mercado: accion.mercado, proximaApertura: mercado.proximaApertura } }
        ),
      };
    }
    if (compra && saldo.disponible < c.totalDescontado) {
      return {
        respuesta: error(request, 422, "FONDOS_INSUFICIENTES", "No tienes fondos suficientes."),
      };
    }
    if (!compra && cantidadTenida(t, usuario, posicionesBase, accion.ticker) < cuerpo.cantidad) {
      return {
        respuesta: error(request, 422, "ACCIONES_INSUFICIENTES", "No tienes suficientes acciones."),
      };
    }
    const op = usuario.preferencias?.operaciones ?? {};
    const hoy = new Date().toDateString();
    const usadoHoy = t.ordenes
      .filter(
        (o) =>
          o.usuarioId === usuario.id &&
          !LIBERAN_FONDOS.has(o.estado) &&
          new Date(o.creadaEn).toDateString() === hoy
      )
      .reduce((s, o) => s + Number(o.totalTransaccion), 0);
    if (op.limiteDiario && usadoHoy + c.total > Number(op.limiteDiario)) {
      return {
        respuesta: error(
          request,
          422,
          "LIMITE_DIARIO_EXCEDIDO",
          "Superas tu límite diario de operación.",
          { datos: { limiteDiario: op.limiteDiario, usadoHoy: monto(usadoHoy) } }
        ),
      };
    }
    return { accion, c, mercado, compra, op };
  }

  /** Crea la orden, reserva fondos y arma la respuesta 201. */
  function registrarOrden(request, usuario, cuerpo, { accion, c, mercado, compra }, validacion) {
    const t = trading();
    const ahora = new Date().toISOString();
    const encolada = !mercado.abierto;
    const enEjecucion = cuerpo.tipo === "MARKET" && !encolada;
    const estado = enEjecucion ? "EN_EJECUCION" : "PENDIENTE";
    const orden = {
      id: nuevoUuid(),
      usuarioId: usuario.id,
      ticker: accion.ticker,
      lado: cuerpo.lado,
      tipo: cuerpo.tipo,
      cantidad: cuerpo.cantidad,
      precioLimite: cuerpo.tipo === "LIMIT" ? monto(cuerpo.precioLimite) : null,
      precioStop: ["STOP_LOSS", "TAKE_PROFIT"].includes(cuerpo.tipo)
        ? monto(cuerpo.precioStop)
        : null,
      precioEstimado: monto(c.precio),
      totalTransaccion: monto(c.total),
      comisionValor: c.comision,
      conComisionista: Boolean(usuario.comisionista),
      totalDescontado: c.totalDescontado,
      valorRestante: c.totalDescontado,
      estado,
      encolada,
      ejecuciones: [],
      validadaPor: validacion?.por ?? null,
      validadaEn: validacion?.en ?? null,
      creadaEn: ahora,
      actualizadaEn: ahora,
      historial: [],
    };
    orden.historial.push(
      entradaHistorial(
        estado,
        ahora,
        { tipo: "USUARIO", id: usuario.id },
        encolada ? "Orden encolada hasta la apertura del mercado" : "Orden creada",
        accion.ticker
      )
    );
    if (compra) {
      const saldo = t.saldos[usuario.id] ?? { disponible: 0, reservado: 0 };
      saldo.disponible = redondear(saldo.disponible - c.totalDescontado);
      saldo.reservado = redondear(saldo.reservado + c.totalDescontado);
      t.saldos[usuario.id] = saldo;
    }
    t.ordenes.unshift(orden);
    const traceId = request.headers.get("X-Trace-Id") ?? nuevoUuid();
    return {
      id: orden.id,
      estado,
      encolada,
      totalTransaccion: orden.totalTransaccion,
      comision: vistaComision(c.comision, orden.conComisionista),
      totalDescontado: monto(c.totalDescontado),
      creadaEn: ahora,
      traceId,
    };
  }

  return [
    rest.post(
      `${RAIZ}/ordenes/simulacion`,
      ruta(["INVERSIONISTA", "COMISIONISTA"], async ({ request, usuario }) => {
        const cuerpo = await leerCuerpo(request);
        const { detalles, accion } = validarSolicitud(cuerpo);
        if (detalles.length) {
          return error(request, 400, "VALIDACION_FALLIDA", "Revisa los datos de la orden.", {
            detalles,
          });
        }
        const c = calcular(cuerpo, accion);
        const mercado = estadoMercado(trading(), accion, db.simulacion?.mercadoAbierto);
        const saldo = saldoDe(trading(), usuario);
        const fondosSuficientes =
          cuerpo.lado === "COMPRA"
            ? saldo.disponible >= c.totalDescontado
            : cantidadTenida(trading(), usuario, posicionesBase, accion.ticker) >= cuerpo.cantidad;
        return HttpResponse.json({
          precioEstimado: monto(c.precio),
          totalTransaccion: monto(c.total),
          comision: vistaComision(c.comision, Boolean(usuario.comisionista)),
          totalADescontar: monto(c.totalDescontado),
          fondosSuficientes,
          mercadoAbierto: mercado.abierto,
          proximaApertura: mercado.proximaApertura,
        });
      })
    ),

    rest.post(
      `${RAIZ}/ordenes`,
      ruta(CON_ORDENES, async ({ request, usuario }) => {
        const t = trading();
        const clave = request.headers.get("Idempotency-Key");
        if (!clave) {
          return error(request, 400, "VALIDACION_FALLIDA", "Falta la cabecera Idempotency-Key.", {
            detalles: [{ campo: "Idempotency-Key", mensaje: "Es obligatoria." }],
          });
        }
        const cuerpo = await leerCuerpo(request);
        const huella = JSON.stringify(cuerpo);
        const llave = `${usuario.id}:${clave}`;
        // [Definido] la clave es única por cuenta y no expira; [Propuesta] misma clave + mismo
        // cuerpo devuelve la misma respuesta; con otro cuerpo, 409.
        const previa = t.idempotencia.get(llave);
        if (previa) {
          if (previa.huella !== huella) {
            return error(
              request,
              409,
              "CONFLICTO_IDEMPOTENCIA",
              "La Idempotency-Key ya se usó con otra solicitud."
            );
          }
          return HttpResponse.json(previa.cuerpo, { status: previa.status });
        }

        const verificacion = verificar(request, usuario, cuerpo);
        if (verificacion.respuesta) return verificacion.respuesta;
        const { c, op } = verificacion;

        // [Propuesta] Orden grande con doble autorización: 202 y se confirma en /ordenes/autorizar.
        if (op.dobleAutorizacion && c.total >= Number(op.umbralOrdenGrande ?? Infinity)) {
          const autorizacionId = nuevoUuid();
          t.autorizaciones.set(autorizacionId, {
            usuarioId: usuario.id,
            cuerpo,
            llave,
            expira: Date.now() + VIGENCIA_AUTORIZACION_MS,
            resultado: null,
          });
          const pendiente = { requiereAutorizacion: true, autorizacionId };
          t.idempotencia.set(llave, { huella, status: 202, cuerpo: pendiente });
          return HttpResponse.json(pendiente, { status: 202 });
        }

        const respuesta = registrarOrden(request, usuario, cuerpo, verificacion);
        t.idempotencia.set(llave, { huella, status: 201, cuerpo: respuesta });
        return HttpResponse.json(respuesta, {
          status: 201,
          headers: { "X-Trace-Id": respuesta.traceId },
        });
      })
    ),

    /** [Propuesta] Confirma una orden pendiente de doble autorización. */
    rest.post(
      `${RAIZ}/ordenes/autorizar`,
      ruta(CON_ORDENES, async ({ request, usuario }) => {
        const t = trading();
        const cuerpo = await leerCuerpo(request);
        const detalles = [];
        if (!cuerpo.autorizacionId)
          detalles.push({ campo: "autorizacionId", mensaje: "Es obligatorio." });
        if (!cuerpo.codigoAutorizacion)
          detalles.push({ campo: "codigoAutorizacion", mensaje: "Es obligatorio." });
        if (detalles.length) {
          return error(request, 400, "VALIDACION_FALLIDA", "Revisa los datos.", { detalles });
        }
        const auth = t.autorizaciones.get(cuerpo.autorizacionId);
        if (!auth || auth.usuarioId !== usuario.id) {
          return error(request, 404, "NO_ENCONTRADO", "La autorización no existe.");
        }
        if (auth.resultado) return HttpResponse.json(auth.resultado, { status: 201 });
        // ⚠ El backend solo dijo «422»; el código del error no está definido.
        if (auth.expira <= Date.now() || cuerpo.codigoAutorizacion !== CODIGO_AUTORIZACION_VALIDO) {
          return error(
            request,
            422,
            "CODIGO_AUTORIZACION_INVALIDO",
            "El código de autorización es inválido o venció."
          );
        }
        const verificacion = verificar(request, usuario, auth.cuerpo);
        if (verificacion.respuesta) return verificacion.respuesta;
        const respuesta = registrarOrden(request, usuario, auth.cuerpo, verificacion, {
          por: usuario.id,
          en: new Date().toISOString(),
        });
        auth.resultado = respuesta;
        const guardada = t.idempotencia.get(auth.llave);
        if (guardada) Object.assign(guardada, { status: 201, cuerpo: respuesta });
        return HttpResponse.json(respuesta, {
          status: 201,
          headers: { "X-Trace-Id": respuesta.traceId },
        });
      })
    ),

    rest.get(
      `${RAIZ}/ordenes`,
      ruta(CON_ORDENES, async ({ request, usuario }) => {
        avanzarOrdenes(trading());
        const url = new URL(request.url);
        const q = (n) => url.searchParams.get(n);
        const desde = q("desde") ? Date.parse(q("desde")) : null;
        const hasta = q("hasta") ? Date.parse(q("hasta")) : null;
        if ((q("desde") && Number.isNaN(desde)) || (q("hasta") && Number.isNaN(hasta))) {
          return error(request, 400, "VALIDACION_FALLIDA", "Fechas inválidas.", {
            detalles: [{ campo: "desde/hasta", mensaje: "Usa formato ISO 8601." }],
          });
        }
        const lista = trading()
          .ordenes.filter((o) => o.usuarioId === usuario.id)
          .filter((o) => !q("estado") || o.estado === q("estado"))
          .filter((o) => !q("ticker") || o.ticker === q("ticker").toUpperCase())
          .filter((o) => !q("lado") || o.lado === q("lado"))
          .filter((o) => desde === null || Date.parse(o.creadaEn) >= desde)
          .filter((o) => hasta === null || Date.parse(o.creadaEn) <= hasta)
          .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn))
          .map(vistaOrden);
        return HttpResponse.json(pagina(lista, url));
      })
    ),

    rest.get(
      `${RAIZ}/ordenes/:id/historial`,
      ruta(CON_ORDENES, async ({ request, usuario, params }) => {
        avanzarOrdenes(trading());
        const orden = ordenDelUsuario(usuario, params.id);
        if (!orden) return noEncontrada(request);
        // [Propuesta] de la entrada más antigua a la más reciente.
        return HttpResponse.json({ ordenId: orden.id, estados: orden.historial });
      })
    ),

    rest.get(
      `${RAIZ}/ordenes/:id`,
      ruta(CON_ORDENES, async ({ request, usuario, params }) => {
        avanzarOrdenes(trading());
        const orden = ordenDelUsuario(usuario, params.id);
        if (!orden) return noEncontrada(request);
        return HttpResponse.json(vistaOrden(orden));
      })
    ),

    rest.post(
      `${RAIZ}/ordenes/:id/cancelar`,
      ruta(CON_ORDENES, async ({ request, usuario, params }) => {
        const t = trading();
        avanzarOrdenes(t);
        const orden = ordenDelUsuario(usuario, params.id);
        if (!orden) return noEncontrada(request);
        if (!CANCELABLES.has(orden.estado)) {
          return error(
            request,
            409,
            "ORDEN_NO_CANCELABLE",
            `Una orden en estado ${orden.estado} no se puede cancelar.`,
            { datos: { estado: orden.estado } }
          );
        }
        const liberado = liberarReserva(t, orden);
        registrar(
          orden,
          "CANCELADA",
          { tipo: "USUARIO", id: usuario.id },
          "Cancelada por el usuario"
        );
        return HttpResponse.json({
          id: orden.id,
          estado: "CANCELADA",
          saldoLiberado: monto(liberado),
          traceId: request.headers.get("X-Trace-Id") ?? nuevoUuid(),
        });
      })
    ),
  ];
}

/** Utilidades de consola `window.__mock.ordenes` (y para pruebas). */
export function utilidadesOrdenes(db) {
  return {
    /**
     * Fuerza TODOS los mercados: true abierto, false cerrado, null horario real. Afecta a la vez la
     * simulación, la creación y el estado de mercado que ve el panel (`mercadoAbierto(codigo)`).
     */
    mercado: (abierto) => {
      db.trading.mercadoForzado = abierto;
      for (const m of MERCADOS) {
        if (abierto === null) delete db.simulacion.mercadoAbierto[m.codigo];
        else db.simulacion.mercadoAbierto[m.codigo] = abierto;
      }
    },
    /** Ejecuta ya lo que falte de las órdenes pendientes y en ejecución. Devuelve cuántas. */
    ejecutarPendientes: () => ejecutarPendientes(db.trading),
    /** Ejecuta la mitad de una orden (ejecución parcial). Devuelve las acciones ejecutadas. */
    ejecutarParcial: () => ejecutarParcial(db.trading),
    /** Fuerza el estado de una orden por id (uno de los 10 estados). */
    estado: (id, estado, motivo) => forzarEstado(db.trading, id, estado, motivo),
    /** Ids de las órdenes con su estado, para usar con `estado()`. */
    listar: () => db.trading.ordenes.map((o) => ({ id: o.id, ticker: o.ticker, estado: o.estado })),
    /**
     * La siguiente(s) `veces` llamada(s) fallan con ese código del catálogo. `ruta` (opcional) es
     * el final de la ruta, p. ej. "/ordenes" (no afecta a "/ordenes/simulacion") o "/notificaciones".
     */
    fallar: (codigo, { veces = 1, ruta, mensaje } = {}) => {
      db.trading.fallos.push({
        codigo,
        status: STATUS_POR_CODIGO[codigo] ?? 500,
        veces,
        ruta,
        mensaje: mensaje ?? `Error simulado: ${codigo}.`,
      });
    },
    /** Latencia extra en ms para ver estados de carga. 0 la quita. */
    latencia: (ms) => {
      db.trading.latenciaExtraMs = ms;
    },
    /** Quita errores y latencia forzados. */
    limpiar: () => {
      db.trading.fallos = [];
      db.trading.latenciaExtraMs = 0;
    },
  };
}
