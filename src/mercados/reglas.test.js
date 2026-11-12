import { describe, expect, it } from "vitest";
import {
  edadEnSegundos,
  esCierreDiario,
  esDeInteres,
  evaluarFrescura,
  formatearEdad,
  ordenarAcciones,
  ordenarMercados,
  UMBRAL_ANTIGUO_CIERRE_DIARIO_SEGUNDOS,
  UMBRAL_ANTIGUO_EN_VIVO_SEGUNDOS,
} from "./reglas.js";

const AHORA = new Date("2026-11-12T15:00:00Z").getTime();
const haceSegundos = (s) => new Date(AHORA - s * 1000).toISOString();

describe("esCierreDiario", () => {
  it.each([
    ["LSE", true],
    ["TSE", true],
    ["ASX", true],
    ["NYSE", false],
    ["NASDAQ", false],
  ])("%s → %s", (codigo, esperado) => {
    expect(esCierreDiario(codigo)).toBe(esperado);
  });
});

describe("edadEnSegundos", () => {
  it("calcula la diferencia con ahora", () => {
    expect(edadEnSegundos(haceSegundos(42), AHORA)).toBe(42);
  });

  it("sin fecha o con fecha inválida devuelve null", () => {
    expect(edadEnSegundos(undefined, AHORA)).toBeNull();
    expect(edadEnSegundos("no es una fecha", AHORA)).toBeNull();
  });

  it("un reloj local atrasado no da edades negativas", () => {
    expect(edadEnSegundos(haceSegundos(-30), AHORA)).toBe(0);
  });
});

describe("formatearEdad", () => {
  it.each([
    [0, "ahora mismo"],
    [4, "ahora mismo"],
    [5, "hace 5 s"],
    [59, "hace 59 s"],
    [60, "hace 1 min"],
    [3599, "hace 59 min"],
    [3600, "hace 1 h"],
    [86399, "hace 23 h"],
    [86400, "hace 1 d"],
    [null, "sin hora de actualización"],
  ])("%s → %s", (segundos, esperado) => {
    expect(formatearEdad(segundos)).toBe(esperado);
  });
});

describe("evaluarFrescura", () => {
  const evaluar = (codigoMercado, abierto, segundos) =>
    evaluarFrescura({
      codigoMercado,
      abierto,
      actualizadoEn: segundos === null ? undefined : haceSegundos(segundos),
      ahora: AHORA,
    });

  it("mercado en vivo y abierto: advierte pasado el umbral, no antes", () => {
    expect(evaluar("NYSE", true, UMBRAL_ANTIGUO_EN_VIVO_SEGUNDOS).antiguo).toBe(false);
    expect(evaluar("NYSE", true, UMBRAL_ANTIGUO_EN_VIVO_SEGUNDOS + 1).antiguo).toBe(true);
  });

  it("mercado de cierre diario y abierto: umbral de ~1 día, no de 1 minuto", () => {
    expect(evaluar("TSE", true, 3600).antiguo).toBe(false);
    expect(evaluar("TSE", true, UMBRAL_ANTIGUO_CIERRE_DIARIO_SEGUNDOS).antiguo).toBe(false);
    expect(evaluar("TSE", true, UMBRAL_ANTIGUO_CIERRE_DIARIO_SEGUNDOS + 1).antiguo).toBe(true);
  });

  it("mercado cerrado: nunca es dato antiguo, es el último cierre", () => {
    const f = evaluar("NYSE", false, 5 * 86400);
    expect(f.antiguo).toBe(false);
    expect(f.ultimoCierre).toBe(true);
  });

  it("sin hora de actualización con el mercado abierto se considera antiguo", () => {
    const f = evaluar("NYSE", true, null);
    expect(f.antiguo).toBe(true);
    expect(f.texto).toBe("sin hora de actualización");
  });

  it("si no se conoce el estado del mercado, se evalúa de forma conservadora", () => {
    expect(evaluar("NYSE", undefined, 600).antiguo).toBe(true);
  });
});

describe("intereses", () => {
  const acciones = [
    { ticker: "XOM", sector: "ENERGIA" },
    { ticker: "AAPL", sector: "TECNOLOGIA" },
    { ticker: "AMZN", sector: "CONSUMO" },
    { ticker: "NVDA", sector: "TECNOLOGIA" },
  ];
  const intereses = { sectores: ["TECNOLOGIA"], mercados: ["TSE"] };

  it("esDeInteres compara el sector con los intereses", () => {
    expect(esDeInteres(acciones[1], intereses)).toBe(true);
    expect(esDeInteres(acciones[0], intereses)).toBe(false);
    expect(esDeInteres(acciones[0], null)).toBe(false);
  });

  it("las acciones de interés van primero y el resto conserva su orden", () => {
    expect(ordenarAcciones(acciones, intereses).map((a) => a.ticker)).toEqual([
      "AAPL",
      "NVDA",
      "XOM",
      "AMZN",
    ]);
  });

  it("sin intereses el orden no cambia", () => {
    expect(ordenarAcciones(acciones, null)).toEqual(acciones);
  });

  it("los mercados de interés van primero", () => {
    const mercados = [{ codigo: "NYSE" }, { codigo: "LSE" }, { codigo: "TSE" }];
    expect(ordenarMercados(mercados, intereses).map((m) => m.codigo)).toEqual([
      "TSE",
      "NYSE",
      "LSE",
    ]);
  });
});
