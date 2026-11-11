import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "../../mocks/server.js";
import { session } from "../../auth/session.js";
import MercadosStatusWidget from "./MercadosStatusWidget.jsx";

const API = "http://localhost:3000/api/v1";

/** El widget consume endpoints protegidos: dejamos una sesión válida contra el mock. */
async function iniciarSesionMock() {
  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo: "laura@correo.com", contrasena: "Demo1234" }),
  }).then((r) => r.json());
  const tokens = await fetch(`${API}/auth/mfa/verificar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfaToken: login.mfaToken, codigo: "482913" }),
  }).then((r) => r.json());
  session.setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
}

describe("MercadosStatusWidget", () => {
  afterEach(() => cleanup());

  it("muestra los mercados del servidor con su estado abierto/cerrado", async () => {
    await iniciarSesionMock();
    render(<MercadosStatusWidget intervaloMs={1000000} />);

    expect((await screen.findAllByText(/\(\w+\)/)).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText(/^(Abierto|Cerrado)$/).length).toBeGreaterThan(0);
    });
  });

  it("muestra las restricciones vigentes de un mercado", async () => {
    await iniciarSesionMock();
    server.use(
      mswHttp.get(`*/api/v1/mercados`, () =>
        HttpResponse.json([
          {
            codigo: "TSE",
            nombre: "Tokyo Stock Exchange",
            zonaHoraria: "Asia/Tokyo",
            horaApertura: "09:00",
            horaCierre: "15:00",
            diasHabiles: "LUNES_A_VIERNES",
          },
        ])
      ),
      mswHttp.get(`*/api/v1/mercados/TSE/estado`, () =>
        HttpResponse.json({
          codigo: "TSE",
          estado: "CERRADO",
          abierto: false,
          zonaHoraria: "Asia/Tokyo",
          proximoCierre: null,
          proximaApertura: "2026-01-06T00:00:00Z",
          restricciones: [{ codigo: "FERIADO", descripcion: "Año Nuevo" }],
        })
      )
    );
    render(<MercadosStatusWidget intervaloMs={1000000} />);

    expect(await screen.findByText("Año Nuevo")).toBeInTheDocument();
    expect(screen.getByText("Cerrado")).toBeInTheDocument();
  });

  it("si el servidor falla, muestra el mensaje traducido del contrato", async () => {
    await iniciarSesionMock();
    server.use(
      mswHttp.get(`*/api/v1/mercados`, () =>
        HttpResponse.json(
          { status: 503, codigo: "SERVICIO_NO_DISPONIBLE", mensaje: "x", traceId: "t" },
          { status: 503 }
        )
      )
    );
    render(<MercadosStatusWidget intervaloMs={1000000} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("sin sesión, la petición se rechaza y el widget lo informa sin romperse", async () => {
    render(<MercadosStatusWidget intervaloMs={1000000} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
