import { describe, expect, it } from "vitest";
import { dashboardData } from "../data/dashboardData.js";
import { construirDatosPanel } from "./panelDatos.js";

const persona = { nombre: "Laura", rol: "Inversionista" };
const saldo = { disponible: "4250.00", reservado: "351.20", total: "4601.20" };
const dashboard = {
  accionesInteres: [
    {
      ticker: "AAPL",
      nombre: "Apple Inc.",
      mercado: "NYSE",
      precio: "176.50",
      variacionPorcentaje: "0.51",
    },
  ],
  portafolio: { valorTotal: "6812.40", numeroPosiciones: 5, gananciaPerdidaDia: "96.30" },
  alertas: [{ id: 1 }, { id: 2 }],
};

const armar = (extra = {}) =>
  construirDatosPanel({
    base: dashboardData,
    persona,
    saldo,
    dashboard,
    estadoMercado: { abierto: true },
    fecha: "Jueves, 19 de noviembre",
    ...extra,
  });

const kpi = (datos, id) => datos.kpis.find((k) => k.id === id);

describe("construirDatosPanel", () => {
  it("las tarjetas salen del saldo y del dashboard de la API", () => {
    const datos = armar();

    expect(kpi(datos, "funds").value).toMatch(/4\.250,00/);
    expect(kpi(datos, "funds").hint).toMatch(/351,20/);
    expect(kpi(datos, "portfolio").value).toMatch(/6\.812,40/);
    expect(kpi(datos, "portfolio").hint).toBe("5 posiciones");
    expect(kpi(datos, "today").value).toMatch(/^\+.*96,30/);
    expect(kpi(datos, "today").tone).toBe("positive");
    expect(kpi(datos, "alerts").value).toBe("2");
    expect(datos.user.notifications).toBe(2);
  });

  it("una pérdida del día no se pinta como ganancia", () => {
    const datos = armar({
      dashboard: {
        ...dashboard,
        portafolio: { ...dashboard.portafolio, gananciaPerdidaDia: "-12.00" },
      },
    });

    expect(kpi(datos, "today").value).toMatch(/^-.*12,00/);
    expect(kpi(datos, "today").tone).toBeUndefined();
  });

  it("la acción destacada y el formulario de orden usan la primera acción de interés", () => {
    const datos = armar();

    expect(datos.featured).toMatchObject({ symbol: "AAPL", market: "NYSE", ejemplo: true });
    expect(datos.featured.price).toMatch(/176,50/);
    expect(datos.trading.asset).toEqual({
      symbol: "AAPL",
      name: "Apple Inc.",
      currentPrice: 176.5,
    });
    expect(datos.trading.saldoDisponible).toBe(4250);
    expect(datos.trading.isMarketOpen).toBe(true);
  });

  it("con el mercado cerrado el formulario lo sabe", () => {
    expect(armar({ estadoMercado: { abierto: false } }).trading.isMarketOpen).toBe(false);
  });

  it("si falla una fuente, su tarjeta dice «—» y las demás siguen", () => {
    const sinSaldo = armar({ saldo: null });
    expect(kpi(sinSaldo, "funds").value).toBe("—");
    expect(kpi(sinSaldo, "portfolio").value).toMatch(/6\.812,40/);

    const sinDashboard = armar({ dashboard: null });
    expect(kpi(sinDashboard, "portfolio").value).toBe("—");
    expect(kpi(sinDashboard, "funds").value).toMatch(/4\.250,00/);
    // Sin acción destacada se conservan los datos de ejemplo del formulario.
    expect(sinDashboard.trading.asset.symbol).toBe(dashboardData.trading.asset.symbol);
  });

  it("saluda por el nombre y muestra la fecha", () => {
    const datos = armar();
    expect(datos.greeting).toEqual({ title: "Hola, Laura", subtitle: "Jueves, 19 de noviembre" });
    expect(datos.user.initials).toBe("LA");
  });
});
