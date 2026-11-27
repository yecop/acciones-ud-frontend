import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { utilidadesComisionista } from "../mocks/comisionista.js";
import { ID_PROPUESTA, USUARIO_MATEO } from "../mocks/comisionistaDatos.js";
import { db } from "../mocks/db.js";
import { server } from "../mocks/server.js";
import { renderApp } from "../test/render.jsx";
import { iniciarSesionMock } from "../test/sesionMock.js";

const util = utilidadesComisionista(db);
const CARLOS = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e02";

async function comoMateo() {
  await iniciarSesionMock("mateo@correo.com");
  session.setUsuario({ id: USUARIO_MATEO, nombre: "Mateo", rol: "INV" });
}
async function comoCarlos() {
  await iniciarSesionMock("carlos@correo.com");
  session.setUsuario({ id: CARLOS, nombre: "Carlos", rol: "COM" });
}
const filas = () =>
  within(screen.getByRole("list", { name: /lista de propuestas/i })).getAllByRole("listitem");
const error = (status, codigo) =>
  HttpResponse.json({ status, codigo, mensaje: "x", traceId: "t" }, { status });

describe("lista de propuestas (SCRUM-65)", () => {
  it("el inversionista ve sus propuestas, sin la acción de crear", async () => {
    await comoMateo();
    renderApp("/propuestas");
    await screen.findByRole("list", { name: /lista de propuestas/i });
    expect(filas()).toHaveLength(5);
    expect(screen.getAllByText(/De Carlos R\./).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Nueva propuesta" })).not.toBeInTheDocument();
  });

  it("el comisionista ve el cliente de cada propuesta y puede crear una", async () => {
    await comoCarlos();
    renderApp("/propuestas");
    await screen.findByRole("list", { name: /lista de propuestas/i });
    expect(screen.getAllByText(/Cliente: Mateo/).length).toBe(5);
    expect(screen.getByRole("link", { name: "Nueva propuesta" })).toHaveAttribute(
      "href",
      "/propuestas/nueva"
    );
  });

  it("filtra por estado y distingue el vacío con filtro", async () => {
    const usuario = userEvent.setup();
    await comoMateo();
    renderApp("/propuestas");
    await screen.findByRole("list", { name: /lista de propuestas/i });
    await usuario.selectOptions(screen.getByLabelText("Estado"), "APROBADA");
    await waitFor(() => expect(filas()).toHaveLength(1));
    expect(within(filas()[0]).getByText("Protección con Stop Loss en TSLA")).toBeInTheDocument();
  });

  it("un inversionista sin propuestas ve el estado vacío", async () => {
    await iniciarSesionMock("laura@correo.com");
    session.setUsuario({ id: "1", nombre: "Laura", rol: "INV" });
    renderApp("/propuestas");
    expect(await screen.findByText(/todavía no te ha enviado propuestas/i)).toBeInTheDocument();
  });
});

describe("detalle de propuesta: acciones por rol (SCRUM-65)", () => {
  it("el inversionista ve Aprobar/Rechazar en una pendiente y no puede firmar", async () => {
    await comoMateo();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    expect(
      await screen.findByRole("heading", { name: /ampliar posición en nvidia/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprobar propuesta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rechazar propuesta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Firmar propuesta" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /qué sigue/i })).toHaveTextContent(
      /apruébala o recházala/i
    );
  });

  it("el comisionista no ve acciones en una pendiente ni puede aprobar", async () => {
    await comoCarlos();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    await screen.findByRole("heading", { name: /ampliar posición en nvidia/i });
    expect(
      screen.queryByRole("button", { name: /aprobar|rechazar|firmar/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /qué sigue/i })).toHaveTextContent(
      /esperando la aprobación/i
    );
  });

  it("aprobar pide confirmación y deja el estado actualizado", async () => {
    const usuario = userEvent.setup();
    await comoMateo();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    await usuario.click(await screen.findByRole("button", { name: "Aprobar propuesta" }));

    const dialogo = screen.getByRole("alertdialog", { name: "Confirmar aprobación" });
    expect(dialogo).toHaveTextContent(/autoriza a tu comisionista a firmar 1 orden/i);
    expect(db.trading.comisionista.propuestas[0].estado).toBe("PENDIENTE_APROBACION"); // aún nada
    await usuario.click(within(dialogo).getByRole("button", { name: "Sí, aprobar" }));

    expect(await screen.findByText("Propuesta aprobada. Estado: Aprobada.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprobar propuesta" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /qué sigue/i })).toHaveTextContent(
      /debe firmarla/i
    );
    const pasos = within(screen.getByRole("list", { name: /cambios de estado/i })).getAllByRole(
      "listitem"
    );
    expect(pasos).toHaveLength(2);
    expect(within(pasos[1]).getByText(/Tú · Aprobada por el cliente/)).toBeInTheDocument();
  });

  it("«No» en la confirmación no cambia nada", async () => {
    const usuario = userEvent.setup();
    await comoMateo();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    await usuario.click(await screen.findByRole("button", { name: "Aprobar propuesta" }));
    await usuario.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprobar propuesta" })).toBeInTheDocument();
  });

  it("rechazar exige un motivo y lo muestra después", async () => {
    const usuario = userEvent.setup();
    await comoMateo();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    await usuario.click(await screen.findByRole("button", { name: "Rechazar propuesta" }));
    await usuario.click(screen.getByRole("button", { name: "Sí, rechazar" }));
    expect(screen.getByText(/mínimo 3 caracteres/i)).toBeInTheDocument();

    await usuario.type(screen.getByLabelText("Motivo del rechazo"), "Prefiero esperar");
    await usuario.click(screen.getByRole("button", { name: "Sí, rechazar" }));
    expect(await screen.findByText("Propuesta rechazada. Estado: Rechazada.")).toBeInTheDocument();
    expect(screen.getByText(/Motivo del rechazo: Prefiero esperar/)).toBeInTheDocument();
  });

  it("el comisionista firma una aprobada con confirmación y se crean las órdenes", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    renderApp(`/propuestas/${ID_PROPUESTA(2)}`);
    await usuario.click(await screen.findByRole("button", { name: "Firmar propuesta" }));

    const dialogo = screen.getByRole("alertdialog", { name: "Confirmar firma" });
    expect(dialogo).toHaveTextContent(/se crearán 1 orden a nombre de Mateo/i);
    await usuario.click(within(dialogo).getByRole("button", { name: "Sí, firmar" }));

    expect(await screen.findByText("Propuesta firmada. Estado: Firmada.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Firmar propuesta" })).not.toBeInTheDocument();
    const orden = db.trading.ordenes.find((o) => o.usuarioId === USUARIO_MATEO);
    expect(orden).toMatchObject({ ticker: "TSLA", estado: "FIRMADA_POR_COMISIONISTA" });
  });

  it("el inversionista no ve «Firmar» en una aprobada y ve el enlace a las órdenes de una firmada", async () => {
    await comoMateo();
    const { unmount } = renderApp(`/propuestas/${ID_PROPUESTA(2)}`);
    await screen.findByRole("heading", { name: /protección con stop loss/i });
    expect(
      screen.queryByRole("button", { name: /firmar|aprobar|rechazar/i })
    ).not.toBeInTheDocument();
    unmount();

    db.trading.comisionista.propuestas.find((p) => p.id === ID_PROPUESTA(3)).ordenesIds = ["abc"];
    renderApp(`/propuestas/${ID_PROPUESTA(3)}`);
    expect(await screen.findByRole("link", { name: "Ver orden 1" })).toHaveAttribute(
      "href",
      "/historial/abc"
    );
  });

  it("si la propuesta venció mientras se miraba, avisa y muestra el estado real", async () => {
    const usuario = userEvent.setup();
    await comoMateo();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    await usuario.click(await screen.findByRole("button", { name: "Aprobar propuesta" }));
    util.vencer(ID_PROPUESTA(1));
    await usuario.click(screen.getByRole("button", { name: "Sí, aprobar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/venció/i);
    await waitFor(() =>
      expect(screen.getAllByText("Vencida", { selector: "span" }).length).toBeGreaterThan(0)
    );
    expect(screen.queryByRole("button", { name: "Aprobar propuesta" })).not.toBeInTheDocument();
  });

  it("una propuesta con el plazo vencido en pantalla no ofrece acciones", async () => {
    await comoMateo();
    db.trading.comisionista.propuestas.find((p) => p.id === ID_PROPUESTA(2)).venceEn = new Date(
      Date.now() - 1000
    ).toISOString();
    renderApp(`/propuestas/${ID_PROPUESTA(2)}`);
    // El servidor la marca VENCIDA al consultarla.
    expect((await screen.findAllByText("Vencida", { selector: "span" })).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /aprobar|rechazar|firmar/i })
    ).not.toBeInTheDocument();
  });

  it("una propuesta ajena muestra «no encontramos» (404)", async () => {
    await iniciarSesionMock("laura@correo.com");
    session.setUsuario({ id: "1", nombre: "Laura", rol: "INV" });
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no encontramos esta propuesta/i);
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("maneja 403 al actuar, y errores de red con reintento", async () => {
    const usuario = userEvent.setup();
    await comoMateo();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    await usuario.click(await screen.findByRole("button", { name: "Aprobar propuesta" }));
    server.use(
      mswHttp.post("*/api/v1/propuestas/:id/aprobar", () => error(403, "ACCESO_DENEGADO"))
    );
    await usuario.click(screen.getByRole("button", { name: "Sí, aprobar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/tu rol no permite/i);
  });

  it("si no hay red al cargar, se puede reintentar", async () => {
    const usuario = userEvent.setup();
    server.use(mswHttp.get("*/api/v1/propuestas/:id", () => HttpResponse.error()));
    await comoMateo();
    renderApp(`/propuestas/${ID_PROPUESTA(1)}`);
    expect(await screen.findByText(/no pudimos conectarnos/i)).toBeInTheDocument();
    server.resetHandlers();
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByRole("heading", { name: /ampliar posición en nvidia/i })
    ).toBeInTheDocument();
  });
});

describe("nueva propuesta (SCRUM-65)", () => {
  it("valida antes de enviar", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    renderApp("/propuestas/nueva");
    await screen.findByLabelText("Título");
    await usuario.click(screen.getByRole("button", { name: "Enviar propuesta" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/elige el cliente/i);
    expect(alerta).toHaveTextContent(/título debe tener/i);
    expect(alerta).toHaveTextContent(/orden 1: escribe un ticker válido/i);
    expect(alerta).toHaveTextContent(/orden 1: la cantidad/i);
  });

  it("crea la propuesta y abre su detalle en «Pendiente de aprobación»", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    renderApp(`/propuestas/nueva?clienteId=${USUARIO_MATEO}`);
    await screen.findByLabelText("Título");
    expect(screen.getByLabelText("Cliente")).toHaveValue(USUARIO_MATEO);

    await usuario.type(screen.getByLabelText("Título"), "Comprar AAPL");
    await usuario.selectOptions(
      screen.getByLabelText("Estrategia (opcional)"),
      "Crecimiento tecnológico"
    );
    await usuario.type(screen.getByLabelText("Ticker de la orden 1"), "aapl");
    await usuario.selectOptions(screen.getByLabelText("Tipo de la orden 1"), "LIMIT");
    await usuario.type(screen.getByLabelText("Cantidad de la orden 1"), "3");
    await usuario.type(screen.getByLabelText("Precio límite de la orden 1"), "180");
    await usuario.click(screen.getByRole("button", { name: "Enviar propuesta" }));

    expect(await screen.findByRole("heading", { name: "Comprar AAPL" })).toBeInTheDocument();
    expect(
      screen.getAllByText("Pendiente de aprobación", { selector: "span" }).length
    ).toBeGreaterThan(0);
    expect(db.trading.comisionista.propuestas[0]).toMatchObject({
      titulo: "Comprar AAPL",
      clienteId: USUARIO_MATEO,
      ordenes: [{ ticker: "AAPL", tipo: "LIMIT", cantidad: 3, precioLimite: "180.00" }],
    });
  });

  it("muestra los errores del servidor (ticker inexistente)", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    renderApp("/propuestas/nueva");
    await screen.findByLabelText("Título");
    await usuario.selectOptions(screen.getByLabelText("Cliente"), USUARIO_MATEO);
    await usuario.type(screen.getByLabelText("Título"), "Ticker raro");
    await usuario.type(screen.getByLabelText("Ticker de la orden 1"), "ZZZZ");
    await usuario.type(screen.getByLabelText("Cantidad de la orden 1"), "1");
    await usuario.click(screen.getByRole("button", { name: "Enviar propuesta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ticker/i);
  });

  it("permite agregar y quitar órdenes", async () => {
    const usuario = userEvent.setup();
    await comoCarlos();
    renderApp("/propuestas/nueva");
    await screen.findByLabelText("Título");
    expect(screen.queryByRole("button", { name: /quitar orden/i })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Agregar otra orden" }));
    expect(screen.getByLabelText("Ticker de la orden 2")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Quitar orden 2" }));
    expect(screen.queryByLabelText("Ticker de la orden 2")).not.toBeInTheDocument();
  });

  it("el inversionista no accede a la pantalla de nueva propuesta", async () => {
    await comoMateo();
    renderApp("/propuestas/nueva");
    expect(screen.queryByRole("heading", { name: "Nueva propuesta" })).not.toBeInTheDocument();
  });
});
