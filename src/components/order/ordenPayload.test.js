import { describe, expect, it } from "vitest";
import { borradorValido, construirSolicitud } from "./ordenPayload.js";

describe("construirSolicitud", () => {
  it("market: sin precios", () => {
    expect(
      construirSolicitud({ symbol: "AAPL", side: "buy", type: "market", quantity: 2, price: 176.5 })
    ).toEqual({ ticker: "AAPL", lado: "COMPRA", tipo: "MARKET", cantidad: 2 });
  });
  it("limit usa precioLimite; stop y take usan precioStop, con 2 decimales", () => {
    const base = { symbol: "MSFT", side: "sell", quantity: 1, price: 410.5 };
    expect(construirSolicitud({ ...base, type: "limit" })).toMatchObject({
      lado: "VENTA",
      tipo: "LIMIT",
      precioLimite: "410.50",
    });
    expect(construirSolicitud({ ...base, type: "stop" })).toMatchObject({
      tipo: "STOP_LOSS",
      precioStop: "410.50",
    });
    expect(construirSolicitud({ ...base, type: "take" })).toMatchObject({ tipo: "TAKE_PROFIT" });
    expect(construirSolicitud({ ...base, type: "stop" })).not.toHaveProperty("precioLimite");
  });
});

describe("borradorValido", () => {
  const ok = { symbol: "AAPL", quantity: 1, type: "market", price: 0 };
  it("exige ticker y cantidad entera ≥ 1", () => {
    expect(borradorValido(ok)).toBe(true);
    expect(borradorValido({ ...ok, symbol: "" })).toBe(false);
    expect(borradorValido({ ...ok, quantity: 0 })).toBe(false);
    expect(borradorValido({ ...ok, quantity: 1.5 })).toBe(false);
    expect(borradorValido(null)).toBe(false);
  });
  it("los tipos con precio exigen un precio positivo", () => {
    expect(borradorValido({ ...ok, type: "limit", price: 0 })).toBe(false);
    expect(borradorValido({ ...ok, type: "limit", price: 150 })).toBe(true);
  });
});
