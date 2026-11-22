import { beforeEach, describe, expect, it } from "vitest";
import * as authApi from "../api/authApi.js";
import * as ordenesApi from "../api/ordenesApi.js";
import * as portafolioApi from "../api/portafolioApi.js";
import { http } from "../api/http.js";
import { session } from "../auth/session.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO, db } from "./db.js";
import { ESTADOS_ORDEN, utilidadesOrdenes } from "./ordenes.js";

async function abrirSesion(correo = "laura@correo.com") {
  const reto = await authApi.iniciarSesion({ correo, contrasena: CONTRASENA_DEMO });
  const r = await authApi.verificarMfa({ mfaToken: reto.mfaToken, codigo: CODIGO_MFA_VALIDO });
  session.setTokens(r);
}

const compra = { ticker: "AAPL", lado: "COMPRA", tipo: "MARKET", cantidad: 2 };
const util = utilidadesOrdenes(db);
const ID_PENDIENTE = "0a000000-0000-4000-8000-000000000001";
const ID_EJECUTADA = "0a000000-0000-4000-8000-000000000002";
const ID_EN_REVISION = "0a000000-0000-4000-8000-000000000006";

describe("mock · órdenes", () => {
  beforeEach(async () => {
    await abrirSesion();
    util.mercado(true);
  });

  it("simulación devuelve la forma del contrato con comisión del 2 %", async () => {
    const r = await ordenesApi.simularOrden(compra);
    expect(r).toMatchObject({
      precioEstimado: "176.50",
      totalTransaccion: "353.00",
      comision: {
        porcentaje: "2.00",
        valor: "7.06",
        valorPlataforma: "7.06",
        valorComisionista: "0.00",
      },
      totalADescontar: "360.06",
      fondosSuficientes: true,
      mercadoAbierto: true,
      proximaApertura: null,
    });
  });

  it("con comisionista el reparto es 60 % plataforma / 40 % comisionista", async () => {
    db.usuarios[0].comisionista = { id: "c1000000-0000-4000-8000-000000000001" };
    const r = await ordenesApi.simularOrden(compra);
    expect(r.comision).toMatchObject({
      valor: "7.06",
      valorPlataforma: "4.24",
      valorComisionista: "2.82",
    });
  });

  it("simulación indica fondos insuficientes y mercado cerrado", async () => {
    util.mercado(false);
    const r = await ordenesApi.simularOrden({ ...compra, cantidad: 1000 });
    expect(r.fondosSuficientes).toBe(false);
    expect(r.mercadoAbierto).toBe(false);
    expect(r.proximaApertura).toBeTruthy();
  });

  it("valida el cuerpo con VALIDACION_FALLIDA y detalles", async () => {
    await expect(
      ordenesApi.simularOrden({ ...compra, cantidad: 0, tipo: "LIMIT" })
    ).rejects.toMatchObject({ status: 400, codigo: "VALIDACION_FALLIDA" });
  });

  it("crear reserva fondos; ejecutar mueve saldo y posición y deja la ejecución aparte", async () => {
    const antes = await portafolioApi.obtenerSaldo();
    const creada = await ordenesApi.crearOrden(compra);
    expect(creada).toMatchObject({
      estado: "EN_EJECUCION",
      encolada: false,
      totalDescontado: "360.06",
    });
    expect(creada.traceId).toBeTruthy();

    const reservado = await portafolioApi.obtenerSaldo();
    expect(Number(reservado.disponible)).toBeCloseTo(Number(antes.disponible) - 360.06, 2);
    expect(Number(reservado.reservado)).toBeCloseTo(Number(antes.reservado) + 360.06, 2);

    util.ejecutarPendientes();
    const orden = await ordenesApi.obtenerOrden(creada.id);
    // No existe EJECUTADA: la orden queda con sus ejecuciones.
    expect(orden).toMatchObject({
      cantidadEjecutada: 2,
      precioEjecucion: "176.50",
      validadaPor: null,
    });
    expect(orden.ejecuciones).toHaveLength(1);
    // Se ejecutó también la MSFT pendiente de la semilla (351.20).
    const despues = await portafolioApi.obtenerSaldo();
    expect(despues.reservado).toBe("0.00");
    expect(Number(despues.disponible)).toBeCloseTo(Number(antes.disponible) - 360.06, 2);
    const posiciones = await portafolioApi.listarPosiciones();
    expect(posiciones.find((p) => p.activo === "AAPL").cantidad).toBe("12");
  });

  it("ejecución parcial: queda cantidad ejecutada menor y fondos aún reservados", async () => {
    const creada = await ordenesApi.crearOrden({ ...compra, cantidad: 4 });
    expect(util.ejecutarParcial()).toBe(2);
    const orden = await ordenesApi.obtenerOrden(creada.id);
    expect(orden).toMatchObject({ cantidad: 4, cantidadEjecutada: 2, estado: "EN_EJECUCION" });
    util.ejecutarPendientes();
    expect((await ordenesApi.obtenerOrden(creada.id)).cantidadEjecutada).toBe(4);
    expect((await ordenesApi.obtenerOrden(creada.id)).ejecuciones).toHaveLength(2);
  });

  it("historial: de la más antigua a la más reciente, con actor, precio de referencia y traceId", async () => {
    const creada = await ordenesApi.crearOrden(compra);
    util.ejecutarPendientes();
    const { ordenId, estados } = await ordenesApi.obtenerHistorialOrden(creada.id);
    expect(ordenId).toBe(creada.id);
    expect(estados.length).toBeGreaterThanOrEqual(1);
    expect(estados[0]).toMatchObject({
      estado: "EN_EJECUCION",
      actor: { tipo: "USUARIO", id: db.usuarios[0].id },
      motivo: "Orden creada",
      precioReferencia: "176.50",
      bid: "176.48",
      ask: "176.52",
    });
    expect(estados[0].traceId).toBeTruthy();
    const fechas = estados.map((e) => Date.parse(e.fecha));
    expect(fechas).toEqual([...fechas].sort((a, b) => a - b));
    const sistema = await ordenesApi.obtenerHistorialOrden("0a000000-0000-4000-8000-000000000004");
    expect(sistema.estados.at(-1)).toMatchObject({
      estado: "RECHAZADA",
      actor: { tipo: "SISTEMA", id: null },
    });
  });

  it("Idempotency-Key repetida devuelve la misma orden; con otro cuerpo, 409", async () => {
    const a = await ordenesApi.crearOrden(compra, { idempotencyKey: "k-1" });
    const b = await ordenesApi.crearOrden(compra, { idempotencyKey: "k-1" });
    expect(b.id).toBe(a.id);
    const { contenido } = await ordenesApi.listarOrdenes({
      ticker: "AAPL",
      estado: "EN_EJECUCION",
    });
    expect(contenido.filter((o) => o.id === a.id)).toHaveLength(1);
    await expect(
      ordenesApi.crearOrden({ ...compra, cantidad: 3 }, { idempotencyKey: "k-1" })
    ).rejects.toMatchObject({ status: 409, codigo: "CONFLICTO_IDEMPOTENCIA" });
  });

  it("mercado cerrado: 409 con datos; confirmando encola como PENDIENTE", async () => {
    util.mercado(false);
    await expect(ordenesApi.crearOrden(compra)).rejects.toMatchObject({
      status: 409,
      codigo: "MERCADO_CERRADO",
    });
    const r = await ordenesApi.crearOrden({ ...compra, confirmarEncolamiento: true });
    expect(r).toMatchObject({ estado: "PENDIENTE", encolada: true });
  });

  it("respeta mercadoAbierto(codigo) del panel cuando no hay forzado global", async () => {
    util.mercado(null);
    db.simulacion.mercadoAbierto.NYSE = false;
    expect((await ordenesApi.simularOrden(compra)).mercadoAbierto).toBe(false);
    db.simulacion.mercadoAbierto.NYSE = true;
    expect((await ordenesApi.simularOrden(compra)).mercadoAbierto).toBe(true);
  });

  it("errores de negocio del catálogo", async () => {
    await expect(ordenesApi.crearOrden({ ...compra, cantidad: 100 })).rejects.toMatchObject({
      status: 422,
      codigo: "FONDOS_INSUFICIENTES",
    });
    await expect(
      ordenesApi.crearOrden({ ...compra, lado: "VENTA", ticker: "NVDA", cantidad: 99 })
    ).rejects.toMatchObject({ status: 422, codigo: "ACCIONES_INSUFICIENTES" });
    db.usuarios[0].preferencias.operaciones.limiteDiario = "300.00";
    await expect(ordenesApi.crearOrden(compra)).rejects.toMatchObject({
      status: 422,
      codigo: "LIMITE_DIARIO_EXCEDIDO",
    });
  });

  describe("doble autorización (propuesta: 202 + /ordenes/autorizar)", () => {
    const grande = { ...compra, cantidad: 10 };
    const autorizar = (cuerpo) => http.post("/ordenes/autorizar", cuerpo);

    beforeEach(() => {
      db.usuarios[0].preferencias.operaciones.dobleAutorizacion = true;
    });

    it("POST /ordenes responde 202 sin crear la orden; confirmar la crea con validadaPor/En", async () => {
      const total = (await ordenesApi.listarOrdenes()).totalElementos;
      const pendiente = await ordenesApi.crearOrden(grande, { idempotencyKey: "k-grande" });
      expect(pendiente).toMatchObject({ requiereAutorizacion: true });
      expect(pendiente.autorizacionId).toBeTruthy();
      expect((await ordenesApi.listarOrdenes()).totalElementos).toBe(total);

      const creada = await autorizar({
        autorizacionId: pendiente.autorizacionId,
        codigoAutorizacion: "654321",
      });
      expect(creada.estado).toBe("EN_EJECUCION");
      const orden = await ordenesApi.obtenerOrden(creada.id);
      expect(orden.validadaPor).toBe(db.usuarios[0].id);
      expect(Date.parse(orden.validadaEn)).not.toBeNaN();

      // Confirmar dos veces no duplica la orden.
      const repetida = await autorizar({
        autorizacionId: pendiente.autorizacionId,
        codigoAutorizacion: "654321",
      });
      expect(repetida.id).toBe(creada.id);
      expect((await ordenesApi.listarOrdenes()).totalElementos).toBe(total + 1);
    });

    it("código inválido o vencido → 422; autorización inexistente → 404", async () => {
      const { autorizacionId } = await ordenesApi.crearOrden(grande);
      await expect(
        autorizar({ autorizacionId, codigoAutorizacion: "000000" })
      ).rejects.toMatchObject({ status: 422 });
      db.trading.autorizaciones.get(autorizacionId).expira = Date.now() - 1;
      await expect(
        autorizar({ autorizacionId, codigoAutorizacion: "654321" })
      ).rejects.toMatchObject({ status: 422 });
      await expect(
        autorizar({ autorizacionId: "no-existe", codigoAutorizacion: "654321" })
      ).rejects.toMatchObject({ status: 404 });
      await expect(autorizar({})).rejects.toMatchObject({ status: 400 });
    });

    it("una orden bajo el umbral no pide autorización", async () => {
      const r = await ordenesApi.crearOrden({ ...compra, cantidad: 1 });
      expect(r.estado).toBe("EN_EJECUCION");
    });
  });

  it("lista con filtros, paginación y estado vacío", async () => {
    const todas = await ordenesApi.listarOrdenes();
    expect(todas).toMatchObject({ pagina: 0, totalElementos: 8 });
    expect(
      [...new Set(todas.contenido.map((o) => o.estado))].every((e) => ESTADOS_ORDEN.includes(e))
    ).toBe(true);
    expect((await ordenesApi.listarOrdenes({ estado: "CANCELADA" })).contenido).toHaveLength(1);
    expect((await ordenesApi.listarOrdenes({ lado: "VENTA" })).contenido).toHaveLength(3);
    expect((await ordenesApi.listarOrdenes({ tamano: 3 })).totalPaginas).toBe(3);
    session.clear();
    await abrirSesion("nuevo@correo.com");
    const vacia = await ordenesApi.listarOrdenes();
    expect(vacia.contenido).toEqual([]);
    expect(vacia.totalElementos).toBe(0);
  });

  it("cancelar solo en PENDIENTE o EN_REVISION; libera saldo; ajena → 404", async () => {
    const antes = await portafolioApi.obtenerSaldo();
    const r = await ordenesApi.cancelarOrden(ID_PENDIENTE);
    expect(r).toMatchObject({ estado: "CANCELADA", saldoLiberado: "351.20" });
    const despues = await portafolioApi.obtenerSaldo();
    expect(Number(despues.disponible)).toBeCloseTo(Number(antes.disponible) + 351.2, 2);
    expect(despues.reservado).toBe("0.00");

    expect(await ordenesApi.cancelarOrden(ID_EN_REVISION)).toMatchObject({
      estado: "CANCELADA",
      saldoLiberado: "0.00",
    });
    await expect(ordenesApi.cancelarOrden(ID_EJECUTADA)).rejects.toMatchObject({
      status: 409,
      codigo: "ORDEN_NO_CANCELABLE",
    });
    await expect(ordenesApi.obtenerOrden("no-existe")).rejects.toMatchObject({ status: 404 });
  });

  it("forzar estado: FALLIDA libera los fondos reservados", async () => {
    expect(util.estado(ID_PENDIENTE, "FALLIDA", "Prueba")).toBe(true);
    expect((await ordenesApi.obtenerOrden(ID_PENDIENTE)).estado).toBe("FALLIDA");
    expect((await portafolioApi.obtenerSaldo()).reservado).toBe("0.00");
  });

  it("errores forzados y retry idempotente 502 con la misma clave", async () => {
    util.fallar("PROVEEDOR_NO_DISPONIBLE");
    const r = await ordenesApi.crearOrden(compra, { idempotencyKey: "k-retry" });
    expect(r.estado).toBe("EN_EJECUCION");
    util.fallar("ERROR_INTERNO", { ruta: "/ordenes" });
    await expect(ordenesApi.listarOrdenes()).rejects.toMatchObject({
      status: 500,
      codigo: "ERROR_INTERNO",
    });
    util.limpiar();
  });

  it("solo inversionistas operan; comisionista puede simular", async () => {
    session.clear();
    await abrirSesion("carlos@correo.com");
    await expect(ordenesApi.listarOrdenes()).rejects.toMatchObject({ status: 403 });
    expect((await ordenesApi.simularOrden(compra)).totalTransaccion).toBe("353.00");
  });
});
