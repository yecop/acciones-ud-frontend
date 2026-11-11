import { describe, expect, it } from "vitest";
import { formatearTiempo } from "./tiempo.js";

describe("formatearTiempo", () => {
  it.each([
    [0, "00:00"],
    [9, "00:09"],
    [30, "00:30"],
    [272, "04:32"],
    [600, "10:00"],
  ])("%i s → %s", (segundos, esperado) => {
    expect(formatearTiempo(segundos)).toBe(esperado);
  });

  it("no devuelve tiempos negativos", () => {
    expect(formatearTiempo(-5)).toBe("00:00");
  });
});
