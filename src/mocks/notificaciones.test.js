import { beforeEach, describe, expect, it } from "vitest";
import * as authApi from "../api/authApi.js";
import * as notificacionesApi from "../api/notificacionesApi.js";
import * as ordenesApi from "../api/ordenesApi.js";
import { session } from "../auth/session.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO, db } from "./db.js";
import { utilidadesNotificaciones } from "./notificaciones.js";
import { utilidadesOrdenes } from "./ordenes.js";

async function abrirSesion(correo = "laura@correo.com") {
  const reto = await authApi.iniciarSesion({ correo, contrasena: CONTRASENA_DEMO });
  const r = await authApi.verificarMfa({ mfaToken: reto.mfaToken, codigo: CODIGO_MFA_VALIDO });
  session.setTokens(r);
}

const util = utilidadesNotificaciones(db);
const ordenes = utilidadesOrdenes(db);

describe("mock · notificaciones", () => {
  beforeEach(async () => {
    await abrirSesion();
    ordenes.mercado(true);
  });

  it("lista paginada, más recientes primero, con la forma propuesta", async () => {
    const r = await notificacionesApi.listarNotificaciones();
    expect(r).toMatchObject({ pagina: 0, totalElementos: 4, totalPaginas: 1 });
    expect(r.contenido[0]).toEqual({
      id: expect.any(String),
      tipo: "RESUMEN_DIARIO_OPERACIONES",
      titulo: expect.any(String),
      mensaje: expect.any(String),
      leida: false,
      creadaEn: expect.any(String),
      referenciaId: null,
    });
    const fechas = r.contenido.map((n) => Date.parse(n.creadaEn));
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
    expect(r.contenido[0]).not.toHaveProperty("usuarioId");
  });

  it("filtra por tipo, desde y leida, y pagina", async () => {
    expect(
      (await notificacionesApi.listarNotificaciones({ tipo: "ORDEN_EJECUTADA" })).contenido
    ).toHaveLength(1);
    expect((await notificacionesApi.listarNotificaciones({ leida: "false" })).totalElementos).toBe(
      2
    );
    const desde = new Date(Date.now() - 24 * 3600_000).toISOString();
    expect((await notificacionesApi.listarNotificaciones({ desde })).totalElementos).toBe(2);
    expect((await notificacionesApi.listarNotificaciones({ tamano: 3 })).totalPaginas).toBe(2);
    await expect(notificacionesApi.listarNotificaciones({ desde: "ayer" })).rejects.toMatchObject({
      status: 400,
      codigo: "VALIDACION_FALLIDA",
    });
  });

  it("marcar como leída actualiza la lista y es idempotente", async () => {
    const [primera] = (await notificacionesApi.listarNotificaciones({ leida: "false" })).contenido;
    const r = await notificacionesApi.marcarNotificacionLeida(primera.id);
    expect(r).toMatchObject({ id: primera.id, leida: true });
    expect(util.noLeidas()).toBe(1);
    await notificacionesApi.marcarNotificacionLeida(primera.id);
    expect(util.noLeidas()).toBe(1);
  });

  it("cada usuario solo ve y marca las suyas (ajena → 404); sin notificaciones → lista vacía", async () => {
    const [propia] = (await notificacionesApi.listarNotificaciones()).contenido;
    session.clear();
    await abrirSesion("nuevo@correo.com");
    const vacia = await notificacionesApi.listarNotificaciones();
    expect(vacia).toMatchObject({ contenido: [], totalElementos: 0 });
    await expect(notificacionesApi.marcarNotificacionLeida(propia.id)).rejects.toMatchObject({
      status: 404,
      codigo: "NO_ENCONTRADO",
    });
    await expect(notificacionesApi.marcarNotificacionLeida("no-existe")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("ejecutar una orden crea ORDEN_EJECUTADA; cancelar crea ORDEN_CANCELADA", async () => {
    const creada = await ordenesApi.crearOrden({
      ticker: "AAPL",
      lado: "COMPRA",
      tipo: "MARKET",
      cantidad: 2,
    });
    ordenes.ejecutarPendientes();
    let lista = await notificacionesApi.listarNotificaciones({ tipo: "ORDEN_EJECUTADA" });
    const nueva = lista.contenido.find((n) => n.referenciaId === creada.id);
    expect(nueva).toMatchObject({ leida: false });
    expect(nueva.mensaje).toContain("2 AAPL");

    await ordenesApi.cancelarOrden("0a000000-0000-4000-8000-000000000006");
    lista = await notificacionesApi.listarNotificaciones({ tipo: "ORDEN_CANCELADA" });
    expect(lista.contenido[0]).toMatchObject({
      referenciaId: "0a000000-0000-4000-8000-000000000006",
      leida: false,
    });
  });

  it("una ejecución parcial no notifica hasta completarse", async () => {
    const antes = util.noLeidas();
    await ordenesApi.crearOrden({ ticker: "AAPL", lado: "COMPRA", tipo: "MARKET", cantidad: 4 });
    ordenes.ejecutarParcial();
    expect(util.noLeidas()).toBe(antes);
    ordenes.ejecutarPendientes();
    expect(util.noLeidas()).toBeGreaterThan(antes);
  });

  it("errores forzados, latencia y utilidades de consola", async () => {
    util.mercado("NYSE", false);
    expect((await notificacionesApi.listarNotificaciones()).contenido[0].titulo).toBe("NYSE cerró");
    ordenes.fallar("ERROR_INTERNO", { ruta: "/notificaciones" });
    await expect(notificacionesApi.listarNotificaciones()).rejects.toMatchObject({ status: 500 });
    expect((await notificacionesApi.listarNotificaciones()).totalElementos).toBe(5);
    ordenes.limpiar();
  });

  it("solo inversionistas y comisionistas acceden", async () => {
    session.clear();
    await abrirSesion("admin@correo.com");
    await expect(notificacionesApi.listarNotificaciones()).rejects.toMatchObject({ status: 403 });
  });
});
