import { describe, expect, it } from "vitest";
import {
  aFiltrosApi,
  escribirParams,
  FILTROS_VACIOS,
  hayFiltros,
  leerFiltros,
  validarRango,
} from "./filtrosOrdenes.js";

const params = (texto) => new URLSearchParams(texto);

describe("leerFiltros", () => {
  it("sin parámetros: filtros vacíos y página 1", () => {
    expect(leerFiltros(params(""))).toEqual({ filtros: FILTROS_VACIOS, pagina: 1 });
  });

  it("lee estado, lado, ticker (en mayúsculas), fechas y página", () => {
    const r = leerFiltros(
      params("estado=CANCELADA&lado=VENTA&ticker=aapl&desde=2026-11-01&hasta=2026-11-30&pagina=3")
    );
    expect(r).toEqual({
      filtros: {
        estado: "CANCELADA",
        lado: "VENTA",
        ticker: "AAPL",
        desde: "2026-11-01",
        hasta: "2026-11-30",
      },
      pagina: 3,
    });
  });

  it("descarta valores inválidos", () => {
    const r = leerFiltros(
      params("estado=EJECUTADA&lado=OTRO&ticker=<b>x</b>&desde=ayer&hasta=2026-13&pagina=-2")
    );
    expect(r.filtros).toMatchObject({ estado: "", lado: "", desde: "", hasta: "" });
    expect(r.filtros.ticker).toBe("BXB"); // solo letras, números y punto
    expect(r.pagina).toBe(1);
  });
});

describe("escribirParams", () => {
  it("omite lo vacío y la página 1", () => {
    expect(escribirParams({ ...FILTROS_VACIOS, estado: "PENDIENTE" }, 1).toString()).toBe(
      "estado=PENDIENTE"
    );
    expect(escribirParams(FILTROS_VACIOS, 2).toString()).toBe("pagina=2");
  });
});

describe("validarRango y hayFiltros", () => {
  it("detecta un rango invertido", () => {
    expect(validarRango({ desde: "2026-11-10", hasta: "2026-11-01" })).toMatch(/posterior/);
    expect(validarRango({ desde: "2026-11-01", hasta: "2026-11-01" })).toBeNull();
    expect(validarRango({ desde: "", hasta: "2026-11-01" })).toBeNull();
  });
  it("hayFiltros", () => {
    expect(hayFiltros(FILTROS_VACIOS)).toBe(false);
    expect(hayFiltros({ ...FILTROS_VACIOS, lado: "COMPRA" })).toBe(true);
  });
});

describe("aFiltrosApi", () => {
  it("la página va de 0 en la API y las fechas cubren el día completo", () => {
    const api = aFiltrosApi({ ...FILTROS_VACIOS, desde: "2026-11-01", hasta: "2026-11-02" }, 3, 10);
    expect(api).toMatchObject({ pagina: 2, tamano: 10 });
    expect(new Date(api.desde).getTime()).toBe(new Date("2026-11-01T00:00:00").getTime());
    expect(new Date(api.hasta).getTime()).toBe(new Date("2026-11-02T23:59:59.999").getTime());
  });
  it("solo envía los filtros con valor", () => {
    expect(aFiltrosApi({ ...FILTROS_VACIOS, estado: "PENDIENTE" })).toEqual({
      pagina: 0,
      tamano: 10,
      estado: "PENDIENTE",
    });
  });
});
