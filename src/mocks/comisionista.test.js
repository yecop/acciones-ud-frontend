import { beforeEach, describe, expect, it } from "vitest";
import * as authApi from "../api/authApi.js";
import * as comisionistaApi from "../api/comisionistaApi.js";
import * as ordenesApi from "../api/ordenesApi.js";
import * as propuestasApi from "../api/propuestasApi.js";
import { session } from "../auth/session.js";
import { utilidadesComisionista } from "./comisionista.js";
import {
  ID_ESTRATEGIA,
  ID_PROPUESTA,
  USUARIO_MATEO,
  USUARIO_VALENTINA,
} from "./comisionistaDatos.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO, db } from "./db.js";

async function abrirSesion(correo) {
  const reto = await authApi.iniciarSesion({ correo, contrasena: CONTRASENA_DEMO });
  const r = await authApi.verificarMfa({ mfaToken: reto.mfaToken, codigo: CODIGO_MFA_VALIDO });
  session.setTokens(r);
}

const util = utilidadesComisionista(db);
const comoCarlos = () => abrirSesion("carlos@correo.com");
const comoMateo = () => abrirSesion("mateo@correo.com");
const falla = (promesa, status, codigo) =>
  expect(promesa).rejects.toMatchObject({ status, ...(codigo ? { codigo } : {}) });

describe("mock · clientes y estrategias", () => {
  beforeEach(comoCarlos);

  it("lista solo los clientes asignados al comisionista", async () => {
    const r = await comisionistaApi.listarClientes();
    expect(r.totalElementos).toBe(1);
    expect(r.contenido[0]).toMatchObject({
      id: USUARIO_MATEO,
      nombre: "Mateo",
      operaEnNombre: false,
      propuestasActivas: 2,
    });
  });

  it("detalle, posiciones y órdenes del cliente; uno ajeno responde 404", async () => {
    const detalle = await comisionistaApi.obtenerCliente(USUARIO_MATEO);
    expect(detalle).toMatchObject({ id: USUARIO_MATEO, saldo: { disponible: "6800.00" } });
    expect((await comisionistaApi.posicionesDeCliente(USUARIO_MATEO)).length).toBeGreaterThan(0);
    expect((await comisionistaApi.ordenesDeCliente(USUARIO_MATEO)).totalElementos).toBe(0);

    await falla(comisionistaApi.obtenerCliente(USUARIO_VALENTINA), 404, "NO_ENCONTRADO");
    await falla(comisionistaApi.posicionesDeCliente(USUARIO_VALENTINA), 404);
    await falla(comisionistaApi.ordenesDeCliente(USUARIO_VALENTINA), 404);
    await falla(comisionistaApi.obtenerCliente("no-existe"), 404);
  });

  it("un inversionista recibe 403 en los endpoints de comisionista", async () => {
    await comoMateo();
    await falla(comisionistaApi.listarClientes(), 403, "ACCESO_DENEGADO");
    await falla(comisionistaApi.listarEstrategias(), 403, "ACCESO_DENEGADO");
    await falla(propuestasApi.firmarPropuesta(ID_PROPUESTA(2)), 403, "ACCESO_DENEGADO");
  });

  it("administra estrategias: lista, crea, edita y archiva", async () => {
    expect((await comisionistaApi.listarEstrategias()).totalElementos).toBe(3);
    expect(
      (await comisionistaApi.listarEstrategias({ estado: "ARCHIVADA" })).contenido
    ).toHaveLength(1);

    const nueva = await comisionistaApi.crearEstrategia({
      nombre: "Defensiva",
      descripcion: "Poca volatilidad",
      perfilRiesgo: "CONSERVADOR",
    });
    expect(nueva).toMatchObject({ estado: "ACTIVA", nombre: "Defensiva" });
    expect(nueva).not.toHaveProperty("comisionistaId");

    const editada = await comisionistaApi.actualizarEstrategia(nueva.id, { nombre: "Defensiva 2" });
    expect(editada.nombre).toBe("Defensiva 2");
    const archivada = await comisionistaApi.actualizarEstrategia(nueva.id, { estado: "ARCHIVADA" });
    expect(archivada.estado).toBe("ARCHIVADA");

    await falla(
      comisionistaApi.crearEstrategia({ nombre: "x", perfilRiesgo: "X" }),
      400,
      "VALIDACION_FALLIDA"
    );
    await falla(comisionistaApi.actualizarEstrategia("no-existe", { nombre: "Abc" }), 404);
  });
});

describe("mock · propuestas", () => {
  const orden = { ticker: "AAPL", lado: "COMPRA", tipo: "MARKET", cantidad: 2 };
  const nueva = (extra = {}) => ({
    clienteId: USUARIO_MATEO,
    titulo: "Comprar AAPL",
    ordenes: [orden],
    venceEn: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    ...extra,
  });

  beforeEach(comoCarlos);

  it("lista las propuestas del comisionista, más recientes primero y con filtros", async () => {
    const r = await propuestasApi.listarPropuestas();
    expect(r.totalElementos).toBe(5);
    const fechas = r.contenido.map((p) => Date.parse(p.creadaEn));
    expect(fechas).toEqual([...fechas].sort((a, b) => b - a));
    expect(r.contenido[0]).toMatchObject({
      clienteNombre: "Mateo",
      comisionistaNombre: "Carlos R.",
    });
    expect(r.contenido[0]).not.toHaveProperty("historial");
    expect((await propuestasApi.listarPropuestas({ estado: "APROBADA" })).totalElementos).toBe(1);
    await falla(propuestasApi.listarPropuestas({ estado: "XYZ" }), 400, "VALIDACION_FALLIDA");
  });

  it("el detalle incluye el historial y la estrategia", async () => {
    const p = await propuestasApi.obtenerPropuesta(ID_PROPUESTA(3));
    expect(p.estrategia).toEqual({ id: ID_ESTRATEGIA(2), nombre: "Dividendos estables" });
    expect(p.historial.map((h) => h.estado)).toEqual([
      "PENDIENTE_APROBACION",
      "APROBADA",
      "FIRMADA",
    ]);
  });

  it("crea una propuesta para un cliente asignado", async () => {
    const p = await propuestasApi.crearPropuesta(nueva({ estrategiaId: ID_ESTRATEGIA(1) }));
    expect(p).toMatchObject({ estado: "PENDIENTE_APROBACION", clienteNombre: "Mateo" });
    expect(p.historial).toHaveLength(1);
    expect((await propuestasApi.listarPropuestas()).totalElementos).toBe(6);
  });

  it("valida la propuesta y rechaza clientes ajenos o estrategias archivadas", async () => {
    const e1 = await propuestasApi
      .crearPropuesta({ clienteId: USUARIO_MATEO, titulo: "x", ordenes: [], venceEn: "ayer" })
      .catch((e) => e);
    expect(e1.status).toBe(400);
    expect(e1.detalles.map((d) => d.campo)).toEqual(
      expect.arrayContaining(["titulo", "ordenes", "venceEn"])
    );
    await falla(propuestasApi.crearPropuesta(nueva({ clienteId: USUARIO_VALENTINA })), 404);
    await falla(
      propuestasApi.crearPropuesta(nueva({ estrategiaId: ID_ESTRATEGIA(3) })),
      400,
      "VALIDACION_FALLIDA"
    );
    await falla(
      propuestasApi.crearPropuesta(nueva({ ordenes: [{ ...orden, tipo: "LIMIT" }] })),
      400,
      "VALIDACION_FALLIDA"
    );
  });

  it("el comisionista no puede aprobar ni rechazar; el cliente no puede firmar", async () => {
    await falla(propuestasApi.aprobarPropuesta(ID_PROPUESTA(1)), 403, "ACCESO_DENEGADO");
    await falla(propuestasApi.rechazarPropuesta(ID_PROPUESTA(1), "no"), 403);
    await comoMateo();
    await falla(propuestasApi.firmarPropuesta(ID_PROPUESTA(2)), 403, "ACCESO_DENEGADO");
  });

  it("el cliente aprueba y el comisionista firma: se crean las órdenes del cliente", async () => {
    await comoMateo();
    const aprobada = await propuestasApi.aprobarPropuesta(ID_PROPUESTA(1));
    expect(aprobada.estado).toBe("APROBADA");
    expect(aprobada.historial.at(-1)).toMatchObject({
      estado: "APROBADA",
      actor: { tipo: "USUARIO" },
    });

    await comoCarlos();
    const firmada = await propuestasApi.firmarPropuesta(ID_PROPUESTA(1));
    expect(firmada.estado).toBe("FIRMADA");
    expect(firmada.ordenesIds).toHaveLength(1);

    const ordenes = (await comisionistaApi.ordenesDeCliente(USUARIO_MATEO)).contenido;
    expect(ordenes).toHaveLength(1);
    expect(ordenes[0]).toMatchObject({
      ticker: "NVDA",
      estado: "FIRMADA_POR_COMISIONISTA",
      cantidad: 2,
    });
    expect(ordenes[0].comision.valorComisionista).not.toBe("0.00");
    await comoMateo();
    const historial = await ordenesApi.obtenerHistorialOrden(firmada.ordenesIds[0]);
    expect(historial.estados[0].actor.tipo).toBe("COMISIONISTA");
  });

  it("el cliente rechaza con motivo; sin motivo es 400", async () => {
    await comoMateo();
    await falla(propuestasApi.rechazarPropuesta(ID_PROPUESTA(1), " "), 400, "VALIDACION_FALLIDA");
    const r = await propuestasApi.rechazarPropuesta(ID_PROPUESTA(1), "No me convence");
    expect(r).toMatchObject({ estado: "RECHAZADA", motivoRechazo: "No me convence" });
  });

  it("las transiciones inválidas responden 409", async () => {
    await falla(propuestasApi.firmarPropuesta(ID_PROPUESTA(1)), 409, "TRANSICION_INVALIDA"); // aún sin aprobar
    await comoMateo();
    await falla(propuestasApi.aprobarPropuesta(ID_PROPUESTA(3)), 409, "TRANSICION_INVALIDA"); // ya firmada
    await falla(
      propuestasApi.rechazarPropuesta(ID_PROPUESTA(2), "tarde"),
      409,
      "TRANSICION_INVALIDA"
    ); // ya aprobada
  });

  it("una propuesta que vence pasa a VENCIDA y ya no admite acciones (409 PROPUESTA_VENCIDA)", async () => {
    util.vencer(ID_PROPUESTA(1));
    await comoMateo();
    await falla(propuestasApi.aprobarPropuesta(ID_PROPUESTA(1)), 409, "PROPUESTA_VENCIDA");
    const p = await propuestasApi.obtenerPropuesta(ID_PROPUESTA(1));
    expect(p.estado).toBe("VENCIDA");
    expect(p.historial.at(-1).actor.tipo).toBe("SISTEMA");

    util.vencer(ID_PROPUESTA(2)); // aprobada pero sin firmar a tiempo
    await comoCarlos();
    await falla(propuestasApi.firmarPropuesta(ID_PROPUESTA(2)), 409, "PROPUESTA_VENCIDA");
  });

  it("lo ajeno responde 404: otro comisionista o inversionista no ve la propuesta", async () => {
    await abrirSesion("laura@correo.com");
    await falla(propuestasApi.obtenerPropuesta(ID_PROPUESTA(1)), 404, "NO_ENCONTRADO");
    await falla(propuestasApi.aprobarPropuesta(ID_PROPUESTA(1)), 404);
    expect((await propuestasApi.listarPropuestas()).totalElementos).toBe(0);
    await abrirSesion("valentina@correo.com");
    expect((await propuestasApi.listarPropuestas()).totalElementos).toBe(0);
  });

  it("el cliente solo ve sus propuestas", async () => {
    await comoMateo();
    const r = await propuestasApi.listarPropuestas();
    expect(r.totalElementos).toBe(5);
    await falla(propuestasApi.crearPropuesta(nueva()), 403);
  });
});
