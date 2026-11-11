/**
 * Datos de mercados y acciones del mock. La lista de acciones puede variar en el proyecto
 * final; aquí es un subconjunto representativo de los cinco mercados.
 */
export const MERCADOS = [
  {
    codigo: "NYSE",
    nombre: "New York Stock Exchange",
    zonaHoraria: "America/New_York",
    horaApertura: "09:30",
    horaCierre: "16:00",
    diasHabiles: "LUNES_A_VIERNES",
  },
  {
    codigo: "NASDAQ",
    nombre: "NASDAQ",
    zonaHoraria: "America/New_York",
    horaApertura: "09:30",
    horaCierre: "16:00",
    diasHabiles: "LUNES_A_VIERNES",
  },
  {
    codigo: "LSE",
    nombre: "London Stock Exchange",
    zonaHoraria: "Europe/London",
    horaApertura: "08:00",
    horaCierre: "16:30",
    diasHabiles: "LUNES_A_VIERNES",
  },
  {
    codigo: "TSE",
    nombre: "Tokyo Stock Exchange",
    zonaHoraria: "Asia/Tokyo",
    horaApertura: "09:00",
    horaCierre: "15:00",
    diasHabiles: "LUNES_A_VIERNES",
  },
  {
    codigo: "ASX",
    nombre: "Australian Securities Exchange",
    zonaHoraria: "Australia/Sydney",
    horaApertura: "10:00",
    horaCierre: "16:00",
    diasHabiles: "LUNES_A_VIERNES",
  },
];

const PASO_MS = 5 * 60 * 1000;
const DIAS_HABILES = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);
const formateadores = new Map();

function formateador(zona) {
  if (!formateadores.has(zona)) {
    formateadores.set(
      zona,
      new Intl.DateTimeFormat("en-US", {
        timeZone: zona,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    );
  }
  return formateadores.get(zona);
}

function minutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** ¿Está abierto el mercado en el instante dado (hora local del mercado)? */
function estaAbierto(mercado, instante) {
  const partes = Object.fromEntries(
    formateador(mercado.zonaHoraria)
      .formatToParts(instante)
      .map((p) => [p.type, p.value])
  );
  if (!DIAS_HABILES.has(partes.weekday)) return false;
  const actual = Number(partes.hour) * 60 + Number(partes.minute);
  return actual >= minutos(mercado.horaApertura) && actual < minutos(mercado.horaCierre);
}

/**
 * Estado del mercado en `ahora`, con la forma de `GET /mercados/{codigo}/estado`.
 * Calcula el próximo cambio buscando hacia adelante en pasos de 5 minutos (máx. 8 días).
 */
export function estadoDeMercado(mercado, ahora = new Date()) {
  const abierto = estaAbierto(mercado, ahora);
  let cambio = null;
  let t = Math.ceil(ahora.getTime() / PASO_MS) * PASO_MS;
  for (let i = 0; i < (8 * 24 * 60) / 5; i += 1, t += PASO_MS) {
    if (estaAbierto(mercado, new Date(t)) !== abierto) {
      cambio = new Date(t).toISOString();
      break;
    }
  }
  return {
    codigo: mercado.codigo,
    estado: abierto ? "ABIERTO" : "CERRADO",
    abierto,
    zonaHoraria: mercado.zonaHoraria,
    proximoCierre: abierto ? cambio : null,
    proximaApertura: abierto ? null : cambio,
    restricciones: [],
  };
}

export const ACCIONES = [
  {
    ticker: "AAPL",
    nombre: "Apple Inc.",
    mercado: "NYSE",
    sector: "TECNOLOGIA",
    moneda: "USD",
    precio: 176.5,
    variacion: 0.51,
  },
  {
    ticker: "MSFT",
    nombre: "Microsoft Corp.",
    mercado: "NYSE",
    sector: "TECNOLOGIA",
    moneda: "USD",
    precio: 335.0,
    variacion: -0.31,
  },
  {
    ticker: "TSLA",
    nombre: "Tesla Inc.",
    mercado: "NYSE",
    sector: "CONSUMO",
    moneda: "USD",
    precio: 280.0,
    variacion: 1.84,
  },
  {
    ticker: "NVDA",
    nombre: "NVIDIA Corp.",
    mercado: "NYSE",
    sector: "TECNOLOGIA",
    moneda: "USD",
    precio: 118.4,
    variacion: 2.1,
  },
  {
    ticker: "AMZN",
    nombre: "Amazon.com Inc.",
    mercado: "NYSE",
    sector: "CONSUMO",
    moneda: "USD",
    precio: 130.5,
    variacion: -0.45,
  },
  {
    ticker: "XOM",
    nombre: "Exxon Mobil Corp.",
    mercado: "NYSE",
    sector: "ENERGIA",
    moneda: "USD",
    precio: 112.3,
    variacion: 0.22,
  },
  {
    ticker: "SHEL",
    nombre: "Shell plc",
    mercado: "LSE",
    sector: "ENERGIA",
    moneda: "USD",
    precio: 66.8,
    variacion: -0.12,
  },
  {
    ticker: "7203",
    nombre: "Toyota Motor Corp.",
    mercado: "TSE",
    sector: "CONSUMO",
    moneda: "USD",
    precio: 17.4,
    variacion: 0.8,
  },
  {
    ticker: "BHP",
    nombre: "BHP Group",
    mercado: "ASX",
    sector: "ENERGIA",
    moneda: "USD",
    precio: 28.9,
    variacion: 0.35,
  },
];

/** Montos del contrato: texto decimal con punto y dos decimales. */
export const monto = (n) => Number(n).toFixed(2);
