/**
 * Datos por defecto del panel principal (dashboard de trading).
 *
 * En producción llegan desde el API Gateway (REST/JSON). La forma coincide
 * con la que consumen los componentes, así que la respuesta del backend puede
 * reemplazar este objeto directamente.
 */
export const dashboardData = {
  user: {
    name: "Julian",
    initials: "JV",
    role: "Inversionista · Premium",
    notifications: 3,
  },

  nav: [
    { id: "panel", label: "Panel", active: true },
    { id: "operar", label: "Operar" },
    { id: "portafolio", label: "Portafolio y órdenes" },
    { id: "perfil", label: "Perfil" },
  ],

  greeting: {
    title: "Buenas tardes, Julian",
    subtitle: "Lunes 2 de noviembre · NYSE y NASDAQ están abiertos",
  },

  kpis: [
    {
      id: "funds",
      label: "Fondos disponibles",
      value: "USD 4,250.00",
      hint: "Reservado en órdenes: USD 351.20",
    },
    {
      id: "portfolio",
      label: "Valor del portafolio",
      value: "USD 6,812.40",
      hint: "5 posiciones",
    },
    {
      id: "today",
      label: "Ganancia de hoy",
      value: "+USD 96.30",
      hint: "▲ 1.43 %",
      tone: "positive",
    },
    {
      id: "pending",
      label: "Órdenes pendientes",
      value: "2",
      hint: "Ver órdenes",
      hintLink: true,
    },
  ],

  featured: {
    symbol: "AAPL",
    name: "Apple Inc.",
    market: "NYSE",
    price: "USD 176.50",
    change: "▲ +0.90 (0.51 %)",
    tone: "positive",
    ranges: ["1D", "5D", "1M", "6M", "1A"],
    activeRange: "1D",
    yAxis: ["177.50", "176.75", "176.00", "175.25", "174.50"],
    xAxis: ["9:30", "11:00", "12:30", "14:00", "16:00"],
    stats: [
      { label: "Apertura", value: "175.60" },
      { label: "Máximo", value: "176.94" },
      { label: "Mínimo", value: "175.44" },
      { label: "Volumen", value: "48.2 M" },
      { label: "Capitalización", value: "2.71 B" },
    ],
  },

  markets: [
    { id: "nyse", name: "Nueva York (NYSE)", schedule: "Cierra 4:00 PM ET", status: "open" },
    { id: "nasdaq", name: "NASDAQ", schedule: "Cierra 4:00 PM ET", status: "open" },
    { id: "lse", name: "Londres (LSE)", schedule: "Abre 8:00 AM GMT", status: "closed" },
    { id: "tse", name: "Tokio (TSE)", schedule: "Abre 9:00 AM JST", status: "closed" },
    {
      id: "asx",
      name: "Sídney (ASX)",
      schedule: "Abre 10:00 AM hora de Sídney",
      status: "closed",
    },
  ],
  marketsNote:
    "Las órdenes fuera de horario se encolan para la próxima apertura y te pedimos confirmarlas.",

  watchlist: {
    sector: "Tecnología",
    rows: [
      { symbol: "AAPL", name: "Apple Inc.", price: "176.50", change: "▲ 0.51 %", tone: "positive" },
      { symbol: "MSFT", name: "Microsoft Corp.", price: "335.00", change: "▼ 0.31 %", tone: "negative" },
      { symbol: "TSLA", name: "Tesla Inc.", price: "280.00", change: "▲ 1.84 %", tone: "positive" },
      { symbol: "NVDA", name: "NVIDIA Corp.", price: "118.40", change: "▲ 2.10 %", tone: "positive" },
      { symbol: "AMZN", name: "Amazon.com Inc.", price: "130.50", change: "▼ 0.45 %", tone: "negative" },
    ],
  },

  /** Configuración para el formulario de creación de órdenes. */
  trading: {
    asset: { symbol: "AAPL", name: "Apple Inc.", currentPrice: 176.5 },
    // Debe reflejar los fondos disponibles reales del usuario.
    saldoDisponible: 4250.0,
    // NYSE/NASDAQ abiertos en el mockup del panel.
    isMarketOpen: true,
  },

  activity: [
    {
      id: "a1",
      title: "Compra ejecutada",
      detail: "2 acciones de AAPL a USD 175.60. Total con comisión: USD 358.22.",
      time: "Hace 12 min",
    },
    {
      id: "a2",
      title: "Alerta de precio · Premium",
      detail: "TSLA llegó a USD 280.00, tu precio objetivo.",
      time: "Hace 1 h",
    },
    {
      id: "a3",
      title: "Apertura de mercado",
      detail: "NYSE y NASDAQ abrieron a las 9:30 AM (ET).",
      time: "Hace 4 h",
    },
  ],
};
