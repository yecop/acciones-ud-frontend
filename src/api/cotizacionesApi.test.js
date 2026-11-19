import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../mocks/server.js";
import { CotizacionesService } from "./cotizacionesApi.js";

describe("CotizacionesService (SCRUM-24)", () => {
  it("lista acciones enviando filtros y paginación como query params", async () => {
    let urlRecibida;
    server.use(
      mswHttp.get("*/api/v1/acciones", ({ request }) => {
        urlRecibida = new URL(request.url);
        return HttpResponse.json({
          contenido: [],
          pagina: 1,
          tamano: 10,
          totalElementos: 0,
          totalPaginas: 0,
        });
      })
    );

    await CotizacionesService.listarAcciones({
      mercado: "NASDAQ",
      sector: "",
      q: "  app ",
      pagina: 1,
      tamano: 10,
    });

    expect(urlRecibida.pathname).toBe("/api/v1/acciones");
    expect(urlRecibida.searchParams.get("mercado")).toBe("NASDAQ");
    expect(urlRecibida.searchParams.has("sector")).toBe(false);
    expect(urlRecibida.searchParams.get("q")).toBe("app");
    expect(urlRecibida.searchParams.get("pagina")).toBe("1");
    expect(urlRecibida.searchParams.get("tamano")).toBe("10");
  });

  it("obtiene la cotización con actualizadoEn", async () => {
    server.use(
      mswHttp.get("*/api/v1/acciones/:ticker/cotizacion", ({ params }) =>
        HttpResponse.json({
          ticker: params.ticker,
          precio: "190.00",
          actualizadoEn: "2026-01-05T15:00:00Z",
        })
      )
    );

    const cotizacion = await CotizacionesService.obtenerCotizacion("AAPL");
    expect(cotizacion).toMatchObject({ ticker: "AAPL", actualizadoEn: "2026-01-05T15:00:00Z" });
  });

  it("traduce el 502 PROVEEDOR_NO_DISPONIBLE a ApiError", async () => {
    server.use(
      mswHttp.get("*/api/v1/acciones/:ticker/cotizacion", () =>
        HttpResponse.json(
          { status: 502, codigo: "PROVEEDOR_NO_DISPONIBLE", mensaje: "x", traceId: "t-1" },
          { status: 502 }
        )
      )
    );

    await expect(CotizacionesService.obtenerCotizacion("AAPL")).rejects.toMatchObject({
      status: 502,
      codigo: "PROVEEDOR_NO_DISPONIBLE",
    });
  });
});
