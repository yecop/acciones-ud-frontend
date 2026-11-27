import { iniciarSesion, verificarMfa } from "../api/authApi.js";
import { depositar, listarMovimientos, retirar } from "../api/fondosApi.js";
import * as gestion from "../api/gestionApi.js";
import * as premium from "../api/premiumApi.js";
import { obtenerSaldo } from "../api/portafolioApi.js";
import { session } from "../auth/session.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO } from "./db.js";

async function abrirSesion(nombre) {
  const reto = await iniciarSesion({ correo: `${nombre}@correo.com`, contrasena: CONTRASENA_DEMO });
  const sesion = await verificarMfa({ mfaToken: reto.mfaToken, codigo: CODIGO_MFA_VALIDO });
  session.setTokens(sesion);
  return sesion.usuario;
}

it("simula pago aprobado y rechazado, gestiona una watchlist y alertas y cancela el acceso", async () => {
  await abrirSesion("laura");
  expect(await premium.listarPlanes()).toHaveLength(2);
  await expect(premium.listarSeguimiento("watchlist")).rejects.toMatchObject({
    codigo: "FUNCION_PREMIUM",
  });
  await expect(
    premium.iniciarPago({ planId: "MENSUAL", escenarioPrueba: "RECHAZADO" })
  ).rejects.toMatchObject({ codigo: "PAGO_RECHAZADO" });
  expect(await premium.obtenerSuscripcion()).toEqual({ estado: "BASICA" });
  await premium.iniciarPago({ planId: "MENSUAL", escenarioPrueba: "APROBADO" });
  expect(await premium.listarSeguimiento("watchlist")).toEqual([]);
  const item = await premium.agregarSeguimiento("watchlist", { ticker: "aapl" });
  expect(await premium.listarSeguimiento("watchlist")).toEqual([item]);
  await expect(premium.agregarSeguimiento("watchlist", { ticker: "AAPL" })).rejects.toMatchObject({
    codigo: "VALIDACION_FALLIDA",
  });
  const alerta = await premium.agregarSeguimiento("alertas", {
    ticker: "AAPL",
    condicion: "SUBE_A",
    precioObjetivo: "250",
  });
  for (const [recurso, id] of [
    ["watchlist", item.id],
    ["alertas", alerta.id],
  ]) {
    expect(await premium.quitarSeguimiento(recurso, id)).toMatchObject({ activa: false });
    expect(await premium.reactivarSeguimiento(recurso, id)).toMatchObject({ activa: true });
  }
  await abrirSesion("nuevo");
  expect(await premium.obtenerSuscripcion()).toEqual({ estado: "BASICA" });
  await premium.iniciarPago({ planId: "ANUAL", escenarioPrueba: "APROBADO" });
  expect(await premium.listarSeguimiento("alertas")).toEqual([]);
  await expect(premium.reactivarSeguimiento("alertas", alerta.id)).rejects.toMatchObject({
    status: 404,
  });
  await abrirSesion("laura");
  expect(await premium.cancelarSuscripcion()).toMatchObject({ estado: "CANCELADA" });
  await expect(premium.listarSeguimiento("alertas")).rejects.toMatchObject({ status: 403 });
});

it("actualiza el saldo común, conserva el historial privado y aplica idempotencia", async () => {
  const titular = await abrirSesion("nuevo");
  const deposito = { idempotencyKey: "deposito-demo" };
  const retiro = { idempotencyKey: "retiro-demo" };
  expect(await listarMovimientos()).toMatchObject({ contenido: [], totalElementos: 0 });
  await expect(depositar("5.00")).rejects.toMatchObject({ status: 400 });
  const resultado = await depositar("50.00", deposito);
  expect(resultado.saldo).toMatchObject({ disponible: "50.00", reservado: "0.00" });
  expect(await depositar(50, deposito)).toEqual(resultado);
  await expect(depositar(51, deposito)).rejects.toMatchObject({ codigo: "CONFLICTO_IDEMPOTENCIA" });
  await expect(retirar("51", retiro)).rejects.toMatchObject({ status: 422 });
  await expect(retirar("51", retiro)).rejects.toMatchObject({ status: 422 });
  expect(await obtenerSaldo()).toMatchObject({ disponible: "50.00" });
  expect(await retirar("12.50", { idempotencyKey: "retiro-valido" })).toMatchObject({
    saldo: { disponible: "37.50" },
  });
  expect(await listarMovimientos({ tipo: "RETIRO" })).toMatchObject({
    contenido: [
      expect.objectContaining({ estado: "COMPLETADO" }),
      expect.objectContaining({ estado: "FALLIDO" }),
    ],
    totalElementos: 2,
  });
  await abrirSesion("laura");
  await expect(listarMovimientos({ inversionistaId: titular.id })).rejects.toMatchObject({
    status: 403,
  });
});

it("protege administración y auditoría y registra los cambios con trazabilidad", async () => {
  await abrirSesion("admin");
  const [mercado] = await gestion.listarHorarios();
  const usuarios = await gestion.listarUsuarios();
  const comisionista = usuarios.find(({ rol }) => rol === "COMISIONISTA");
  await gestion.actualizarUsuario(comisionista.id, { certificado: false });
  expect(await gestion.listarUsuarios()).toContainEqual({ ...comisionista, certificado: false });
  await gestion.actualizarHorario(mercado.codigo, { horaCierre: "17:00" });
  await expect(
    gestion.actualizarParametros({ porcentajePlataforma: 65, porcentajeComisionista: 20 })
  ).rejects.toMatchObject({ codigo: "VALIDACION_FALLIDA" });
  await gestion.actualizarParametros({ porcentajePlataforma: 65, porcentajeComisionista: 35 });
  await expect(gestion.listarEventos()).rejects.toMatchObject({ status: 403 });
  await abrirSesion("legal");
  await expect(gestion.listarHorarios()).rejects.toMatchObject({ status: 403 });
  const restriccion = await gestion.crearRestriccion({
    mercado: mercado.codigo,
    motivo: "Revisión demo",
    referenciaCaso: "CASO-1",
  });
  expect(await gestion.listarRestricciones()).toContainEqual(restriccion);
  await gestion.levantarRestriccion(restriccion.id, {
    motivo: "Cierre demo",
    referenciaCaso: "CASO-1",
  });
  expect(await gestion.listarEventos({ referenciaId: restriccion.id })).toMatchObject({
    contenido: [
      { tipo: "RESTRICCION_LEVANTADA", traceId: expect.any(String) },
      { tipo: "RESTRICCION_CREADA", traceId: expect.any(String) },
    ],
  });
  expect(await gestion.listarEventos({ referenciaId: "sin-coincidencias" })).toMatchObject({
    contenido: [],
  });
});

it("filtra reportes por fechas y autoriza el dashboard únicamente a junta", async () => {
  await abrirSesion("laura");
  expect(await gestion.listarReportes()).toMatchObject([{ titulo: "Resumen de inversiones" }]);
  await expect(gestion.obtenerDashboardEmpresarial()).rejects.toMatchObject({ status: 403 });
  await abrirSesion("junta");
  expect(await gestion.obtenerDashboardEmpresarial()).toMatchObject({ total: "125.00" });
  expect(await gestion.obtenerDashboardEmpresarial({ hasta: "2000-01-01" })).toMatchObject({
    ingresos: [],
    total: "0.00",
  });
  await expect(gestion.listarReportes({ desde: "2026-02-30" })).rejects.toMatchObject({
    status: 400,
  });
});
