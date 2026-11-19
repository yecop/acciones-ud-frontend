import { describe, expect, it } from "vitest";
import {
  evaluarAntiguedad,
  formatearAntiguedad,
  segundosDesde,
  superaUmbral,
  umbralDe,
  UMBRAL_ANTIGUEDAD_MS,
} from "./antiguedad.js";

const AHORA = new Date("2026-01-05T15:00:30Z").getTime();
const hace = (s) => new Date(AHORA - s * 1000).toISOString();

describe("antigüedad de cotizaciones (SCRUM-24)", () => {
  it("el umbral es de 15 s", () => {
    expect(UMBRAL_ANTIGUEDAD_MS).toBe(15_000);
  });

  it("calcula los segundos transcurridos respecto a la hora local", () => {
    expect(segundosDesde(hace(8), AHORA)).toBe(8);
    expect(segundosDesde(hace(-5), AHORA)).toBe(0); // reloj del cliente atrasado
    expect(segundosDesde("no-es-fecha", AHORA)).toBeNull();
    expect(segundosDesde(undefined, AHORA)).toBeNull();
  });

  it("supera el umbral solo con más de 15 s de retraso", () => {
    expect(superaUmbral(hace(15), AHORA)).toBe(false);
    expect(superaUmbral(new Date(AHORA - 15_001).toISOString(), AHORA)).toBe(true);
  });

  it("dato reciente: al día", () => {
    expect(evaluarAntiguedad({ actualizadoEn: hace(3) }, AHORA).estado).toBe("al-dia");
  });

  it("dato con más de 15 s respecto a la hora local: desactualizada", () => {
    const r = evaluarAntiguedad({ actualizadoEn: hace(16), desactualizada: false }, AHORA);
    expect(r.estado).toBe("desactualizada");
    expect(r.segundos).toBe(16);
    expect(r.mensaje).toMatch(/16 s/);
  });

  it("respeta la marca del backend aunque el reloj local diga otra cosa", () => {
    expect(evaluarAntiguedad({ actualizadoEn: hace(2), desactualizada: true }, AHORA).estado).toBe(
      "desactualizada"
    );
  });

  it("proveedor caído tiene prioridad", () => {
    const r = evaluarAntiguedad(
      { actualizadoEn: hace(40), advertencia: { codigo: "PROVEEDOR_NO_DISPONIBLE", mensaje: "x" } },
      AHORA
    );
    expect(r.estado).toBe("proveedor");
  });

  it("usa el umbral del mercado que envía el backend (internacionales)", () => {
    const lse = { actualizadoEn: hace(600), umbralAntiguedadSegundos: 1800 };
    expect(evaluarAntiguedad(lse, AHORA).estado).toBe("al-dia");
    expect(evaluarAntiguedad({ ...lse, actualizadoEn: hace(1801) }, AHORA).estado).toBe(
      "desactualizada"
    );
    expect(umbralDe({})).toBe(UMBRAL_ANTIGUEDAD_MS);
  });

  it("sin cotización", () => {
    expect(evaluarAntiguedad(null, AHORA).estado).toBe("sin-dato");
  });

  it("formatea la antigüedad", () => {
    expect(formatearAntiguedad(9)).toBe("9 s");
    expect(formatearAntiguedad(125)).toBe("2 min 5 s");
    expect(formatearAntiguedad(3_780)).toBe("1 h 3 min");
    expect(formatearAntiguedad(null)).toBe("—");
  });
});
