import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

/** Cotización con la edad indicada por ticker (segundos); el resto, recientes. */
const cotizacionesConEdad = (edades = {}) =>
  mswHttp.get(`${API}/acciones/:ticker/cotizacion`, ({ params }) =>
    HttpResponse.json({
      ticker: params.ticker,
      precio: "100.00",
      bid: "99.98",
      ask: "100.02",
      spread: "0.04",
      variacionPorcentaje: "0.50",
      actualizadoEn: haceSegundos(edades[params.ticker] ?? 3),
    })
  );

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

  describe("advertencia de dato antiguo", () => {
    it("aparece con el mercado abierto y una cotización vieja, solo en esa acción", async () => {
      server.use(estadoFijo({ NYSE: true }), cotizacionesConEdad({ AAPL: 330 }));
      renderPanel();

      const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
      await waitFor(() => expect(within(nyse).getByText(/dato antiguo/i)).toBeInTheDocument());
      expect(within(nyse).getAllByText(/dato antiguo/i)).toHaveLength(1);
      const aapl = within(nyse)
        .getAllByRole("row")
        .find((f) => f.getAttribute("data-ticker") === "AAPL");
      expect(within(aapl).getByText(/dato antiguo/i)).toBeInTheDocument();
      expect(within(aapl).getByText(/hace 5 min/i)).toBeInTheDocument();
    });

    it("no aparece si la cotización es reciente", async () => {
      server.use(estadoFijo({ NYSE: true }), cotizacionesConEdad());
      renderPanel();

      const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
      await waitFor(() => expect(within(nyse).getAllByText(/ahora mismo|hace \d+ s/i).length > 0));
      expect(screen.queryByText(/dato antiguo/i)).not.toBeInTheDocument();
    });

    it("no aparece con el mercado cerrado: es el último cierre", async () => {
      server.use(estadoFijo({ NYSE: false }), cotizacionesConEdad({ AAPL: 3 * 86400 }));
      renderPanel();

      const nyse = await screen.findByRole("region", { name: /new york stock exchange/i });
      await waitFor(() =>
        expect(within(nyse).getAllByText(/último cierre/i).length).toBeGreaterThan(0)
      );
      expect(screen.queryByText(/dato antiguo/i)).not.toBeInTheDocument();
    });

    it("en un mercado de cierre diario abierto, 10 h es normal y 40 h es antiguo", async () => {
      server.use(estadoFijo({ TSE: true }), cotizacionesConEdad({ 7203: 40 * 3600 }));
      renderPanel();

      const tokyo = await screen.findByRole("region", { name: /tokyo/i });
      await waitFor(() => expect(within(tokyo).getByText(/dato antiguo/i)).toBeInTheDocument());

      server.use(cotizacionesConEdad({ 7203: 10 * 3600 }));
      await userEvent.click(screen.getByRole("button", { name: /actualizar/i }));
      await waitFor(() => expect(screen.queryByText(/dato antiguo/i)).not.toBeInTheDocument());
    });
  });

  describe("cuando el proveedor falla", () => {
    it("si todas las cotizaciones fallan, lo dice y permite reintentar", async () => {
      server.use(mswHttp.get(`${API}/acciones/:ticker/cotizacion`, () => error502()));
      renderPanel();

      const alerta = await screen.findByText(
        /el proveedor de datos de mercado no está disponible/i
      );
      expect(alerta).toBeInTheDocument();
      // Se siguen viendo los mercados y las acciones, sin precios.
      expect(screen.getByRole("region", { name: /new york stock exchange/i })).toBeInTheDocument();
      expect(screen.getAllByText(/cotización no disponible/i).length).toBeGreaterThan(0);

      server.use(cotizacionesConEdad());
      await userEvent.click(screen.getAllByRole("button", { name: /reintentar/i })[0]);

      await waitFor(() =>
        expect(
          screen.queryByText(/el proveedor de datos de mercado no está disponible/i)
        ).not.toBeInTheDocument()
      );
      expect((await screen.findAllByText(/100,00/)).length).toBeGreaterThan(0);
    });

    it("si falla una sola cotización, el resto se muestra y no hay aviso global", async () => {
      server.use(
        mswHttp.get(`${API}/acciones/:ticker/cotizacion`, ({ params }) =>
          params.ticker === "MSFT"
            ? error502()
            : HttpResponse.json({
                ticker: params.ticker,
                precio: "100.00",
                bid: "99.98",
                ask: "100.02",
                spread: "0.04",
                variacionPorcentaje: "0.50",
                actualizadoEn: haceSegundos(3),
              })
        )
      );
      renderPanel();

      // MSFT cotiza en NASDAQ: ahí se ve el fallo; en NYSE siguen los precios.
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
