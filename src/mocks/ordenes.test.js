import { beforeEach, describe, expect, it } from "vitest";
import * as authApi from "../api/authApi.js";
import * as ordenesApi from "../api/ordenesApi.js";
import * as portafolioApi from "../api/portafolioApi.js";
import { session } from "../auth/session.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO, db } from "./db.js";
import { utilidadesOrdenes } from "./ordenes.js";

async function abrirSesion(correo = "laura@correo.com") {
  const reto = await authApi.iniciarSesion({ correo, contrasena: CONTRASENA_DEMO });
  const r = await authApi.verificarMfa({ mfaToken: reto.mfaToken, codigo: CODIGO_MFA_VALIDO });
  session.setTokens(r);
}

const compra = { ticker: "AAPL", lado: "COMPRA", tipo: "MARKET", cantidad: 2 };
const util = utilidadesOrdenes(db);

describe("mock · órdenes", () => {
  beforeEach(async () => {
    await abrirSesion();
    util.mercado(true);
  });

  it("simulación devuelve la forma del contrato", async () => {
    const r = await ordenesApi.simularOrden(compra);
    expect(r).toMatchObject({
      precioEstimado: "176.50",
      totalTransaccion: "353.00",
      comision: {
        porcentaje: "0.50",
        valor: "1.77",
        valorPlataforma: "1.77",
        valorComisionista: "0.00",
      },
      totalADescontar: "354.77",
      fondosSuficientes: true,
      mercadoAbierto: true,
      proximaApertura: null,
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
    ).rejects.toMatchObject({
      status: 400,
      codigo: "VALIDACION_FALLIDA",
    });
  });

  it("crear reserva fondos, ejecuta y actualiza saldo y portafolio", async () => {
    const antes = await portafolioApi.obtenerSaldo();
    const creada = await ordenesApi.crearOrden(compra);
    expect(creada).toMatchObject({
      estado: "EN_EJECUCION",
      encolada: false,
      totalDescontado: "354.77",
    });
    expect(creada.traceId).toBeTruthy();

    const reservado = await portafolioApi.obtenerSaldo();
    expect(Number(reservado.disponible)).toBeCloseTo(Number(antes.disponible) - 354.77, 2);
    expect(Number(reservado.reservado)).toBeCloseTo(Number(antes.reservado) + 354.77, 2);

    util.ejecutarPendientes();
    const orden = await ordenesApi.obtenerOrden(creada.id);
    expect(orden.estado).toBe("EJECUTADA");
    const despues = await portafolioApi.obtenerSaldo();
    // Se ejecutaron también la orden de mercado y la MSFT pendiente de la semilla (351.20).
    expect(despues.reservado).toBe("0.00");
    expect(Number(despues.disponible)).toBeCloseTo(Number(antes.disponible) - 354.77, 2);
    const posiciones = await portafolioApi.listarPosiciones();
    expect(posiciones.find((p) => p.activo === "AAPL").cantidad).toBe("12");

    const hist = await ordenesApi.obtenerHistorialOrden(creada.id);
    expect(hist.estados.map((e) => e.estado)).toEqual(["EN_EJECUCION", "EJECUTADA"]);
  });

  it("Idempotency-Key repetida devuelve la misma orden; con otro cuerpo, 409", async () => {
    const a = await ordenesApi.crearOrden(compra, { idempotencyKey: "k-1" });
    const b = await ordenesApi.crearOrden(compra, { idempotencyKey: "k-1" });
    expect(b.id).toBe(a.id);
    const { contenido } = await ordenesApi.listarOrdenes({
      ticker: "AAPL",
      estado: "EN_EJECUCION",
    });
    expect(contenido).toHaveLength(1);
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

  it("errores de negocio del catálogo", async () => {
    await expect(ordenesApi.crearOrden({ ...compra, cantidad: 100 })).rejects.toMatchObject({
      status: 422,
      codigo: "FONDOS_INSUFICIENTES",
    });
    await expect(
      ordenesApi.crearOrden({ ...compra, lado: "VENTA", ticker: "NVDA", cantidad: 99 })
    ).rejects.toMatchObject({
      status: 422,
      codigo: "ACCIONES_INSUFICIENTES",
    });
    db.usuarios[0].preferencias.operaciones.limiteDiario = "300.00";
    await expect(ordenesApi.crearOrden(compra)).rejects.toMatchObject({
      status: 422,
      codigo: "LIMITE_DIARIO_EXCEDIDO",
    });
  });

  it("doble autorización exige código sobre el umbral", async () => {
    db.usuarios[0].preferencias.operaciones.dobleAutorizacion = true;
    await expect(ordenesApi.crearOrden({ ...compra, cantidad: 10 })).rejects.toMatchObject({
      status: 403,
      codigo: "DOBLE_AUTORIZACION_REQUERIDA",
    });
    const r = await ordenesApi.crearOrden({
      ...compra,
      cantidad: 10,
      codigoAutorizacion: "654321",
    });
    expect(r.estado).toBe("EN_EJECUCION");
  });

  it("lista con filtros, paginación y estado vacío", async () => {
    const todas = await ordenesApi.listarOrdenes();
    expect(todas).toMatchObject({ pagina: 0, totalElementos: 4 });
    expect((await ordenesApi.listarOrdenes({ estado: "CANCELADA" })).contenido).toHaveLength(1);
    expect((await ordenesApi.listarOrdenes({ lado: "VENTA" })).contenido[0].ticker).toBe("XOM");
    expect((await ordenesApi.listarOrdenes({ tamano: 2 })).totalPaginas).toBe(2);
    session.clear();
    await abrirSesion("nuevo@correo.com");
    const vacia = await ordenesApi.listarOrdenes();
    expect(vacia.contenido).toEqual([]);
    expect(vacia.totalElementos).toBe(0);
  });

  it("cancelar libera saldo; no cancelable → 409; ajena → 404", async () => {
    const antes = await portafolioApi.obtenerSaldo();
    const r = await ordenesApi.cancelarOrden("0a000000-0000-4000-8000-000000000001");
    expect(r).toMatchObject({ estado: "CANCELADA", saldoLiberado: "351.20" });
    const despues = await portafolioApi.obtenerSaldo();
    expect(Number(despues.disponible)).toBeCloseTo(Number(antes.disponible) + 351.2, 2);
    expect(despues.reservado).toBe("0.00");
    await expect(
      ordenesApi.cancelarOrden("0a000000-0000-4000-8000-000000000002")
    ).rejects.toMatchObject({
      status: 409,
      codigo: "ORDEN_NO_CANCELABLE",
    });
    await expect(ordenesApi.obtenerOrden("no-existe")).rejects.toMatchObject({ status: 404 });
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
