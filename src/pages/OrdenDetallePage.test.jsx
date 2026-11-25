import { screen, within } from "@testing-library/react";
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
const id = (n) => `0a000000-0000-4000-8000-00000000000${n}`;

async function entrar() {
  await iniciarSesionMock("laura@correo.com");
  session.setUsuario({ id: LAURA, nombre: "Laura", rol: "INV" });
}

describe("detalle de orden (SCRUM-62)", () => {
  beforeEach(() => util.mercado(true));
  afterEach(() => {
    util.limpiar();
    server.resetHandlers();
  });

  it("muestra el resumen, las ejecuciones y la línea de tiempo de una orden ejecutada", async () => {
    await entrar();
    renderApp(`/historial/${id(2)}`);

    expect(await screen.findByRole("heading", { name: /compra de aapl/i })).toBeInTheDocument();
    expect(screen.getByText("Ejecutada", { selector: "span" })).toBeInTheDocument();
    const ejecuciones = screen.getByRole("region", { name: /tabla de ejecuciones/i });
    expect(within(ejecuciones).getAllByRole("row").length).toBeGreaterThan(1);

    const linea = within(await screen.findByRole("list", { name: /cambios de estado/i }));
    expect(linea.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/precio de referencia/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sistema|Tú/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /volver al historial/i })).toHaveAttribute(
      "href",
      "/historial"
    );
  });

  it("la línea de tiempo muestra quién hizo cada cambio, en orden cronológico", async () => {
    await entrar();
    renderApp(`/historial/${id(3)}`);
    const linea = await screen.findByRole("list", { name: /cambios de estado/i });
    const pasos = within(linea).getAllByRole("listitem");
    expect(pasos).toHaveLength(2);
    expect(within(pasos[0]).getByText("Pendiente")).toBeInTheDocument();
    expect(within(pasos[1]).getByText("Cancelada")).toBeInTheDocument();
    expect(within(pasos[1]).getByText(/Tú · Cancelada por el usuario/)).toBeInTheDocument();
  });

  it("una orden sin ejecuciones lo indica", async () => {
    await entrar();
    renderApp(`/historial/${id(3)}`);
    expect(await screen.findByText(/todavía no tiene ejecuciones/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar orden/i })).not.toBeInTheDocument();
  });

  it("cancela una orden pendiente desde el detalle y refresca el estado", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp(`/historial/${id(1)}`);

    await usuario.click(await screen.findByRole("button", { name: /cancelar orden de msft/i }));
    await usuario.click(screen.getByRole("button", { name: /sí, cancelar/i }));

    expect(await screen.findByText(/orden cancelada/i)).toBeInTheDocument();
    expect((await screen.findAllByText("Cancelada", { selector: "span" })).length).toBeGreaterThan(
      0
    );
    expect(db.trading.ordenes.find((o) => o.id === id(1)).estado).toBe("CANCELADA");
  });

  it("una orden inexistente o ajena muestra el 404", async () => {
    await entrar();
    renderApp("/historial/0a000000-0000-4000-8000-0000000000ff");
    expect(await screen.findByText(/no existe o no te pertenece/i)).toBeInTheDocument();
  });

  it("si falla solo el historial, el resumen sigue visible y se puede reintentar", async () => {
    const usuario = userEvent.setup();
    server.use(
      mswHttp.get("*/api/v1/ordenes/:id/historial", () =>
        HttpResponse.json(
          { status: 500, codigo: "ERROR_INTERNO", mensaje: "x", traceId: "t-2" },
          { status: 500 }
        )
      )
    );
    await entrar();
    renderApp(`/historial/${id(2)}`);

    expect(await screen.findByRole("heading", { name: /compra de aapl/i })).toBeInTheDocument();
    expect(await screen.findByText(/error inesperado/i)).toBeInTheDocument();
    server.resetHandlers();
    await usuario.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByRole("list", { name: /cambios de estado/i })).toBeInTheDocument();
  });
});
