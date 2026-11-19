import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../mocks/server.js";
import AccionesPage from "./AccionesPage.jsx";

const hace = (s) => new Date(Date.now() - s * 1000).toISOString();

const ACCIONES = [
  {
    ticker: "AAPL",
    nombre: "Apple Inc.",
    mercado: "NASDAQ",
    sector: "TECNOLOGIA",
    moneda: "USD",
    cotizacion: { ticker: "AAPL", precio: "190.12", actualizadoEn: hace(2), desactualizada: false },
  },
  {
    ticker: "JPM",
    nombre: "JPMorgan Chase & Co.",
    mercado: "NYSE",
    sector: "FINANZAS",
    moneda: "USD",
    cotizacion: { ticker: "JPM", precio: "210.00", actualizadoEn: hace(30), desactualizada: true },
  },
  {
    ticker: "BP",
    nombre: "BP plc",
    mercado: "LSE",
    sector: "ENERGIA",
    moneda: "GBP",
    advertencia: { codigo: "SIN_COTIZACION", mensaje: "x" },
  },
];

function usarApiFalsa() {
  const consultas = [];
  server.use(
    mswHttp.get("*/api/v1/acciones", ({ request }) => {
      const url = new URL(request.url);
      consultas.push(url.searchParams);
      const mercado = url.searchParams.get("mercado");
      const contenido = ACCIONES.filter((a) => !mercado || a.mercado === mercado);
      return HttpResponse.json({
        contenido,
        pagina: Number(url.searchParams.get("pagina") ?? 0),
        tamano: 10,
        totalElementos: contenido.length,
        totalPaginas: 1,
      });
    }),
    mswHttp.get("*/api/v1/acciones/:ticker/cotizacion", ({ params }) => {
      const accion = ACCIONES.find((a) => a.ticker === params.ticker);
      if (!accion?.cotizacion) {
        return HttpResponse.json(
          { status: 502, codigo: "PROVEEDOR_NO_DISPONIBLE", mensaje: "x", traceId: "t" },
          { status: 502 }
        );
      }
      return HttpResponse.json({
        bid: "1.00",
        ask: "1.10",
        spread: "0.10",
        volumen: 10,
        fuente: "ALPACA_IEX",
        ...accion.cotizacion,
      });
    })
  );
  return consultas;
}

describe("AccionesPage (SCRUM-24)", () => {
  it("lista las acciones y marca las que tienen datos con más de 15 s", async () => {
    usarApiFalsa();
    render(<AccionesPage />);

    const filaAapl = (await screen.findByRole("button", { name: /cotización de AAPL/i })).closest(
      "tr"
    );
    const filaJpm = screen.getByRole("button", { name: /cotización de JPM/i }).closest("tr");
    const filaBp = screen.getByRole("button", { name: /cotización de BP/i }).closest("tr");

    expect(within(filaAapl).getByText("Al día")).toBeInTheDocument();
    expect(within(filaJpm).getByText("Desactualizado")).toBeInTheDocument();
    expect(within(filaBp).getByText("Sin dato")).toBeInTheDocument();
    expect(screen.getByText(/3 acciones/)).toBeInTheDocument();
  });

  it("filtra por mercado enviando el filtro al backend", async () => {
    const consultas = usarApiFalsa();
    const usuario = userEvent.setup();
    render(<AccionesPage />);
    await screen.findByRole("button", { name: /cotización de AAPL/i });

    await usuario.selectOptions(screen.getByLabelText("Mercado"), "NYSE");

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /cotización de AAPL/i })).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /cotización de JPM/i })).toBeInTheDocument();
    expect(consultas.at(-1).get("mercado")).toBe("NYSE");
  });

  it("al seleccionar una acción con dato viejo, el detalle destaca la advertencia", async () => {
    usarApiFalsa();
    const usuario = userEvent.setup();
    render(<AccionesPage />);

    await usuario.click(await screen.findByRole("button", { name: /cotización de JPM/i }));

    const detalle = await screen.findByRole("region", { name: "JPM" });
    await waitFor(() => expect(detalle).toHaveAttribute("data-estado", "desactualizada"));
    expect(within(detalle).getByRole("alert")).toHaveTextContent(/de antigüedad/);
  });

  it("si nunca hubo dato (502) lo explica en el detalle", async () => {
    usarApiFalsa();
    const usuario = userEvent.setup();
    render(<AccionesPage />);

    await usuario.click(await screen.findByRole("button", { name: /cotización de BP/i }));

    expect(await screen.findByText(/aún no hay cotización disponible/i)).toBeInTheDocument();
  });
});
