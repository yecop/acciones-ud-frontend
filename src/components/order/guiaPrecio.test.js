import { describe, expect, it } from "vitest";
import { avisoPrecio, bloqueoPrecio, diferenciaPorcentual, textoDiferencia } from "./guiaPrecio.js";

describe("guiaPrecio", () => {
  it("calcula la diferencia porcentual y la redacta", () => {
    expect(diferenciaPorcentual(110, 100)).toBeCloseTo(10);
    expect(diferenciaPorcentual(0, 100)).toBeNull();
    expect(textoDiferencia(110, 100)).toBe("10,0 % sobre el precio actual");
    expect(textoDiferencia(95, 100)).toBe("5,0 % bajo el precio actual");
    expect(textoDiferencia(100, 100)).toBe("Igual al precio actual");
    expect(textoDiferencia(undefined, 100)).toBeNull();
  });

  it("avisa de un límite que se ejecutaría de inmediato", () => {
    expect(avisoPrecio({ type: "limit", side: "buy", price: 120, current: 100 })).toMatch(
      /inmediato/
    );
    expect(avisoPrecio({ type: "limit", side: "sell", price: 90, current: 100 })).toMatch(
      /inmediato/
    );
    expect(avisoPrecio({ type: "limit", side: "buy", price: 95, current: 100 })).toBeNull();
    expect(avisoPrecio({ type: "limit", side: "sell", price: 105, current: 100 })).toBeNull();
  });

  it("bloquea un Stop Loss o Take Profit de venta mal ubicado", () => {
    expect(bloqueoPrecio({ type: "stop", side: "sell", price: 105, current: 100 })).toMatch(
      /Stop Loss/
    );
    expect(bloqueoPrecio({ type: "stop", side: "sell", price: 100, current: 100 })).toMatch(
      /Stop Loss/
    );
    expect(bloqueoPrecio({ type: "stop", side: "sell", price: 90, current: 100 })).toBeNull();
    expect(bloqueoPrecio({ type: "take", side: "sell", price: 95, current: 100 })).toMatch(
      /Take Profit/
    );
    expect(bloqueoPrecio({ type: "take", side: "sell", price: 110, current: 100 })).toBeNull();
  });

  it("el límite solo avisa y nunca bloquea", () => {
    expect(bloqueoPrecio({ type: "limit", side: "buy", price: 120, current: 100 })).toBeNull();
    expect(bloqueoPrecio({ type: "limit", side: "sell", price: 90, current: 100 })).toBeNull();
  });

  it("no opina de compras con stop/take ni sin precio", () => {
    expect(avisoPrecio({ type: "stop", side: "sell", price: 105, current: 100 })).toBeNull();
    expect(bloqueoPrecio({ type: "stop", side: "buy", price: 90, current: 100 })).toBeNull();
    expect(bloqueoPrecio({ type: "take", side: "buy", price: 110, current: 100 })).toBeNull();
    expect(bloqueoPrecio({ type: "stop", side: "sell", price: 0, current: 100 })).toBeNull();
    expect(avisoPrecio({ type: "limit", side: "buy", price: 0, current: 100 })).toBeNull();
    expect(avisoPrecio({ type: "market", side: "buy", price: 100, current: 100 })).toBeNull();
  });
});
