import { describe, expect, it } from "vitest";
import { describirMomento, nombreDeZona, textoMomento } from "./horaMercado.js";

describe("horaMercado", () => {
  it("nombra la zona del mercado", () => {
    expect(nombreDeZona("America/New_York")).toBe("Nueva York");
    expect(nombreDeZona("Asia/Tokyo")).toBe("Tokio");
    expect(nombreDeZona("America/Sao_Paulo")).toBe("Sao Paulo");
  });

  it("muestra la hora en la zona del mercado, no en la del navegador", () => {
    // 14:30 UTC = 9:30 a. m. en Nueva York (EST, noviembre).
    const m = describirMomento("2026-11-26T14:30:00Z", "America/New_York");
    expect(m.mercado).toMatch(/9:30/);
    expect(m.zona).toBe("Nueva York");
    expect(textoMomento("2026-11-26T14:30:00Z", "America/New_York")).toMatch(
      /\(hora de Nueva York\) · tu hora:/
    );
  });

  it("sin zona o con zona inválida solo muestra la hora de la persona", () => {
    expect(textoMomento("2026-11-26T14:30:00Z")).toMatch(/\(tu hora\)$/);
    expect(describirMomento("2026-11-26T14:30:00Z", "Nada/Inventado").mercado).toBeNull();
    expect(describirMomento("no es fecha", "America/New_York")).toBeNull();
    expect(textoMomento(null, "America/New_York")).toBeNull();
  });
});
