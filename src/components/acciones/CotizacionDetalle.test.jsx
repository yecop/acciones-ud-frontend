import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CotizacionDetalle from "./CotizacionDetalle.jsx";

const AHORA = new Date("2026-01-05T15:00:30Z").getTime();
const ACCION = { ticker: "AAPL", nombre: "Apple Inc.", mercado: "NASDAQ", moneda: "USD" };

function cotizacion(segundosAtras, extra = {}) {
  return {
    ticker: "AAPL",
    precio: "190.12",
    bid: "190.10",
    ask: "190.15",
    spread: "0.05",
    volumen: 1234567,
    actualizadoEn: new Date(AHORA - segundosAtras * 1000).toISOString(),
    fuente: "ALPACA_IEX",
    desactualizada: false,
    ...extra,
  };
}

function renderDetalle(props) {
  return render(
    <CotizacionDetalle accion={ACCION} cargando={false} error={null} ahora={AHORA} {...props} />
  );
}

describe("CotizacionDetalle (SCRUM-24)", () => {
  it("muestra precio, bid, ask, spread, volumen, fuente y actualizadoEn", () => {
    renderDetalle({ cotizacion: cotizacion(3) });

    expect(screen.getByRole("heading", { name: "AAPL" })).toBeInTheDocument();
    expect(screen.getByText("Bid")).toBeInTheDocument();
    expect(screen.getByText("Spread")).toBeInTheDocument();
    expect(screen.getByText("ALPACA_IEX")).toBeInTheDocument();
    expect(screen.getByText(/hace 3 s/)).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute(
      "dateTime",
      new Date(AHORA - 3000).toISOString()
    );
  });

  it("no destaca nada con un dato de menos de 15 s", () => {
    renderDetalle({ cotizacion: cotizacion(10) });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Detalle|AAPL/i, { selector: "section" })).toHaveAttribute(
      "data-estado",
      "al-dia"
    );
  });

  it("destaca la advertencia de antigüedad con más de 15 s respecto a la hora local", () => {
    renderDetalle({ cotizacion: cotizacion(20) });

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent(/20 s de antigüedad/);
    expect(alerta).toHaveAttribute("data-estado", "desactualizada");
    expect(screen.getByText("Desactualizado")).toBeInTheDocument();
  });

  it("indica cuando el proveedor no responde y se sirve el último dato", () => {
    renderDetalle({
      cotizacion: cotizacion(40, {
        desactualizada: true,
        advertencia: { codigo: "PROVEEDOR_NO_DISPONIBLE", mensaje: "x" },
      }),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/proveedor de datos no responde/i);
    expect(screen.getByText("Proveedor caído")).toBeInTheDocument();
  });

  it("explica el 502 cuando nunca hubo dato", () => {
    renderDetalle({
      cotizacion: null,
      error: { codigo: "PROVEEDOR_NO_DISPONIBLE", status: 502, message: "x" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/aún no hay cotización disponible/i);
  });
});
