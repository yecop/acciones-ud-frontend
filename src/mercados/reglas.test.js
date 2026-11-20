import { describe, expect, it } from "vitest";
import {
  edadEnSegundos,
  esCierreDiario,
  esDeInteres,
  formatearEdad,
  ordenarAcciones,
  ordenarMercados,
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
