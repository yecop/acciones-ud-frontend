import { describe, it, expect } from "vitest";
import {
  COMMISSION_RATE,
  ORDER_TYPES,
  orderTypeRequiresPrice,
  calculateOrder,
  formatCurrency,
} from "./orderUtils.js";

describe("orderTypeRequiresPrice", () => {
  it("market order no requiere precio", () => {
    expect(orderTypeRequiresPrice("market")).toBe(false);
  });

  it("limit, stop y take requieren precio", () => {
    expect(orderTypeRequiresPrice("limit")).toBe(true);
    expect(orderTypeRequiresPrice("stop")).toBe(true);
    expect(orderTypeRequiresPrice("take")).toBe(true);
  });

  it("un tipo desconocido requiere precio por defecto", () => {
    expect(orderTypeRequiresPrice("inexistente")).toBe(true);
  });

  it("todos los ORDER_TYPES están cubiertos por la función", () => {
    for (const type of ORDER_TYPES) {
      expect(orderTypeRequiresPrice(type.id)).toBe(type.requiresPrice);
    }
  });
});

describe("calculateOrder", () => {
  it("calcula subtotal, comisión y total correctamente", () => {
    const result = calculateOrder({ quantity: 10, price: 100 });
    expect(result.subtotal).toBe(1000);
    expect(result.commission).toBeCloseTo(1000 * COMMISSION_RATE, 10);
    expect(result.total).toBeCloseTo(1000 * (1 + COMMISSION_RATE), 10);
  });

  it("trunca cantidades decimales a enteros", () => {
    const result = calculateOrder({ quantity: 3.9, price: 50 });
    expect(result.subtotal).toBe(150);
  });

  it("devuelve ceros cuando la cantidad no es válida", () => {
    expect(calculateOrder({ quantity: 0, price: 100 })).toEqual({
      subtotal: 0,
      commission: 0,
      total: 0,
    });
    expect(calculateOrder({ quantity: -5, price: 100 })).toEqual({
      subtotal: 0,
      commission: 0,
      total: 0,
    });
    expect(calculateOrder({ quantity: NaN, price: 100 })).toEqual({
      subtotal: 0,
      commission: 0,
      total: 0,
    });
  });

  it("devuelve ceros cuando el precio no es válido", () => {
    expect(calculateOrder({ quantity: 10, price: 0 })).toEqual({
      subtotal: 0,
      commission: 0,
      total: 0,
    });
    expect(calculateOrder({ quantity: 10, price: -1 })).toEqual({
      subtotal: 0,
      commission: 0,
      total: 0,
    });
  });

  it("acepta una comisión personalizada", () => {
    const result = calculateOrder({ quantity: 10, price: 100, commissionRate: 0.05 });
    expect(result.commission).toBeCloseTo(50, 10);
    expect(result.total).toBeCloseTo(1050, 10);
  });
});

describe("formatCurrency", () => {
  it("formatea un número como moneda", () => {
    const formatted = formatCurrency(1000);
    expect(formatted).toContain("1.000");
    expect(formatted).toMatch(/\$/);
  });

  it("maneja valores no numéricos devolviendo el formato de cero", () => {
    const formatted = formatCurrency(NaN);
    expect(formatted).toContain("0");
  });
});
