import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { server } from "../mocks/server.js";
import { iniciarSesionMock } from "../test/sesionMock.js";
import { renderApp } from "../test/render.jsx";

const API = "*/api/v1";
const tarjeta = (etiqueta) => screen.getByText(etiqueta).closest("article");
const error500 = () =>
  HttpResponse.json(
    { status: 500, codigo: "ERROR_INTERNO", mensaje: "x", traceId: "t" },
    { status: 500 }
  );

describe("panel del inversionista con datos de la API", () => {
  beforeEach(async () => {
    await iniciarSesionMock("laura@correo.com");
    session.setUsuario({ id: "1", nombre: "Laura", rol: "INV" });
  });
  afterEach(() => server.resetHandlers());

  it("muestra fondos, portafolio y ganancia del día que devuelve la API", async () => {
    renderApp("/panel");

    await waitFor(() => expect(tarjeta("Fondos disponibles")).toHaveTextContent(/4\.250,00/));
    expect(tarjeta("Fondos disponibles")).toHaveTextContent(/reservado en órdenes: .*351,20/i);
    expect(tarjeta("Valor del portafolio")).toHaveTextContent(/5 posiciones/i);
    expect(tarjeta("Valor del portafolio")).not.toHaveTextContent("—");
    expect(tarjeta("Ganancia de hoy")).toHaveTextContent(/^Ganancia de hoy\+.*96,30/);
  });

  it("la acción destacada es la primera de interés y avisa que el gráfico es de ejemplo", async () => {
    renderApp("/panel");

    expect(await screen.findByText(/AAPL · Apple Inc\. · NYSE/)).toBeInTheDocument();
    expect(screen.getByText(/trazo y estadísticas de ejemplo/i)).toBeInTheDocument();
  });

  it("si falla el saldo, esa tarjeta dice «—» y el resto del panel sigue", async () => {
    server.use(mswHttp.get(`${API}/cuenta/saldo`, () => error500()));
    renderApp("/panel");

    await waitFor(() => expect(tarjeta("Valor del portafolio")).toHaveTextContent(/5 posiciones/i));
    expect(tarjeta("Fondos disponibles")).toHaveTextContent("—");
    expect(screen.queryByText(/no pudimos cargar tu resumen/i)).not.toBeInTheDocument();
  });

  it("si no llega nada, avisa y permite reintentar", async () => {
    server.use(
      mswHttp.get(`${API}/cuenta/saldo`, () => error500(), { once: true }),
      mswHttp.get(`${API}/dashboard`, () => error500(), { once: true })
    );
    renderApp("/panel");

    expect(await screen.findByText(/no pudimos cargar tu resumen/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));

    await waitFor(() =>
      expect(screen.queryByText(/no pudimos cargar tu resumen/i)).not.toBeInTheDocument()
    );
    await waitFor(() => expect(tarjeta("Fondos disponibles")).toHaveTextContent(/4\.250,00/));
  });
});
