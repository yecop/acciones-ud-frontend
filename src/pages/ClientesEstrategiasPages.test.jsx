import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { USUARIO_MATEO, USUARIO_VALENTINA } from "../mocks/comisionistaDatos.js";
import { db } from "../mocks/db.js";
import { crearOrdenFirmada } from "../mocks/ordenes.js";
import { server } from "../mocks/server.js";
import { renderApp } from "../test/render.jsx";
import { iniciarSesionMock } from "../test/sesionMock.js";

const CARLOS = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e02";

async function comoCarlos() {
  await iniciarSesionMock("carlos@correo.com");
  session.setUsuario({ id: CARLOS, nombre: "Carlos", rol: "COM" });
}

describe("clientes del comisionista (SCRUM-65)", () => {
  it("lista solo a los clientes asignados", async () => {
    await comoCarlos();
    renderApp("/comisionista");
    const lista = await screen.findByRole("list", { name: /lista de clientes/i });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(1);
    expect(within(lista).getByText("Mateo")).toBeInTheDocument();
    expect(screen.queryByText("Valentina")).not.toBeInTheDocument();
    expect(within(lista).getByText(/2 propuestas activas/)).toBeInTheDocument();
  });

  it("abre el detalle del cliente con saldo, posiciones y órdenes de solo lectura", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    crearOrdenFirmada(
      db.trading,
      db.usuarios.find((u) => u.id === USUARIO_MATEO),
      { id: CARLOS },
      {
        ticker: "XOM",
        lado: "COMPRA",
        tipo: "MARKET",
        cantidad: 1,
      }
    );
    renderApp("/comisionista");
    await usuario.click(await screen.findByRole("link", { name: "Ver cliente Mateo" }));

    expect(await screen.findByRole("heading", { name: "Mateo" })).toBeInTheDocument();
    expect(screen.getByText("Disponible").nextSibling).toHaveTextContent(/6\.800/);
    expect(await screen.findByRole("region", { name: /tabla de posiciones/i })).toBeInTheDocument();
    const tabla = await screen.findByRole("region", { name: /tabla de órdenes/i });
    expect(within(tabla).getByText("XOM")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar orden/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /nueva propuesta para mateo/i })).toHaveAttribute(
      "href",
      `/propuestas/nueva?clienteId=${USUARIO_MATEO}`
    );
  });

  it("no permite ver a un cliente ajeno cambiando la URL (404 → mensaje, sin datos)", async () => {
    await comoCarlos();
    renderApp(`/comisionista/clientes/${USUARIO_VALENTINA}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no encontramos este cliente, o no está asignado a tu cuenta/i
    );
    expect(screen.queryByText("Valentina")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /tabla de posiciones/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("si el servidor responde 403 por el cliente, también se bloquea el acceso", async () => {
    server.use(
      mswHttp.get("*/api/v1/clientes/:id", () =>
        HttpResponse.json(
          { status: 403, codigo: "ACCESO_DENEGADO", mensaje: "x", traceId: "t" },
          { status: 403 }
        )
      )
    );
    await comoCarlos();
    renderApp(`/comisionista/clientes/${USUARIO_MATEO}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(/tu rol no permite/i);
    expect(screen.queryByRole("heading", { name: "Mateo" })).not.toBeInTheDocument();
  });

  it("un inversionista no accede a las pantallas del comisionista", async () => {
    await iniciarSesionMock("laura@correo.com");
    session.setUsuario({ id: "1", nombre: "Laura", rol: "INV" });
    const { unmount } = renderApp(`/comisionista/clientes/${USUARIO_MATEO}`);
    expect(screen.queryByRole("heading", { name: "Mateo" })).not.toBeInTheDocument();
    unmount();
    renderApp("/comisionista");
    expect(screen.queryByRole("heading", { name: "Mis clientes" })).not.toBeInTheDocument();
  });

  it("un comisionista sin clientes ve el estado vacío", async () => {
    await comoCarlos();
    db.usuarios.find((u) => u.id === USUARIO_MATEO).comisionista = null;
    renderApp("/comisionista");
    expect(await screen.findByText(/todavía no tienes clientes asignados/i)).toBeInTheDocument();
  });
});

describe("estrategias (SCRUM-65)", () => {
  const items = () =>
    within(screen.getByRole("list", { name: /lista de estrategias/i })).getAllByRole("listitem");

  it("lista, crea, edita, archiva y reactiva", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    renderApp("/estrategias");
    await screen.findByRole("list", { name: /lista de estrategias/i });
    expect(items()).toHaveLength(3);

    await usuario.click(screen.getByRole("button", { name: "Nueva estrategia" }));
    await usuario.type(screen.getByLabelText("Nombre"), "Defensiva");
    await usuario.selectOptions(screen.getByLabelText("Perfil de riesgo"), "CONSERVADOR");
    await usuario.click(screen.getByRole("button", { name: "Guardar estrategia" }));
    expect(await screen.findByText("Estrategia creada.")).toBeInTheDocument();
    await waitFor(() => expect(items()).toHaveLength(4));

    await usuario.click(screen.getByRole("button", { name: "Editar Defensiva" }));
    await usuario.clear(screen.getByLabelText("Nombre"));
    await usuario.type(screen.getByLabelText("Nombre"), "Defensiva plus");
    await usuario.click(screen.getByRole("button", { name: "Guardar estrategia" }));
    expect(await screen.findByText("Estrategia actualizada.")).toBeInTheDocument();
    expect(await screen.findByText("Defensiva plus")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Archivar Defensiva plus" }));
    expect(await screen.findByText(/«Defensiva plus» quedó archivada/)).toBeInTheDocument();
    await usuario.click(await screen.findByRole("button", { name: "Reactivar Defensiva plus" }));
    expect(await screen.findByText(/está activa otra vez/)).toBeInTheDocument();
  });

  it("valida el nombre y muestra los errores del servidor", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    renderApp("/estrategias");
    await usuario.click(await screen.findByRole("button", { name: "Nueva estrategia" }));
    await usuario.type(screen.getByLabelText("Nombre"), "ab");
    await usuario.click(screen.getByRole("button", { name: "Guardar estrategia" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/entre 3 y 60/i);

    server.use(
      mswHttp.post("*/api/v1/estrategias", () =>
        HttpResponse.json(
          { status: 403, codigo: "ACCESO_DENEGADO", mensaje: "x", traceId: "t" },
          { status: 403 }
        )
      )
    );
    await usuario.type(screen.getByLabelText("Nombre"), "c");
    await usuario.click(screen.getByRole("button", { name: "Guardar estrategia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/tu rol no permite/i);
  });

  it("un inversionista no accede a estrategias", async () => {
    await iniciarSesionMock("laura@correo.com");
    session.setUsuario({ id: "1", nombre: "Laura", rol: "INV" });
    renderApp("/estrategias");
    expect(screen.queryByRole("heading", { name: "Estrategias" })).not.toBeInTheDocument();
  });
});
