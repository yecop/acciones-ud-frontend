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

async function entrar(correo = "laura@correo.com", rol = "INV") {
  await iniciarSesionMock(correo);
  session.setUsuario({ id: "1", nombre: "Prueba", rol });
}

const filas = () => screen.getAllByRole("row").slice(1);

describe("historial de órdenes (SCRUM-62)", () => {
  beforeEach(() => util.mercado(true));
  afterEach(() => {
    util.limpiar();
    server.resetHandlers();
  });

  it("lista todas las órdenes del usuario con enlace al detalle", async () => {
    await entrar();
    renderApp("/historial");

    expect(
      await screen.findByRole("heading", { name: "Historial de órdenes" })
    ).toBeInTheDocument();
    await screen.findByRole("region", { name: /tabla de órdenes/i });
    expect(filas()).toHaveLength(8);
    const enlace = screen.getAllByRole("link", { name: /ver detalle de la orden de msft/i })[0];
    expect(enlace).toHaveAttribute("href", "/historial/0a000000-0000-4000-8000-000000000001");
  });

  it("filtra por estado desde el formulario y conserva el filtro aplicado", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/historial");
    await screen.findByRole("region", { name: /tabla de órdenes/i });

    await usuario.selectOptions(screen.getByLabelText("Estado"), "CANCELADA");
    await usuario.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(within(filas()[0]).getByText("TSLA")).toBeInTheDocument();
    expect(screen.getByLabelText("Estado")).toHaveValue("CANCELADA");
  });

  it("lee los filtros de la URL (operación y acción)", async () => {
    await entrar();
    renderApp("/historial?lado=VENTA&ticker=AAPL");
    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(screen.getByLabelText("Operación")).toHaveValue("VENTA");
    expect(screen.getByLabelText("Acción (ticker)")).toHaveValue("AAPL");
  });

  it("un rango de fechas invertido muestra el error y no consulta", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/historial");
    await screen.findByRole("region", { name: /tabla de órdenes/i });

    await usuario.type(screen.getByLabelText("Desde"), "2026-11-20");
    await usuario.type(screen.getByLabelText("Hasta"), "2026-11-10");
    await usuario.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/desde/i);
    expect(filas()).toHaveLength(8); // no se aplicó el filtro
  });

  it("pagina de a 10 y navega entre páginas", async () => {
    const usuario = userEvent.setup();
    await entrar();
    const base = db.trading.ordenes.find((o) => o.id.endsWith("02"));
    for (let i = 0; i < 7; i += 1) {
      db.trading.ordenes.push({ ...base, id: `0b000000-0000-4000-8000-00000000000${i}` });
    }
    renderApp("/historial");

    expect(await screen.findByText(/página 1 de 2/i)).toBeInTheDocument();
    expect(filas()).toHaveLength(10);
    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText(/página 2 de 2/i)).toBeInTheDocument();
    await waitFor(() => expect(filas()).toHaveLength(5));
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("distingue «sin resultados» con filtros de la cuenta sin órdenes", async () => {
    await entrar();
    const { unmount } = renderApp("/historial?ticker=ZZZZ");
    expect(await screen.findByText(/ninguna orden coincide/i)).toBeInTheDocument();
    unmount();

    await entrar("nuevo@correo.com");
    renderApp("/historial");
    expect(await screen.findByText(/todavía no tienes órdenes/i)).toBeInTheDocument();
  });

  it("si falla la lista muestra el error y permite reintentar", async () => {
    const usuario = userEvent.setup();
    server.use(
      mswHttp.get("*/api/v1/ordenes", () =>
        HttpResponse.json(
          { status: 500, codigo: "ERROR_INTERNO", mensaje: "x", traceId: "t-1" },
          { status: 500 }
        )
      )
    );
    await entrar();
    renderApp("/historial");
    expect(await screen.findByText(/error inesperado/i)).toBeInTheDocument();
    server.resetHandlers();
    await usuario.click(screen.getAllByRole("button", { name: /reintentar/i })[0]);
    expect(await screen.findByRole("region", { name: /tabla de órdenes/i })).toBeInTheDocument();
  });

  it("el comisionista no accede al historial del inversionista", async () => {
    await entrar("carlos@correo.com", "COM");
    renderApp("/historial");
    expect(screen.queryByRole("heading", { name: "Historial de órdenes" })).not.toBeInTheDocument();
  });
});
