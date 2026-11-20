import {
  formatCurrency,
  formatPercent,
  toneFromValue,
} from "../components/portafolio/portafolioUtils.js";

const NO_DISPONIBLE = "—";

/** "+US$ 96,30" / "-US$ 12,00". */
function conSigno(monto) {
  const n = Number(monto);
  return `${n > 0 ? "+" : ""}${formatCurrency(monto)}`;
}

function textoPosiciones(n) {
  return n === 1 ? "1 posición" : `${n} posiciones`;
}

/**
 * Arma los datos del panel del inversionista mezclando lo que llega de la API con lo que todavía
 * es de ejemplo (gráfico, estadísticas y actividad: el contrato aún no tiene historial de precios
 * ni de actividad).
 *
 * Cada fuente es opcional: si una llamada falla, su tarjeta muestra «—» y el resto sigue.
 *
 * @param {object} p
 * @param {object} p.base            Datos de ejemplo (`dashboardData`).
 * @param {{nombre?:string, rol?:string}} p.persona
 * @param {{disponible:string, reservado:string}|null} p.saldo      GET /cuenta/saldo
 * @param {object|null} p.dashboard  GET /dashboard
 * @param {{abierto:boolean}|null} p.estadoMercado  Estado del mercado de la acción destacada.
 * @param {string} p.fecha           Subtítulo del saludo.
 */
export function construirDatosPanel({ base, persona, saldo, dashboard, estadoMercado, fecha }) {
  const nombre = persona.nombre ?? "";
  const alertas = dashboard?.alertas ?? [];
  const portafolio = dashboard?.portafolio ?? null;
  const destacada = dashboard?.accionesInteres?.[0] ?? null;

  const ganancia = portafolio?.gananciaPerdidaDia;
  const tonoGanancia = ganancia === undefined ? "neutral" : toneFromValue(ganancia);

  const kpis = [
    {
      id: "funds",
      label: "Fondos disponibles",
      value: saldo ? formatCurrency(saldo.disponible) : NO_DISPONIBLE,
      hint: saldo ? `Reservado en órdenes: ${formatCurrency(saldo.reservado)}` : "No disponible",
    },
    {
      id: "portfolio",
      label: "Valor del portafolio",
      value: portafolio ? formatCurrency(portafolio.valorTotal) : NO_DISPONIBLE,
      hint: portafolio ? textoPosiciones(portafolio.numeroPosiciones) : "No disponible",
    },
    {
      id: "today",
      label: "Ganancia de hoy",
      value: portafolio ? conSigno(ganancia) : NO_DISPONIBLE,
      hint: portafolio ? "En el día" : "No disponible",
      tone: tonoGanancia === "positive" ? "positive" : undefined,
    },
    {
      id: "alerts",
      label: "Alertas",
      value: dashboard ? String(alertas.length) : NO_DISPONIBLE,
      hint: !dashboard ? "No disponible" : alertas.length ? "Alertas activas" : "Sin alertas",
    },
  ];

  const featured = destacada
    ? {
        ...base.featured,
        symbol: destacada.ticker,
        name: destacada.nombre,
        market: destacada.mercado,
        price: formatCurrency(destacada.precio),
        change: formatPercent(destacada.variacionPorcentaje),
        tone: toneFromValue(destacada.variacionPorcentaje) === "negative" ? "negative" : "positive",
        // El contrato aún no entrega historial de precios: el trazo y las estadísticas son de ejemplo.
        ejemplo: true,
      }
    : { ...base.featured, ejemplo: true };

  return {
    ...base,
    user: {
      ...base.user,
      name: nombre,
      initials: nombre.slice(0, 2).toUpperCase(),
      role: persona.rol,
      notifications: alertas.length,
    },
    greeting: { title: `Hola, ${nombre}`, subtitle: fecha },
    kpis,
    featured,
    trading: destacada
      ? {
          asset: {
            symbol: destacada.ticker,
            name: destacada.nombre,
            currentPrice: Number(destacada.precio),
          },
          saldoDisponible: Number(saldo?.disponible ?? 0),
          isMarketOpen: estadoMercado?.abierto ?? true,
        }
      : { ...base.trading, saldoDisponible: Number(saldo?.disponible ?? 0) },
  };
}
