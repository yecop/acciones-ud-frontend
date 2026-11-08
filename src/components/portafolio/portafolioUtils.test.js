import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent, toneFromValue } from "./portafolioUtils.js";

describe("formatCurrency", () => {
  it("formatea un monto en texto como moneda", () => {
    const formatted = formatCurrency("1500.00");
    expect(formatted).toContain("1.500");
    expect(formatted).toMatch(/\$/);
  });

  it("maneja valores no numéricos devolviendo el formato de cero", () => {
    expect(formatCurrency("x")).toContain("0");
    expect(formatCurrency(null)).toContain("0");
  });
});

describe("formatPercent", () => {
  it("agrega signo + a valores positivos", () => {
    expect(formatPercent("26.67")).toBe("+26.67 %");
  });

  it("conserva el signo - en valores negativos", () => {
    expect(formatPercent("-20.00")).toBe("-20.00 %");
  });

  it("no agrega signo al cero", () => {
    expect(formatPercent("0")).toBe("0.00 %");
  });

  it("maneja valores no numéricos", () => {
    expect(formatPercent("x")).toBe("0.00 %");
  });
});

describe("toneFromValue", () => {
  it("positivo para valores mayores a cero", () => {
    expect(toneFromValue("400.00")).toBe("positive");
  });

  it("negativo para valores menores a cero", () => {
    expect(toneFromValue("-300.00")).toBe("negative");
  });

  it("neutral para cero o no numérico", () => {
    expect(toneFromValue("0.00")).toBe("neutral");
    expect(toneFromValue("abc")).toBe("neutral");
  });
});
