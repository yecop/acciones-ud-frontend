/**
 * Datos semilla del mock de comisionista (SCRUM-35, parte 3). Módulo hoja (no importa de los
 * demás mocks) para que `ordenes.js` pueda sembrar el estado sin importaciones circulares.
 */

export const COMISIONISTA_CARLOS = "c1000000-0000-4000-8000-000000000001";
export const COMISIONISTA_ANDREA = "c1000000-0000-4000-8000-000000000002";

/** Usuario COM que maneja cada comisionista del catálogo (Andrea no tiene sesión demo). */
export const USUARIO_DE_COMISIONISTA = {
  [COMISIONISTA_CARLOS]: "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e02",
};

/** Inversionistas demo con comisionista: Mateo es cliente de Carlos; Valentina, de Andrea. */
export const USUARIO_MATEO = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e07";
export const USUARIO_VALENTINA = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e08";

export const ID_PROPUESTA = (n) => `0c000000-0000-4000-8000-00000000000${n}`;
export const ID_ESTRATEGIA = (n) => `0d000000-0000-4000-8000-00000000000${n}`;

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;
const hace = (ms) => new Date(Date.now() - ms).toISOString();
const en = (ms) => new Date(Date.now() + ms).toISOString();

const CARLOS = { tipo: "COMISIONISTA", id: "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e02" };
const MATEO = { tipo: "USUARIO", id: USUARIO_MATEO };
const SISTEMA = { tipo: "SISTEMA", id: null };

function estrategias() {
  const e = (n, nombre, descripcion, perfilRiesgo, estado, antes) => ({
    id: ID_ESTRATEGIA(n),
    comisionistaId: COMISIONISTA_CARLOS,
    nombre,
    descripcion,
    perfilRiesgo,
    estado,
    creadaEn: hace(antes),
    actualizadaEn: hace(antes),
  });
  return [
    e(
      1,
      "Crecimiento tecnológico",
      "Empresas de tecnología con crecimiento sostenido; horizonte de 6 a 12 meses.",
      "MODERADO",
      "ACTIVA",
      40 * DIA
    ),
    e(
      2,
      "Dividendos estables",
      "Compañías de energía y consumo con pago regular de dividendos.",
      "CONSERVADOR",
      "ACTIVA",
      30 * DIA
    ),
    e(
      3,
      "Apuesta de corto plazo",
      "Operaciones tácticas de pocos días. Archivada.",
      "AGRESIVO",
      "ARCHIVADA",
      60 * DIA
    ),
  ];
}

function propuestas() {
  const p = (n, datos) => ({
    id: ID_PROPUESTA(n),
    comisionistaId: COMISIONISTA_CARLOS,
    clienteId: USUARIO_MATEO,
    estrategiaId: ID_ESTRATEGIA(1),
    nota: null,
    motivoRechazo: null,
    ordenesIds: [],
    ...datos,
  });
  const orden = (ticker, lado, tipo, cantidad, extra = {}) => ({
    ticker,
    lado,
    tipo,
    cantidad,
    precioLimite: null,
    precioStop: null,
    ...extra,
  });
  return [
    p(1, {
      titulo: "Ampliar posición en NVIDIA",
      nota: "Aprovechando el rezago frente al sector; límite por debajo del mercado.",
      estado: "PENDIENTE_APROBACION",
      ordenes: [orden("NVDA", "COMPRA", "LIMIT", 2, { precioLimite: "180.00" })],
      creadaEn: hace(3 * HORA),
      venceEn: en(3 * DIA),
      actualizadaEn: hace(3 * HORA),
      historial: [
        {
          estado: "PENDIENTE_APROBACION",
          fecha: hace(3 * HORA),
          actor: CARLOS,
          motivo: "Propuesta creada",
        },
      ],
    }),
    p(2, {
      titulo: "Protección con Stop Loss en TSLA",
      estado: "APROBADA",
      ordenes: [orden("TSLA", "VENTA", "STOP_LOSS", 1, { precioStop: "230.00" })],
      creadaEn: hace(2 * DIA),
      venceEn: en(2 * DIA),
      actualizadaEn: hace(1 * DIA),
      historial: [
        {
          estado: "PENDIENTE_APROBACION",
          fecha: hace(2 * DIA),
          actor: CARLOS,
          motivo: "Propuesta creada",
        },
        {
          estado: "APROBADA",
          fecha: hace(1 * DIA),
          actor: MATEO,
          motivo: "Aprobada por el cliente",
        },
      ],
    }),
    p(3, {
      titulo: "Rotación a energía",
      estrategiaId: ID_ESTRATEGIA(2),
      estado: "FIRMADA",
      ordenes: [orden("XOM", "COMPRA", "MARKET", 3)],
      creadaEn: hace(9 * DIA),
      venceEn: hace(2 * DIA),
      actualizadaEn: hace(7 * DIA),
      historial: [
        {
          estado: "PENDIENTE_APROBACION",
          fecha: hace(9 * DIA),
          actor: CARLOS,
          motivo: "Propuesta creada",
        },
        {
          estado: "APROBADA",
          fecha: hace(8 * DIA),
          actor: MATEO,
          motivo: "Aprobada por el cliente",
        },
        {
          estado: "FIRMADA",
          fecha: hace(7 * DIA),
          actor: CARLOS,
          motivo: "Firmada por el comisionista",
        },
      ],
    }),
    p(4, {
      titulo: "Compra de AAPL a mercado",
      estrategiaId: null,
      estado: "RECHAZADA",
      motivoRechazo: "Prefiero esperar a que baje el precio.",
      ordenes: [orden("AAPL", "COMPRA", "MARKET", 5)],
      creadaEn: hace(12 * DIA),
      venceEn: hace(9 * DIA),
      actualizadaEn: hace(11 * DIA),
      historial: [
        {
          estado: "PENDIENTE_APROBACION",
          fecha: hace(12 * DIA),
          actor: CARLOS,
          motivo: "Propuesta creada",
        },
        {
          estado: "RECHAZADA",
          fecha: hace(11 * DIA),
          actor: MATEO,
          motivo: "Prefiero esperar a que baje el precio.",
        },
      ],
    }),
    p(5, {
      titulo: "Toma de ganancias en MSFT",
      estado: "VENCIDA",
      ordenes: [orden("MSFT", "VENTA", "TAKE_PROFIT", 1, { precioStop: "560.00" })],
      creadaEn: hace(20 * DIA),
      venceEn: hace(17 * DIA),
      actualizadaEn: hace(17 * DIA),
      historial: [
        {
          estado: "PENDIENTE_APROBACION",
          fecha: hace(20 * DIA),
          actor: CARLOS,
          motivo: "Propuesta creada",
        },
        {
          estado: "VENCIDA",
          fecha: hace(17 * DIA),
          actor: SISTEMA,
          motivo: "Venció sin respuesta del cliente",
        },
      ],
    }),
  ];
}

/** Estado del mock de comisionista; vive dentro de `db.trading.comisionista`. */
export function crearEstadoComisionista() {
  return { estrategias: estrategias(), propuestas: propuestas() };
}
