import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { db } from "../mocks/db.js";
import { utilidadesNotificaciones } from "../mocks/notificaciones.js";
import { utilidadesOrdenes } from "../mocks/ordenes.js";
import { server } from "../mocks/server.js";
import { renderApp } from "../test/render.jsx";
import { iniciarSesionMock } from "../test/sesionMock.js";

const util = utilidadesNotificaciones(db);
const LAURA = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01";

async function entrar(correo = "laura@correo.com", rol = "INV", id = LAURA) {
  await iniciarSesionMock(correo);
  session.setUsuario({ id, nombre: "Prueba", rol });
}

const items = () =>
  within(screen.getByRole("list", { name: /lista de notificaciones/i })).getAllByRole("listitem");

describe("centro de notificaciones (SCRUM-63)", () => {
  afterEach(() => {
    utilidadesOrdenes(db).limpiar();
    server.resetHandlers();
  });

  it("la campana de la barra muestra cuántas están sin leer y abre el centro", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/operar");

    const campana = await screen.findByRole("button", { name: "Notificaciones, 2 sin leer" });
    await usuario.click(campana);
    expect(await screen.findByRole("heading", { name: "Notificaciones" })).toBeInTheDocument();
    expect(items()).toHaveLength(4);
  });

  it("una cuenta sin notificaciones no muestra contador y ve el estado vacío", async () => {
    const usuario = userEvent.setup();
    await entrar("nuevo@correo.com");
    renderApp("/operar");
    await usuario.click(await screen.findByRole("button", { name: "Notificaciones" }));
    expect(await screen.findByText(/todavía no tienes notificaciones/i)).toBeInTheDocument();
  });

  it("marcar una como leída baja el contador de la campana", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/notificaciones");

    await screen.findByRole("list", { name: /lista de notificaciones/i });
    await usuario.click(screen.getByRole("button", { name: "Marcar como leída: Resumen de ayer" }));

    expect(
      await screen.findByRole("button", { name: "Notificaciones, 1 sin leer" })
    ).toBeInTheDocument();
    expect(util.noLeidas()).toBe(1);
    expect(
      screen.queryByRole("button", { name: "Marcar como leída: Resumen de ayer" })
    ).not.toBeInTheDocument();
  });

  it("«Marcar esta página como leída» las marca todas y desaparece el botón", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/notificaciones");
    await screen.findByRole("list", { name: /lista de notificaciones/i });

    await usuario.click(screen.getByRole("button", { name: /marcar esta página como leída/i }));
    await waitFor(() => expect(util.noLeidas()).toBe(0));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /marcar esta página/i })).not.toBeInTheDocument()
    );
    expect(await screen.findByRole("button", { name: "Notificaciones" })).toBeInTheDocument();
  });

  it("filtra por «Sin leer» y por tipo", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/notificaciones");
    await screen.findByRole("list", { name: /lista de notificaciones/i });

    await usuario.click(screen.getByRole("button", { name: "Sin leer" }));
    await waitFor(() => expect(items()).toHaveLength(2));

    await usuario.click(screen.getByRole("button", { name: "Todas" }));
    await usuario.selectOptions(screen.getByLabelText("Tipo"), "ORDEN_EJECUTADA");
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(within(items()[0]).getByText("Orden ejecutada", { selector: "p" })).toBeInTheDocument();
  });

  it("las notificaciones de órdenes enlazan al detalle (solo inversionista)", async () => {
    await entrar();
    renderApp("/notificaciones?tipo=ORDEN_CANCELADA");
    const enlace = await screen.findByRole("link", { name: "Ver orden" });
    expect(enlace).toHaveAttribute("href", "/historial/0a000000-0000-4000-8000-000000000003");
  });

  it("pagina de a 10", async () => {
    const usuario = userEvent.setup();
    await entrar();
    for (let i = 0; i < 8; i += 1) util.crear({ titulo: `Aviso ${i}` });
    renderApp("/notificaciones");

    expect(await screen.findByText(/página 1 de 2/i)).toBeInTheDocument();
    expect(items()).toHaveLength(10);
    await usuario.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByText(/página 2 de 2/i)).toBeInTheDocument();
    await waitFor(() => expect(items()).toHaveLength(2));
  });

  it("si falla la lista muestra el error y permite reintentar", async () => {
    const usuario = userEvent.setup();
    server.use(
      mswHttp.get("*/api/v1/notificaciones", () =>
        HttpResponse.json(
          { status: 500, codigo: "ERROR_INTERNO", mensaje: "x", traceId: "t-1" },
          { status: 500 }
        )
      )
    );
    await entrar();
    renderApp("/notificaciones");
    expect(await screen.findByText(/error inesperado/i)).toBeInTheDocument();
    server.resetHandlers();
    await usuario.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(
      await screen.findByRole("list", { name: /lista de notificaciones/i })
    ).toBeInTheDocument();
  });

  it("si falla marcar como leída avisa y conserva la notificación", async () => {
    const usuario = userEvent.setup();
    await entrar();
    renderApp("/notificaciones");
    await screen.findByRole("list", { name: /lista de notificaciones/i });
    server.use(
      mswHttp.patch("*/api/v1/notificaciones/:id/leida", () =>
        HttpResponse.json(
          { status: 500, codigo: "ERROR_INTERNO", mensaje: "x", traceId: "t-2" },
          { status: 500 }
        )
      )
    );
    await usuario.click(screen.getByRole("button", { name: "Marcar como leída: Resumen de ayer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no pudimos marcarlas/i);
    expect(
      screen.getByRole("button", { name: "Marcar como leída: Resumen de ayer" })
    ).toBeInTheDocument();
  });

  it("el panel usa las notificaciones sin leer en la campana", async () => {
    await entrar();
    renderApp("/panel");
    expect(
      await screen.findByRole("button", { name: "Notificaciones, 2 sin leer" })
    ).toBeInTheDocument();
  });

  it("un rol sin notificaciones no accede a la pantalla", async () => {
    await entrar("admin@correo.com", "ADM", "9");
    renderApp("/notificaciones");
    expect(screen.queryByRole("heading", { name: "Notificaciones" })).not.toBeInTheDocument();
  });
});
