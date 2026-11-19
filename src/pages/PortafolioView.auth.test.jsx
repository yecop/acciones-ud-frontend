import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../mocks/server.js";
import { enviarCodigo, enviarCredenciales, renderApp } from "../test/render.jsx";

async function entrarComo(correo) {
  const usuario = userEvent.setup();
  renderApp("/ingreso");
  await enviarCredenciales(usuario, screen, { correo });
  await screen.findByText(/paso 2 de 2/i);
  await enviarCodigo(usuario, screen);
  await waitFor(() => expect(screen.queryByText(/paso 2 de 2/i)).not.toBeInTheDocument());
  return usuario;
}

describe("Portafolio (SCRUM-25 sobre el cliente común)", () => {
  it("un inversionista ve su saldo y sus posiciones desde el API", async () => {
    const usuario = await entrarComo("laura@correo.com");
    await usuario.click((await screen.findAllByRole("button", { name: /portafolio/i }))[0]);

    expect(
      await screen.findByRole("heading", { name: /mi dinero y mis posiciones/i })
    ).toBeInTheDocument();
    expect(await screen.findByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("NVDA")).toBeInTheDocument();
  });

  it("si el API falla, muestra el mensaje del contrato y permite reintentar", async () => {
    server.use(
      mswHttp.get("*/api/v1/cuenta/saldo", () =>
        HttpResponse.json(
          { status: 503, codigo: "SERVICIO_NO_DISPONIBLE", mensaje: "x", traceId: "t" },
          { status: 503 }
        )
      )
    );
    const usuario = await entrarComo("laura@correo.com");
    await usuario.click((await screen.findAllByRole("button", { name: /portafolio/i }))[0]);

    expect((await screen.findAllByRole("alert")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("sin sesión, /portafolio lleva al ingreso", async () => {
    renderApp("/portafolio");
    expect(
      await screen.findByRole("heading", { name: /ingresa a tu cuenta/i })
    ).toBeInTheDocument();
  });
});
