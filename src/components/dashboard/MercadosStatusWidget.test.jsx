import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import MercadosStatusWidget from "./MercadosStatusWidget";

// Mock del cliente REST para aislar el componente del backend real.
vi.mock("../../api/mercadosApi", () => ({
  listarMercados: vi.fn(async () => [
    {
      codigo: "NYSE",
      nombre: "New York Stock Exchange",
      zonaHoraria: "America/New_York",
      horaApertura: "09:30",
      horaCierre: "16:00",
      diasHabiles: "LUNES_A_VIERNES",
    },
    {
      codigo: "TSE",
      nombre: "Tokyo Stock Exchange",
      zonaHoraria: "Asia/Tokyo",
      horaApertura: "09:00",
      horaCierre: "15:00",
      diasHabiles: "LUNES_A_VIERNES",
    },
  ]),
  obtenerEstadoMercado: vi.fn(async (codigo) => {
    if (codigo === "NYSE") {
      return {
        codigo: "NYSE",
        estado: "ABIERTO",
        abierto: true,
        zonaHoraria: "America/New_York",
        proximoCierre: "2026-01-05T21:00:00Z",
        proximaApertura: null,
        restricciones: [],
      };
    }
    return {
      codigo: "TSE",
      estado: "CERRADO",
      abierto: false,
      zonaHoraria: "Asia/Tokyo",
      proximoCierre: null,
      proximaApertura: "2026-01-06T00:00:00Z",
      restricciones: [{ codigo: "FERIADO", descripcion: "Año Nuevo" }],
    };
  }),
}));

describe("MercadosStatusWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("muestra los mercados con su estado abierto/cerrado", async () => {
    render(<MercadosStatusWidget intervaloMs={1000000} />);

    expect(await screen.findByText(/New York Stock Exchange/)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Abierto")).toBeTruthy();
      expect(screen.getByText("Cerrado")).toBeTruthy();
    });
  });

  it("muestra las restricciones vigentes de un mercado", async () => {
    render(<MercadosStatusWidget intervaloMs={1000000} />);
    expect(await screen.findByText("Año Nuevo")).toBeTruthy();
  });
});
