import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ACCIONES } from "../../mocks/mercadosData.js";
import { server } from "../../mocks/server.js";
import { iniciarSesionMock } from "../../test/sesionMock.js";
import PanelMercados from "./PanelMercados.jsx";

const API = "*/api/v1";
const haceSegundos = (s) => new Date(Date.now() - s * 1000).toISOString();

/** Fija si cada mercado está abierto (si no, el estado depende de la hora real y de la zona). */
const estadoFijo = (abiertoPorMercado) =>
  mswHttp.get(`${API}/mercados/:codigo/estado`, ({ params }) => {
    const abierto = abiertoPorMercado[params.codigo] ?? false;
    return HttpResponse.json({
      codigo: params.codigo,
      estado: abierto ? "ABIERTO" : "CERRADO",
      abierto,
      zonaHoraria: "America/New_York",
      proximoCierre: abierto ? "2026-11-12T21:00:00Z" : null,
      proximaApertura: abierto ? null : "2026-11-13T14:30:00Z",
      restricciones: [],
    });
  });

/**
 * Respuesta de `GET /acciones` con la cotización dentro de cada acción, como la manda el backend:
 * incluye su umbral de antigüedad y si está desactualizada. `edades` y `umbrales` se indican por
 * ticker (segundos); `extra(ticker)` permite añadir `advertencia` o quitar la cotización.
 */
const listaDeAcciones = ({ edades = {}, umbrales = {}, umbralPorMercado, sinCotizacion } = {}) =>
  mswHttp.get(`${API}/acciones`, ({ request }) => {
    const mercado = new URL(request.url).searchParams.get("mercado");
    const contenido = ACCIONES.filter((a) => !mercado || a.mercado === mercado).map(
      ({ precio: _p, variacion: _v, ...accion }) => {
        if (sinCotizacion?.(accion.ticker)) {
          return {
            ...accion,
            advertencia: {
              codigo: "PROVEEDOR_NO_DISPONIBLE",
              mensaje: "El proveedor no responde.",
            },
          };
        }
        const edad = edades[accion.ticker] ?? 3;
        const umbral = umbrales[accion.ticker] ?? umbralPorMercado?.[accion.mercado] ?? 15;
        const desactualizada = edad > umbral;
        return {
          ...accion,
          cotizacion: {
            ticker: accion.ticker,
            precio: "100.00",
            bid: "99.98",
            ask: "100.02",
            spread: "0.04",
            variacionPorcentaje: "0.50",
            volumen: 1000,
            fuente: "ALPACA_IEX",
            actualizadoEn: haceSegundos(edad),
            antiguedadSegundos: edad,
            umbralAntiguedadSegundos: umbral,
            desactualizada,
            ...(desactualizada
              ? { advertencia: { codigo: "DATO_DESACTUALIZADO", mensaje: "Dato desactualizado." } }
              : {}),
          },
        };
      }
    );
    return HttpResponse.json({
      contenido,
      pagina: 0,
      tamano: 100,
      totalElementos: contenido.length,
      totalPaginas: 1,
    });
  });

const error502 = () =>
  HttpResponse.json(
    { status: 502, codigo: "PROVEEDOR_NO_DISPONIBLE", mensaje: "x", traceId: "t" },
    { status: 502 }
  );

const renderPanel = () => render(<PanelMercados intervaloMs={1_000_000} />);
const grupo = (nombre) => screen.getByRole("region", { name: nombre });
const filas = (region) =>
  within(region)
    .getAllByRole("row")
    .slice(1)
    .map((fila) => fila.getAttribute("data-ticker"));

describe("PanelMercados", () => {
  beforeEach(async () => {
    await iniciarSesionMock();
  });
  afterEach(() => server.resetHandlers());

  it("muestra los cinco mercados con sus acciones y la cotización completa", async () => {
    server.use(estadoFijo({ NYSE: true }));
    renderPanel();

    const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
    expect(within(nyse).getByText("Abierto")).toBeInTheDocument();
    for (const nombre of [/nasdaq/i, /london/i, /tokyo/i, /australian/i]) {
      expect(screen.getByRole("region", { name: nombre })).toBeInTheDocument();
    }

    const aapl = await waitFor(() => {
      const fila = within(nyse)
        .getAllByRole("row")
        .find((f) => f.getAttribute("data-ticker") === "AAPL");
      expect(within(fila).getByText(/176,50/)).toBeInTheDocument();
      return fila;
    });
    // Último precio, bid, ask y spread.
    expect(within(aapl).getByText(/176,48/)).toBeInTheDocument();
    expect(within(aapl).getByText(/176,52/)).toBeInTheDocument();
    expect(within(aapl).getByText(/0,04/)).toBeInTheDocument();
  });

  it("LSE, TSE y ASX se marcan como «cierre diario» y «ejecución simulada»; NYSE y NASDAQ no", async () => {
    renderPanel();
    await screen.findByRole("region", { name: /london/i });

    for (const nombre of [/london/i, /tokyo/i, /australian/i]) {
      const region = grupo(nombre);
      expect(within(region).getByText("Cierre diario")).toBeInTheDocument();
      expect(within(region).getByText("Ejecución simulada")).toBeInTheDocument();
    }
    for (const nombre of [/new york/i, /nasdaq/i]) {
      const region = grupo(nombre);
      expect(within(region).queryByText("Cierre diario")).not.toBeInTheDocument();
      expect(within(region).queryByText("Ejecución simulada")).not.toBeInTheDocument();
    }
  });

  it("indica la próxima apertura de un mercado cerrado", async () => {
    server.use(estadoFijo({ NYSE: false }));
    renderPanel();

    const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
    await waitFor(() => expect(within(nyse).getByText("Cerrado")).toBeInTheDocument());
    expect(within(nyse).getByText(/^Abre /)).toBeInTheDocument();
  });

  it("las acciones de los intereses del usuario van primero, y también sus mercados", async () => {
    server.use(
      mswHttp.get(`${API}/perfil`, () =>
        HttpResponse.json({ intereses: { mercados: ["TSE"], sectores: ["ENERGIA"] } })
      )
    );
    renderPanel();

    const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
    // En NYSE, XOM (energía) pasa por delante del resto.
    await waitFor(() => expect(filas(nyse)[0]).toBe("XOM"));
    expect(within(nyse).getAllByText(/de tu interés/i)).toHaveLength(1);
    // El mercado de interés (TSE) aparece antes que los demás.
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos[0]).toMatch(/tokyo/i);
  });

  it("si no se puede leer el perfil, igual muestra todo sin orden especial", async () => {
    server.use(mswHttp.get(`${API}/perfil`, () => error502()));
    renderPanel();

    const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
    await waitFor(() => expect(filas(nyse)).toContain("AAPL"));
    expect(screen.queryByText(/de tu interés/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("pide las acciones con una sola llamada por mercado y ninguna cotización por separado", async () => {
    const llamadas = { acciones: 0, cotizacion: 0 };
    server.use(
      mswHttp.get(`${API}/acciones`, () => {
        llamadas.acciones += 1;
        return undefined; // sigue con el mock por defecto
      }),
      mswHttp.get(`${API}/acciones/:ticker/cotizacion`, () => {
        llamadas.cotizacion += 1;
        return undefined;
      })
    );
    renderPanel();

    await screen.findByRole("region", { name: /new york stock exchange/i });
    await waitFor(() => expect(llamadas.acciones).toBe(5));
    expect(llamadas.cotizacion).toBe(0);
  });

  describe("advertencia de dato antiguo (la fija el backend)", () => {
    it("aparece con el mercado abierto y una cotización por encima de su umbral, solo en esa acción", async () => {
      server.use(estadoFijo({ NYSE: true }), listaDeAcciones({ edades: { AAPL: 30 } }));
      renderPanel();

      const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
      await waitFor(() => expect(within(nyse).getByText(/dato antiguo/i)).toBeInTheDocument());
      expect(within(nyse).getAllByText(/dato antiguo/i)).toHaveLength(1);
      const aapl = within(nyse)
        .getAllByRole("row")
        .find((f) => f.getAttribute("data-ticker") === "AAPL");
      expect(within(aapl).getByText(/dato antiguo/i)).toBeInTheDocument();
      expect(within(aapl).getByText(/hace (29|30|31) s/i)).toBeInTheDocument();
    });

    it("no aparece si la cotización es reciente", async () => {
      server.use(estadoFijo({ NYSE: true }), listaDeAcciones());
      renderPanel();

      const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
      await waitFor(() =>
        expect(within(nyse).getAllByText(/ahora mismo|hace \d+ s/i).length).toBeGreaterThan(0)
      );
      expect(screen.queryByText(/dato antiguo/i)).not.toBeInTheDocument();
    });

    it("no aparece con el mercado cerrado: es el último cierre", async () => {
      server.use(estadoFijo({ NYSE: false }), listaDeAcciones({ edades: { AAPL: 3 * 86400 } }));
      renderPanel();

      const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
      await waitFor(() =>
        expect(within(nyse).getAllByText(/último cierre/i).length).toBeGreaterThan(0)
      );
      expect(screen.queryByText(/dato antiguo/i)).not.toBeInTheDocument();
    });

    it("usa el umbral que manda el backend para cada mercado, no uno propio", async () => {
      // LSE/TSE/ASX: 30 min. 20 min es normal y 40 min es antiguo.
      server.use(
        estadoFijo({ TSE: true }),
        listaDeAcciones({
          umbralPorMercado: { TSE: 1800 },
          edades: { 7203: 20 * 60 },
        })
      );
      renderPanel();
      const tokyo = await screen.findByRole("region", { name: /tokyo/i });
      await waitFor(() =>
        expect(within(tokyo).getAllByText(/hace (19|20) min/i).length).toBeGreaterThan(0)
      );
      expect(screen.queryByText(/dato antiguo/i)).not.toBeInTheDocument();

      server.use(listaDeAcciones({ umbralPorMercado: { TSE: 1800 }, edades: { 7203: 40 * 60 } }));
      await userEvent.click(screen.getByRole("button", { name: /actualizar/i }));
      await waitFor(() => expect(within(tokyo).getByText(/dato antiguo/i)).toBeInTheDocument());
    });

    it("un umbral mayor del backend evita la advertencia aunque pasen 60 s", async () => {
      server.use(
        estadoFijo({ NYSE: true }),
        listaDeAcciones({ umbrales: { AAPL: 120 }, edades: { AAPL: 60 } })
      );
      renderPanel();

      const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
      await waitFor(() =>
        expect(within(nyse).getAllByText(/hace (59 s|1 min)/i).length).toBeGreaterThan(0)
      );
      expect(screen.queryByText(/dato antiguo/i)).not.toBeInTheDocument();
    });
  });

  describe("cuando el proveedor falla", () => {
    it("si el backend avisa de que ninguna acción tiene cotización, lo dice y permite reintentar", async () => {
      server.use(listaDeAcciones({ sinCotizacion: () => true }));
      renderPanel();

      const alerta = await screen.findByText(
        /el proveedor de datos de mercado no está disponible/i
      );
      expect(alerta).toBeInTheDocument();
      // Se siguen viendo los mercados y las acciones, sin precios.
      expect(screen.getByRole("region", { name: /new york stock exchange/i })).toBeInTheDocument();
      expect(screen.getAllByText(/cotización no disponible/i).length).toBeGreaterThan(0);

      server.use(listaDeAcciones());
      await userEvent.click(screen.getAllByRole("button", { name: /reintentar/i })[0]);

      await waitFor(() =>
        expect(
          screen.queryByText(/el proveedor de datos de mercado no está disponible/i)
        ).not.toBeInTheDocument()
      );
      expect((await screen.findAllByText(/100,00/)).length).toBeGreaterThan(0);
    });

    it("si falla una sola acción, el resto se muestra y no hay aviso global", async () => {
      server.use(listaDeAcciones({ sinCotizacion: (t) => t === "MSFT" }));
      renderPanel();

      const nasdaq = await screen.findByRole("region", { name: /nasdaq/i });
      await waitFor(() =>
        expect(within(nasdaq).getByText(/cotización no disponible/i)).toBeInTheDocument()
      );
      expect(within(nasdaq).getAllByText(/100,00/).length).toBeGreaterThan(0);
      const nyse = screen.getByRole("region", { name: /new york stock exchange/i });
      expect(within(nyse).getAllByText(/100,00/).length).toBeGreaterThan(0);
      expect(
        screen.queryByText(/el proveedor de datos de mercado no está disponible/i)
      ).not.toBeInTheDocument();
    });

    it("si falla la carga de un mercado, ese mercado lo dice y los demás siguen", async () => {
      server.use(
        mswHttp.get(`${API}/acciones`, ({ request }) =>
          new URL(request.url).searchParams.get("mercado") === "LSE" ? error502() : undefined
        )
      );
      renderPanel();

      const londres = await screen.findByRole("region", { name: /london/i });
      await waitFor(() =>
        expect(within(londres).getByText(/no pudimos cargar las acciones/i)).toBeInTheDocument()
      );
      const nyse = screen.getByRole("region", { name: /new york stock exchange/i });
      await waitFor(() => expect(within(nyse).getAllByText(/176,50/).length).toBeGreaterThan(0));
    });

    it("si falla la lista de mercados, muestra el error y se recupera al reintentar", async () => {
      server.use(
        mswHttp.get(
          `${API}/mercados`,
          () =>
            HttpResponse.json(
              { status: 503, codigo: "SERVICIO_NO_DISPONIBLE", mensaje: "x", traceId: "t" },
              { status: 503 }
            ),
          { once: true }
        )
      );
      renderPanel();

      expect(await screen.findByText(/no pudimos cargar los mercados/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));

      expect(
        await screen.findByRole("region", { name: /new york stock exchange/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/no pudimos cargar los mercados/i)).not.toBeInTheDocument();
    });
  });
});
