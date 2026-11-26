import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { USUARIO_MATEO } from "../mocks/comisionistaDatos.js";
import { db } from "../mocks/db.js";
import { server } from "../mocks/server.js";
import { renderApp } from "../test/render.jsx";
import { iniciarSesionMock } from "../test/sesionMock.js";

async function entrar(correo, rol = "INV", id = "1") {
  await iniciarSesionMock(correo);
  session.setUsuario({ id, nombre: "Prueba", rol });
}

describe("mi comisionista (SCRUM-65)", () => {
  it("sin comisionista: elige uno con confirmación y queda asociado", async () => {
    const usuario = userEvent.setup();
    await entrar("laura@correo.com");
    renderApp("/mi-comisionista");

    expect(await screen.findByText(/todavía no tienes comisionista/i)).toBeInTheDocument();
    await usuario.click(screen.getByLabelText(/permitir que opere a mi nombre/i));
    await usuario.click(screen.getByRole("button", { name: "Elegir a Carlos R." }));

    const dialogo = screen.getByRole("alertdialog", { name: /confirmar cambio de comisionista/i });
    expect(dialogo).toHaveTextContent(/Carlos R\./);
    await usuario.click(within(dialogo).getByRole("button", { name: "Sí, elegir" }));

    expect(
      await screen.findByText("Listo, tu comisionista ahora es Carlos R.")
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Tu comisionista" })).toBeInTheDocument();
    expect(screen.getByText("Sí, con tu aprobación")).toBeInTheDocument();
    const laura = db.usuarios.find((u) => u.correo === "laura@correo.com");
    expect(laura.comisionista).toMatchObject({ nombre: "Carlos R.", operaEnNombre: true });
  });

  it("cambia de comisionista advirtiendo qué pasa con lo pendiente", async () => {
    const usuario = userEvent.setup();
    await entrar("mateo@correo.com", "INV", USUARIO_MATEO);
    renderApp("/mi-comisionista");

    expect(await screen.findByRole("heading", { name: "Tu comisionista" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cambiar comisionista" }));
    await usuario.click(screen.getByRole("button", { name: "Elegir a Andrea P." }));
    expect(screen.getByRole("button", { name: "Es tu comisionista" })).toBeDisabled();

    const dialogo = screen.getByRole("alertdialog");
    expect(dialogo).toHaveTextContent(/propuestas pendientes de Carlos R\. ya no podrán firmarse/i);
    await usuario.click(within(dialogo).getByRole("button", { name: "Sí, elegir" }));
    expect(
      await screen.findByText("Listo, tu comisionista ahora es Andrea P.")
    ).toBeInTheDocument();
  });

  it("«No» cancela sin cambiar nada y se puede dejar al comisionista", async () => {
    const usuario = userEvent.setup();
    await entrar("mateo@correo.com", "INV", USUARIO_MATEO);
    renderApp("/mi-comisionista");

    await usuario.click(await screen.findByRole("button", { name: "Dejar de tener comisionista" }));
    await usuario.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(db.usuarios.find((u) => u.id === USUARIO_MATEO).comisionista).not.toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Dejar de tener comisionista" }));
    await usuario.click(screen.getByRole("button", { name: "Sí, dejarlo" }));
    expect(await screen.findByText("Ya no tienes comisionista asociado.")).toBeInTheDocument();
    expect(db.usuarios.find((u) => u.id === USUARIO_MATEO).comisionista).toBeNull();
  });

  it("un error de red se explica y permite reintentar", async () => {
    const usuario = userEvent.setup();
    server.use(mswHttp.get("*/api/v1/perfil", () => HttpResponse.error()));
    await entrar("laura@correo.com");
    renderApp("/mi-comisionista");

    expect(await screen.findByText(/no pudimos conectarnos/i)).toBeInTheDocument();
    server.resetHandlers();
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText(/todavía no tienes comisionista/i)).toBeInTheDocument();
  });

  it("si el servidor responde 403 al cambiar, lo dice con claridad", async () => {
    const usuario = userEvent.setup();
    await entrar("laura@correo.com");
    renderApp("/mi-comisionista");
    await screen.findByRole("button", { name: "Elegir a Carlos R." });
    server.use(
      mswHttp.put("*/api/v1/perfil/comisionista", () =>
        HttpResponse.json(
          { status: 403, codigo: "ACCESO_DENEGADO", mensaje: "x", traceId: "t" },
          { status: 403 }
        )
      )
    );
    await usuario.click(screen.getByRole("button", { name: "Elegir a Carlos R." }));
    await usuario.click(screen.getByRole("button", { name: "Sí, elegir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/tu rol no permite/i);
  });

  it("el comisionista no accede a esta pantalla", async () => {
    await entrar("carlos@correo.com", "COM");
    renderApp("/mi-comisionista");
    expect(screen.queryByRole("heading", { name: "Mi comisionista" })).not.toBeInTheDocument();
  });
});
