import { HttpResponse, http as rest } from "msw";
import { nuevoUuid } from "../api/httpClient.js";
import { ACCIONES, estadoDeMercado, MERCADOS, monto } from "./mercadosData.js";

/**
 * Mock de órdenes (SCRUM-35). Estado en memoria, coherente con saldo y portafolio:
 * crear una compra reserva fondos, ejecutarla mueve el saldo y la posición, cancelarla libera.
 *
 * Las formas de respuesta de simulación, creación y cancelación siguen el contrato acordado.
 * Las de las listas (GET /ordenes e historial) y los estados intermedios NO están en el contrato:
 * son supuestos documentados en docs/trading-mock.md para que backend los valide.
 */

const RAIZ = "*/api/v1";
const PORCENTAJE_COMISION = 0.5;
export const CODIGO_AUTORIZACION_VALIDO = "654321";
const TIPOS = ["MARKET", "LIMIT", "STOP_LOSS", "TAKE_PROFIT"];
const LADOS = ["COMPRA", "VENTA"];
/** Estados desde los que sí se puede cancelar. */
const CANCELABLES = new Set(["PENDIENTE"]);

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

/** Nueve campos de una orden + historial de estados. */
function crearOrdenBase(datos, historial) {
  return { ...datos, historial };
}

function semillas() {
  const sistema = { tipo: "SISTEMA", nombre: "Motor de órdenes" };
  const laura = { tipo: "USUARIO", nombre: "Laura" };
  const calcular = (lado, cantidad, precio) => {
    const total = redondear(cantidad * precio);
    const comision = redondear((total * PORCENTAJE_COMISION) / 100);
    return { total, comision, descontado: lado === "COMPRA" ? total + comision : total - comision };
  };
  const nueva = (id, ticker, lado, tipo, cantidad, precio, extras, historial) => {
    const c = calcular(lado, cantidad, precio);
    return crearOrdenBase(
      {
        id,
        usuarioId: USUARIO_LAURA,
        ticker,
        lado,
        tipo,
        cantidad,
        precioLimite: tipo === "LIMIT" ? monto(precio) : null,
        precioStop: null,
        precioEstimado: monto(precio),
        precioEjecucion: null,
        totalTransaccion: monto(c.total),
        comisionValor: c.comision,
        totalDescontado: redondear(c.descontado),
        encolada: false,
        saldoLiberado: "0.00",
        reservado: false,
        ...extras,
      },
      historial
    );
  };
  return [
    nueva(
      "0a000000-0000-4000-8000-000000000001",
      "MSFT",
      "COMPRA",
      "LIMIT",
      1,
      349.45,
      {
        estado: "PENDIENTE",
        creadaEn: hace(2 * HORA),
        actualizadaEn: hace(2 * HORA),
        reservado: true,
      },
      [{ estado: "PENDIENTE", fecha: hace(2 * HORA), actor: laura, motivo: "Orden creada" }]
    ),
    nueva(
      "0a000000-0000-4000-8000-000000000002",
      "AAPL",
      "COMPRA",
      "MARKET",
      10,
      170.0,
      {
        estado: "EJECUTADA",
        precioEjecucion: "170.00",
        creadaEn: hace(20 * DIA),
        actualizadaEn: hace(20 * DIA),
      },
      [
        { estado: "EN_EJECUCION", fecha: hace(20 * DIA), actor: laura, motivo: "Orden creada" },
        {
          estado: "EJECUTADA",
          fecha: hace(20 * DIA - 4000),
          actor: sistema,
          motivo: "Ejecutada a precio de mercado",
        },
      ]
    ),
    nueva(
      "0a000000-0000-4000-8000-000000000003",
      "TSLA",
      "COMPRA",
      "LIMIT",
      2,
      240.0,
      {
        estado: "CANCELADA",
        creadaEn: hace(9 * DIA),
        actualizadaEn: hace(8 * DIA),
        saldoLiberado: "482.40",
      },
      [
        { estado: "PENDIENTE", fecha: hace(9 * DIA), actor: laura, motivo: "Orden creada" },
        {
          estado: "CANCELADA",
          fecha: hace(8 * DIA),
          actor: laura,
          motivo: "Cancelada por el usuario",
        },
      ]
    ),
    nueva(
      "0a000000-0000-4000-8000-000000000004",
      "XOM",
      "VENTA",
      "STOP_LOSS",
      2,
      100.0,
      {
        estado: "RECHAZADA",
        precioStop: "100.00",
        creadaEn: hace(5 * DIA),
        actualizadaEn: hace(5 * DIA),
      },
      [
        { estado: "PENDIENTE", fecha: hace(5 * DIA), actor: laura, motivo: "Orden creada" },
        {
          estado: "RECHAZADA",
          fecha: hace(5 * DIA - 60_000),
          actor: sistema,
          motivo: "Rechazada por el proveedor: precio stop fuera de rango",
        },
      ]
    ),
  ];
}

const SALDOS_INICIALES = {
  [USUARIO_LAURA]: { disponible: 4250.0, reservado: 351.2 },
};

/** Estado de trading del mock; `db.trading` lo apunta y `db.reiniciar()` lo restablece. */
export function crearEstadoTrading() {
  return {
    ordenes: semillas(),
    /** Idempotency-Key → { huella, cuerpo } */
    idempotencia: new Map(),
    saldos: JSON.parse(JSON.stringify(SALDOS_INICIALES)),
    /** usuarioId → ticker → { cantidad, precioCompra } (cambios sobre las posiciones base). */
    tenencias: new Map(),
    /** null = según horario real; true/false fuerza el mercado abierto/cerrado. */
    mercadoForzado: null,
    /** ms que tarda una orden de mercado en pasar de EN_EJECUCION a EJECUTADA. */
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
  const total = redondear(cuerpo.cantidad * precio);
  const comision = redondear((total * PORCENTAJE_COMISION) / 100);
  const compra = cuerpo.lado === "COMPRA";
  return {
    precio,
    total,
    comision,
    totalADescontar: redondear(compra ? total + comision : total - comision),
  };
}

function vistaComision(valor) {
  return {
    porcentaje: monto(PORCENTAJE_COMISION),
    valor: monto(valor),
    valorPlataforma: monto(valor),
    valorComisionista: "0.00",
  };
}

function mercadoDe(accion) {
  const mercado = MERCADOS.find((m) => m.codigo === accion.mercado);
  return mercado;
}

/** Prioridad: `ordenes.mercado()` (global) > `mercadoAbierto(codigo)` del panel > horario real. */
function estadoMercado(trading, accion, forzadoPorMercado = {}) {
  const estado = estadoDeMercado(mercadoDe(accion));
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

function registrar(orden, estado, actor, motivo) {
  const fecha = new Date().toISOString();
  orden.estado = estado;
  orden.actualizadaEn = fecha;
  orden.historial.push({ estado, fecha, actor, motivo });
}

const SISTEMA = { tipo: "SISTEMA", nombre: "Motor de órdenes" };

function ejecutar(trading, orden, usuario) {
  const saldo = trading.saldos[orden.usuarioId];
  const accion = resolverAccion(orden.ticker);
  const precio = orden.tipo === "LIMIT" ? Number(orden.precioLimite) : accion.precio;
  const cambios = trading.tenencias.get(orden.usuarioId) ?? new Map();
  const previo = cambios.get(orden.ticker) ?? { cantidad: 0, precio: 0 };
  if (orden.lado === "COMPRA") {
    if (saldo) saldo.reservado = redondear(Math.max(0, saldo.reservado - orden.totalDescontado));
    cambios.set(orden.ticker, {
      cantidad: previo.cantidad + orden.cantidad,
      precio: precio,
    });
  } else {
    if (saldo) saldo.disponible = redondear(saldo.disponible + orden.totalDescontado);
    cambios.set(orden.ticker, {
      cantidad: previo.cantidad - orden.cantidad,
      precio: previo.precio,
    });
  }
  trading.tenencias.set(orden.usuarioId, cambios);
  orden.reservado = false;
  orden.precioEjecucion = monto(precio);
  registrar(orden, "EJECUTADA", SISTEMA, "Ejecutada a precio de mercado");
  void usuario;
}

/** Avanza lo que corresponda por tiempo: EN_EJECUCION → EJECUTADA pasado `ejecucionMs`. */
export function avanzarOrdenes(trading) {
  const ahora = Date.now();
  for (const orden of trading.ordenes) {
    if (
      orden.estado === "EN_EJECUCION" &&
      ahora - Date.parse(orden.actualizadaEn) >= trading.ejecucionMs
    ) {
      ejecutar(trading, orden);
    }
  }
}

/** Ejecuta ya las órdenes PENDIENTE / EN_EJECUCION del mock (para demos y pruebas). */
export function ejecutarPendientes(trading) {
  let n = 0;
  for (const orden of trading.ordenes) {
    if (["PENDIENTE", "EN_EJECUCION"].includes(orden.estado)) {
      ejecutar(trading, orden);
      n += 1;
    }
  }
  return n;
}

// -------------------------------------------------------------------- vistas

function vistaOrden(orden) {
  return {
    id: orden.id,
    ticker: orden.ticker,
    lado: orden.lado,
    tipo: orden.tipo,
    cantidad: orden.cantidad,
    precioLimite: orden.precioLimite,
    precioStop: orden.precioStop,
    precioEstimado: orden.precioEstimado,
    precioEjecucion: orden.precioEjecucion,
    totalTransaccion: orden.totalTransaccion,
    comision: vistaComision(orden.comisionValor),
    totalDescontado: monto(orden.totalDescontado),
    estado: orden.estado,
    encolada: orden.encolada,
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
  const conSimulacion = (ruta, resolver) => async (contexto) => {
    const t = trading();
    if (t.latenciaExtraMs) await new Promise((r) => setTimeout(r, t.latenciaExtraMs));
    const indice = t.fallos.findIndex((f) => !f.ruta || contexto.request.url.includes(f.ruta));
    if (indice >= 0) {
      const fallo = t.fallos[indice];
      fallo.veces -= 1;
      if (fallo.veces <= 0) t.fallos.splice(indice, 1);
      return error(contexto.request, fallo.status, fallo.codigo, fallo.mensaje, {
        datos: fallo.datos,
      });
    }
    void ruta;
    return resolver(contexto);
  };

  const ordenDelUsuario = (usuario, id) =>
    trading().ordenes.find((o) => o.id === id && o.usuarioId === usuario.id);

  const noEncontrada = (request) =>
    error(request, 404, "NO_ENCONTRADO", "La orden no existe o no te pertenece.");

  return [
    rest.post(
      `${RAIZ}/ordenes/simulacion`,
      protegido(["INVERSIONISTA", "COMISIONISTA"], (ctx) =>
        conSimulacion("simulacion", async ({ request, usuario }) => {
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
              ? saldo.disponible >= c.totalADescontar
              : cantidadTenida(trading(), usuario, posicionesBase, accion.ticker) >=
                cuerpo.cantidad;
          return HttpResponse.json({
            precioEstimado: monto(c.precio),
            totalTransaccion: monto(c.total),
            comision: vistaComision(c.comision),
            totalADescontar: monto(c.totalADescontar),
            fondosSuficientes,
            mercadoAbierto: mercado.abierto,
            proximaApertura: mercado.proximaApertura,
          });
        })(ctx)
      )
    ),

    rest.post(
      `${RAIZ}/ordenes`,
      protegido(CON_ORDENES, (ctx) =>
        conSimulacion("crear", async ({ request, usuario }) => {
          const t = trading();
          const clave = request.headers.get("Idempotency-Key");
          if (!clave) {
            return error(request, 400, "VALIDACION_FALLIDA", "Falta la cabecera Idempotency-Key.", {
              detalles: [{ campo: "Idempotency-Key", mensaje: "Es obligatoria." }],
            });
          }
          const cuerpo = await leerCuerpo(request);
          const huella = JSON.stringify(cuerpo);
          const previa = t.idempotencia.get(`${usuario.id}:${clave}`);
          if (previa) {
            if (previa.huella !== huella) {
              return error(
                request,
                409,
                "CONFLICTO_IDEMPOTENCIA",
                "La Idempotency-Key ya se usó con otra solicitud."
              );
            }
            return HttpResponse.json(previa.cuerpo, { status: 201 });
          }

          const { detalles, accion } = validarSolicitud(cuerpo);
          if (detalles.length) {
            return error(request, 400, "VALIDACION_FALLIDA", "Revisa los datos de la orden.", {
              detalles,
            });
          }
          const c = calcular(cuerpo, accion);
          const mercado = estadoMercado(t, accion, db.simulacion?.mercadoAbierto);
          const saldo = t.saldos[usuario.id] ?? { disponible: 0, reservado: 0 };
          const compra = cuerpo.lado === "COMPRA";

          if (!mercado.abierto && cuerpo.confirmarEncolamiento !== true) {
            return error(
              request,
              409,
              "MERCADO_CERRADO",
              `El mercado ${accion.mercado} está cerrado.`,
              {
                datos: { mercado: accion.mercado, proximaApertura: mercado.proximaApertura },
              }
            );
          }
          const op = usuario.preferencias?.operaciones ?? {};
          if (
            op.dobleAutorizacion &&
            c.total >= Number(op.umbralOrdenGrande ?? Infinity) &&
            cuerpo.codigoAutorizacion !== CODIGO_AUTORIZACION_VALIDO
          ) {
            return error(
              request,
              403,
              "DOBLE_AUTORIZACION_REQUERIDA",
              "Esta orden supera el umbral y requiere un código de autorización."
            );
          }
          if (compra && saldo.disponible < c.totalADescontar) {
            return error(request, 422, "FONDOS_INSUFICIENTES", "No tienes fondos suficientes.");
          }
          if (!compra) {
            const tenidas = cantidadTenida(t, usuario, posicionesBase, accion.ticker);
            if (tenidas < cuerpo.cantidad) {
              return error(
                request,
                422,
                "ACCIONES_INSUFICIENTES",
                "No tienes suficientes acciones."
              );
            }
          }
          const hoy = new Date().toDateString();
          const usadoHoy = t.ordenes
            .filter(
              (o) =>
                o.usuarioId === usuario.id &&
                !["CANCELADA", "RECHAZADA"].includes(o.estado) &&
                new Date(o.creadaEn).toDateString() === hoy
            )
            .reduce((s, o) => s + Number(o.totalTransaccion), 0);
          if (op.limiteDiario && usadoHoy + c.total > Number(op.limiteDiario)) {
            return error(
              request,
              422,
              "LIMITE_DIARIO_EXCEDIDO",
              "Superas tu límite diario de operación.",
              {
                datos: { limiteDiario: op.limiteDiario, usadoHoy: monto(usadoHoy) },
              }
            );
          }

          const encolada = !mercado.abierto;
          const enEjecucion = cuerpo.tipo === "MARKET" && !encolada;
          const ahora = new Date().toISOString();
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
            precioEjecucion: null,
            totalTransaccion: monto(c.total),
            comisionValor: c.comision,
            totalDescontado: c.totalADescontar,
            estado: enEjecucion ? "EN_EJECUCION" : "PENDIENTE",
            encolada,
            saldoLiberado: "0.00",
            reservado: compra,
            creadaEn: ahora,
            actualizadaEn: ahora,
            historial: [],
          };
          orden.historial.push({
            estado: orden.estado,
            fecha: ahora,
            actor: { tipo: "USUARIO", nombre: usuario.nombre },
            motivo: encolada ? "Orden encolada hasta la apertura del mercado" : "Orden creada",
          });
          if (compra) {
            saldo.disponible = redondear(saldo.disponible - c.totalADescontar);
            saldo.reservado = redondear(saldo.reservado + c.totalADescontar);
            t.saldos[usuario.id] = saldo;
          }
          t.ordenes.unshift(orden);

          const traceId = request.headers.get("X-Trace-Id") ?? nuevoUuid();
          const cuerpoRespuesta = {
            id: orden.id,
            estado: orden.estado,
            encolada,
            totalTransaccion: orden.totalTransaccion,
            comision: vistaComision(c.comision),
            totalDescontado: monto(c.totalADescontar),
            creadaEn: ahora,
            traceId,
          };
          t.idempotencia.set(`${usuario.id}:${clave}`, { huella, cuerpo: cuerpoRespuesta });
          return HttpResponse.json(cuerpoRespuesta, {
            status: 201,
            headers: { "X-Trace-Id": traceId },
          });
        })(ctx)
      )
    ),

    rest.get(
      `${RAIZ}/ordenes`,
      protegido(CON_ORDENES, (ctx) =>
        conSimulacion("listar", async ({ request, usuario }) => {
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
        })(ctx)
      )
    ),

    rest.get(
      `${RAIZ}/ordenes/:id/historial`,
      protegido(CON_ORDENES, (ctx) =>
        conSimulacion("historial", async ({ request, usuario, params }) => {
          avanzarOrdenes(trading());
          const orden = ordenDelUsuario(usuario, params.id);
          if (!orden) return noEncontrada(request);
          return HttpResponse.json({ ordenId: orden.id, estados: orden.historial });
        })(ctx)
      )
    ),

    rest.get(
      `${RAIZ}/ordenes/:id`,
      protegido(CON_ORDENES, (ctx) =>
        conSimulacion("detalle", async ({ request, usuario, params }) => {
          avanzarOrdenes(trading());
          const orden = ordenDelUsuario(usuario, params.id);
          if (!orden) return noEncontrada(request);
          return HttpResponse.json(vistaOrden(orden));
        })(ctx)
      )
    ),

    rest.post(
      `${RAIZ}/ordenes/:id/cancelar`,
      protegido(CON_ORDENES, (ctx) =>
        conSimulacion("cancelar", async ({ request, usuario, params }) => {
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
          let liberado = 0;
          if (orden.lado === "COMPRA" && orden.reservado) {
            const saldo = t.saldos[usuario.id];
            liberado = orden.totalDescontado;
            if (saldo) {
              saldo.reservado = redondear(Math.max(0, saldo.reservado - liberado));
              saldo.disponible = redondear(saldo.disponible + liberado);
            }
            orden.reservado = false;
          }
          orden.saldoLiberado = monto(liberado);
          registrar(
            orden,
            "CANCELADA",
            { tipo: "USUARIO", nombre: usuario.nombre },
            "Cancelada por el usuario"
          );
          return HttpResponse.json({
            id: orden.id,
            estado: "CANCELADA",
            saldoLiberado: monto(liberado),
            traceId: request.headers.get("X-Trace-Id") ?? nuevoUuid(),
          });
        })(ctx)
      )
    ),
  ];
}

/** Utilidades de consola `window.__mock.ordenes` (y para pruebas). */
export function utilidadesOrdenes(db) {
  return {
    /** Fuerza el mercado: true abierto, false cerrado, null horario real. */
    mercado: (abierto) => {
      db.trading.mercadoForzado = abierto;
    },
    /** Ejecuta ya las órdenes pendientes y en ejecución. Devuelve cuántas. */
    ejecutarPendientes: () => ejecutarPendientes(db.trading),
    /** La siguiente(s) `veces` llamada(s) a órdenes fallan con ese código del catálogo. */
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
