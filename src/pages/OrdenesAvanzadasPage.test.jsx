import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { db } from "../mocks/db.js";
import { utilidadesOrdenes } from "../mocks/ordenes.js";
import { server } from "../mocks/server.js";
import { renderApp } from "../test/render.jsx";
import { iniciarSesionMock } from "../test/sesionMock.js";

const util = utilidadesOrdenes(db);

async function entrar() {
  await iniciarSesionMock("laura@correo.com");
  session.setUsuario({ id: "1", nombre: "Prueba", rol: "INV" });
}

describe("órdenes avanzadas y encolamiento (SCRUM-64)", () => {
  beforeEach(() => util.mercado(true));
  afterEach(() => {
    util.limpiar();
    server.resetHandlers();
  });

  it("cada tipo con precio tiene su etiqueta, su ayuda y la referencia al precio actual", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    await usuario.click(await screen.findByRole("tab", { name: "Limit Order" }));
    expect(screen.getByLabelText("Precio límite")).toBeInTheDocument();
    expect(screen.getByText(/precio máximo que pagas/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole("tab", { name: "Stop Loss" }));
    expect(screen.getByLabelText("Precio stop")).toBeInTheDocument();
    expect(screen.getByText(/para limitar pérdidas/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole("tab", { name: "Take Profit" }));
    expect(screen.getByLabelText("Precio objetivo")).toBeInTheDocument();
    expect(screen.getByText(/^precio actual/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole("tab", { name: "Market Order" }));
    expect(screen.queryByLabelText(/^precio/i)).not.toBeInTheDocument();
  });

  it("muestra cuánto se aleja el precio del actual y avisa de un Stop Loss de venta mal ubicado", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    await usuario.click(await screen.findByRole("button", { name: "Vender" }));
    await usuario.click(screen.getByRole("tab", { name: "Stop Loss" }));
    const precio = screen.getByLabelText("Precio stop");

    await usuario.type(precio, "9999");
    expect(await screen.findByText(/sobre el precio actual/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/debería estar por debajo/i);

    await usuario.clear(precio);
    await usuario.type(precio, "1");
    expect(await screen.findByText(/bajo el precio actual/i)).toBeInTheDocument();
    expect(screen.queryByText(/debería estar por debajo/i)).not.toBeInTheDocument();
  });

  it("el aviso no bloquea: se puede crear la orden igualmente", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    db.trading.saldos["5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01"].disponible = "100000.00";
    await usuario.click(await screen.findByRole("tab", { name: "Limit Order" }));
    await usuario.type(screen.getByLabelText("Cantidad"), "1");
    await usuario.type(screen.getByLabelText("Precio límite"), "9999"); // compra muy por encima
    expect(await screen.findByText(/se ejecutaría de inmediato/i)).toBeInTheDocument();
    const boton = await screen.findByRole("button", { name: /ejecutar orden|encolar orden/i });
    await waitFor(() => expect(boton).toBeEnabled());
  });

  it("crea una orden Take Profit con el precio como precioStop", async () => {
    const usuario = userEvent.setup();
    await entrar();
    db.trading.saldos["5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01"].disponible = "100000.00";
    renderApp("/operar");

    await usuario.click(await screen.findByRole("tab", { name: "Take Profit" }));
    await usuario.type(screen.getByLabelText("Cantidad"), "1");
    await usuario.type(screen.getByLabelText("Precio objetivo"), "400");
    await usuario.click(await screen.findByRole("button", { name: "Ejecutar Orden" }));

    expect(await screen.findByText(/Orden creada/)).toBeInTheDocument();
    expect(db.trading.ordenes[0]).toMatchObject({
      tipo: "TAKE_PROFIT",
      precioStop: "400.00",
      estado: "PENDIENTE",
    });
  });

  it("con el mercado cerrado explica el encolamiento antes de enviar", async () => {
    util.mercado(false);
    await entrar();
    renderApp("/operar");

    const nota = await screen.findByRole("note");
    expect(nota).toHaveTextContent(/encolada/i);
    expect(nota).toHaveTextContent(/próxima apertura/i);
    expect(screen.getByRole("button", { name: "Encolar Orden" })).toBeInTheDocument();
  });

  it("con el mercado abierto no hay aviso de encolamiento", async () => {
    await entrar();
    renderApp("/operar");
    await screen.findByRole("tab", { name: "Market Order" });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
