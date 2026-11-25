import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { db } from "../mocks/db.js";
import { utilidadesOrdenes } from "../mocks/ordenes.js";
import { server } from "../mocks/server.js";
import { renderApp } from "../test/render.jsx";
import { iniciarSesionMock } from "../test/sesionMock.js";

const util = utilidadesOrdenes(db);
const LAURA = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01";
const ID_MSFT_PENDIENTE = "0a000000-0000-4000-8000-000000000001";

async function entrar(correo = "laura@correo.com", rol = "INV") {
  await iniciarSesionMock(correo);
  session.setUsuario({ id: "1", nombre: "Prueba", rol });
}

/** Escribe la cantidad y espera a que llegue la simulación del backend (comisión mostrada). */
async function escribirCantidad(usuario, cantidad) {
  await usuario.type(await screen.findByLabelText("Cantidad"), String(cantidad));
}

const filas = () => screen.getAllByRole("row").slice(1);

describe("pantalla Operar (SCRUM-61)", () => {
  beforeEach(() => util.mercado(true));
  afterEach(() => {
    util.limpiar();
    server.resetHandlers();
  });

  it("muestra el formulario con la acción elegida y la lista de órdenes del usuario", async () => {
    await entrar();
    renderApp("/operar?ticker=MSFT");

    expect(await screen.findByRole("heading", { name: "Operar" })).toBeInTheDocument();
    expect(await screen.findByText(/MSFT · Microsoft Corp\./)).toBeInTheDocument();
    expect(screen.getByLabelText("Acción")).toHaveValue("MSFT");
    expect(await screen.findByRole("region", { name: /tabla de órdenes/i })).toBeInTheDocument();
    expect(filas()).toHaveLength(8);
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
    expect(screen.getByText("Ejecutada")).toBeInTheDocument(); // EN_EJECUCION con todo ejecutado
  });

  it("crea una orden de mercado con los totales de la simulación y la agrega a la lista", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    await escribirCantidad(usuario, 2);
    // Comisión 2 % calculada por el backend: 353.00 + 7.06.
    expect(await screen.findByText(/360,06/)).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ejecutar Orden" }));

    expect(await screen.findByText(/Orden creada · En ejecución/)).toBeInTheDocument();
    await waitFor(() => expect(filas()).toHaveLength(9));
    expect(db.trading.ordenes[0]).toMatchObject({
      ticker: "AAPL",
      cantidad: 2,
      estado: "EN_EJECUCION",
    });

    // «Crear otra orden» limpia el formulario.
    await usuario.click(screen.getByRole("button", { name: /crear otra orden/i }));
    expect(screen.getByLabelText("Cantidad")).toHaveValue("");
  });

  it("compra sin fondos: avisa y no deja enviar", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    await escribirCantidad(usuario, 100);
    expect(await screen.findByText(/fondos insuficientes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ejecutar Orden" })).toBeDisabled();
  });

  it("una venta no exige fondos: valida acciones; sin acciones avisa y bloquea", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar?ticker=AMZN");

    await usuario.click(await screen.findByRole("button", { name: "Vender" }));
    await escribirCantidad(usuario, 1);
    expect(await screen.findByText(/no tienes suficientes acciones/i)).toBeInTheDocument();
    expect(screen.queryByText(/fondos insuficientes/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ejecutar Orden" })).toBeDisabled();
  });

  it("una venta con acciones muestra el neto y se crea aunque el total supere el saldo", async () => {
    const usuario = userEvent.setup();
    await entrar();
    db.trading.saldos[LAURA].disponible = 1; // el saldo no importa al vender
    renderApp("/operar");

    await usuario.click(await screen.findByRole("button", { name: "Vender" }));
    await escribirCantidad(usuario, 1);
    expect(await screen.findByText(/recibirás/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ejecutar Orden" }));
    expect(await screen.findByText(/Orden creada/)).toBeInTheDocument();
  });

  it("mercado cerrado: pide confirmar el encolamiento y deja la orden PENDIENTE", async () => {
    const usuario = userEvent.setup();
    util.mercado(false);
    await entrar();
    renderApp("/operar");

    await escribirCantidad(usuario, 1);
    await screen.findByText(/mercado cerrado/i);
    await usuario.click(await screen.findByRole("button", { name: "Encolar Orden" }));
    expect(
      screen.getByRole("alertdialog", { name: /confirmar encolamiento/i })
    ).toBeInTheDocument();
    expect(db.trading.ordenes[0].ticker).not.toBe("AAPL"); // todavía no se envió

    await usuario.click(screen.getByRole("button", { name: /confirmar y encolar/i }));
    expect(await screen.findByText(/Orden encolada · Pendiente/)).toBeInTheDocument();
    expect(db.trading.ordenes[0]).toMatchObject({
      ticker: "AAPL",
      estado: "PENDIENTE",
      encolada: true,
    });
  });

  it("«Volver» en la confirmación no envía nada", async () => {
    const usuario = userEvent.setup();
    util.mercado(false);
    await entrar();
    renderApp("/operar");
    await escribirCantidad(usuario, 1);
    await usuario.click(await screen.findByRole("button", { name: "Encolar Orden" }));
    await usuario.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByRole("button", { name: "Encolar Orden" })).toBeInTheDocument();
    expect(db.trading.ordenes).toHaveLength(8);
  });

  it("un 502 se reintenta con la misma Idempotency-Key y no duplica la orden", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    await escribirCantidad(usuario, 1);
    const boton = await screen.findByRole("button", { name: "Ejecutar Orden" });
    const antes = db.trading.ordenes.length;
    util.fallar("PROVEEDOR_NO_DISPONIBLE", { ruta: "/ordenes" });
    await usuario.click(boton);

    expect(await screen.findByText(/Orden creada/)).toBeInTheDocument();
    expect(db.trading.ordenes).toHaveLength(antes + 1);
  });

  it("un error definitivo muestra el mensaje del catálogo y permite editar", async () => {
    const usuario = userEvent.setup();
    db.usuarios.find((u) => u.id === LAURA).preferencias.operaciones.limiteDiario = "100.00";
    await entrar();
    renderApp("/operar");

    await escribirCantidad(usuario, 1);
    await usuario.click(await screen.findByRole("button", { name: "Ejecutar Orden" }));
    expect(
      await screen.findByText(/alcanzaste el máximo de operaciones diarias/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /editar orden/i }));
    expect(screen.getByRole("button", { name: "Ejecutar Orden" })).toBeInTheDocument();
  });

  it("doble autorización: pide el código, rechaza uno malo y crea la orden con el bueno", async () => {
    const usuario = userEvent.setup();
    const laura = db.usuarios.find((u) => u.id === LAURA);
    laura.preferencias.operaciones.dobleAutorizacion = true;
    laura.preferencias.operaciones.umbralOrdenGrande = "100.00";
    await entrar();
    renderApp("/operar");

    await escribirCantidad(usuario, 1);
    await usuario.click(await screen.findByRole("button", { name: "Ejecutar Orden" }));
    expect(await screen.findByText(/requiere una autorización adicional/i)).toBeInTheDocument();

    const campo = screen.getByLabelText("Código de autorización");
    await usuario.type(campo, "000000");
    await usuario.click(screen.getByRole("button", { name: /autorizar y enviar/i }));
    expect(await screen.findByText(/incorrecto o venció/i)).toBeInTheDocument();

    expect(campo).toHaveValue("000000"); // no pierde lo escrito al fallar
    await usuario.clear(campo);
    await usuario.type(campo, "654321");
    await usuario.click(screen.getByRole("button", { name: /autorizar y enviar/i }));
    expect(await screen.findByText(/Orden creada/)).toBeInTheDocument();
    expect(db.trading.ordenes[0].validadaPor).toBe(LAURA);
  });

  it("cancelar una orden pendiente pide confirmación y libera el saldo", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    await usuario.click(await screen.findByRole("button", { name: /cancelar orden de msft/i }));
    expect(screen.getByText(/¿cancelar compra de 1 msft\?/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /sí, cancelar/i }));

    expect(await screen.findByText(/se liberaron .*351,20/i)).toBeInTheDocument();
    await waitFor(() => {
      const fila = document.querySelector(`[data-orden-id="${ID_MSFT_PENDIENTE}"]`);
      expect(within(fila).getByText("Cancelada")).toBeInTheDocument();
    });
    expect(db.trading.saldos[LAURA].reservado).toBe(0);
  });

  it("solo las órdenes pendientes o en revisión tienen botón de cancelar", async () => {
    await entrar();
    renderApp("/operar");
    await screen.findByRole("region", { name: /tabla de órdenes/i });
    expect(screen.getAllByRole("button", { name: /cancelar orden de/i })).toHaveLength(2);
  });

  it("si la orden ya no se puede cancelar, explica por qué y refresca la lista", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");
    await usuario.click(await screen.findByRole("button", { name: /cancelar orden de msft/i }));
    util.estado(ID_MSFT_PENDIENTE, "EN_EJECUCION"); // el mercado la tomó mientras tanto
    await usuario.click(screen.getByRole("button", { name: /sí, cancelar/i }));
    expect(await screen.findByText(/ya no se puede cancelar/i)).toBeInTheDocument();
  });

  it("estado vacío para una cuenta sin órdenes", async () => {
    await entrar("nuevo@correo.com");
    renderApp("/operar");
    expect(await screen.findByText(/todavía no tienes órdenes/i)).toBeInTheDocument();
  });

  it("si falla la lista muestra el error y permite reintentar", async () => {
    const usuario = userEvent.setup();
    server.use(
      mswHttp.get("*/api/v1/ordenes", () =>
        HttpResponse.json(
          { status: 500, codigo: "ERROR_INTERNO", mensaje: "x", traceId: "trace-1" },
          { status: 500 }
        )
      )
    );
    await entrar();
    renderApp("/operar");
    expect(await screen.findByText(/error inesperado/i)).toBeInTheDocument();
    server.resetHandlers();
    await usuario.click(screen.getAllByRole("button", { name: /reintentar/i })[0]);
    expect(await screen.findByRole("region", { name: /tabla de órdenes/i })).toBeInTheDocument();
  });

  it("un comisionista ve un aviso en vez del formulario", async () => {
    await entrar("carlos@correo.com", "COM");
    renderApp("/operar");
    expect(await screen.findByText(/se proponen y se firman/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ejecutar Orden" })).not.toBeInTheDocument();
  });
});
