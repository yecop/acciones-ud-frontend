import { describe, expect, it } from "vitest";
import { etiquetaEstado, etiquetaLado, etiquetaTipo, puedeCancelar } from "./estadosOrden.js";

describe("estadosOrden", () => {
  it("etiqueta los 10 estados definidos por backend", () => {
    const estados = [
      "PENDIENTE",
      "ENVIADA",
      "FIRMADA_POR_COMISIONISTA",
      "EN_EJECUCION",
      "CANCELADA",
      "RECHAZADA",
      "EXPIRADA",
      "EN_REVISION",
      "FALLIDA",
      "DETENIDA",
    ];
    for (const estado of estados) {
      expect(etiquetaEstado({ estado, cantidad: 2 }).etiqueta).not.toBe(estado);
    }
  });

  it("EN_EJECUCION se muestra como Ejecutada o Parcial según la cantidad ejecutada", () => {
    expect(etiquetaEstado({ estado: "EN_EJECUCION", cantidad: 4, cantidadEjecutada: 0 })).toEqual({
      etiqueta: "En ejecución",
      tono: "neutro",
    });
    expect(etiquetaEstado({ estado: "EN_EJECUCION", cantidad: 4, cantidadEjecutada: 2 })).toEqual({
      etiqueta: "Parcial (2/4)",
      tono: "aviso",
    });
    expect(etiquetaEstado({ estado: "EN_EJECUCION", cantidad: 4, cantidadEjecutada: 4 })).toEqual({
      etiqueta: "Ejecutada",
      tono: "positivo",
    });
  });

  it("solo PENDIENTE y EN_REVISION se pueden cancelar", () => {
    expect(puedeCancelar({ estado: "PENDIENTE" })).toBe(true);
    expect(puedeCancelar({ estado: "EN_REVISION" })).toBe(true);
    expect(puedeCancelar({ estado: "EN_EJECUCION" })).toBe(false);
    expect(puedeCancelar({ estado: "CANCELADA" })).toBe(false);
  });

  it("etiquetas de tipo y lado", () => {
    expect(etiquetaTipo("STOP_LOSS")).toBe("Stop Loss");
    expect(etiquetaLado("VENTA")).toBe("Venta");
  });
});
