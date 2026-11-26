/** Presentación de los estados de una propuesta ([Propuesta]: ver docs/trading-mock.md). */

const ESTADOS = {
  PENDIENTE_APROBACION: { etiqueta: "Pendiente de aprobación", tono: "aviso" },
  APROBADA: { etiqueta: "Aprobada", tono: "positivo" },
  FIRMADA: { etiqueta: "Firmada", tono: "positivo" },
  RECHAZADA: { etiqueta: "Rechazada", tono: "negativo" },
  VENCIDA: { etiqueta: "Vencida", tono: "apagado" },
};

export const OPCIONES_ESTADO_PROPUESTA = Object.entries(ESTADOS).map(([valor, { etiqueta }]) => ({
  valor,
  etiqueta,
}));

export const etiquetaEstadoPropuesta = (estado) =>
  ESTADOS[estado] ?? { etiqueta: String(estado ?? "—"), tono: "neutro" };

const VIGENTES = new Set(["PENDIENTE_APROBACION", "APROBADA"]);

/** Una propuesta admite acciones solo mientras esté vigente y no haya pasado su fecha. */
export const estaVigente = (p, ahora = Date.now()) =>
  VIGENTES.has(p?.estado) && Date.parse(p.venceEn) > ahora;

/** «Vence en 2 días» / «Vence en 5 h» / «Venció»; `null` si ya no corre el plazo. */
export function textoVencimiento(p, ahora = Date.now()) {
  if (!VIGENTES.has(p?.estado)) return null;
  const falta = Date.parse(p.venceEn) - ahora;
  if (!(falta > 0)) return "Venció: ya no admite acciones";
  const horas = Math.floor(falta / 3_600_000);
  if (horas < 1) return "Vence en menos de 1 hora";
  if (horas < 48) return `Vence en ${horas} h`;
  return `Vence en ${Math.floor(horas / 24)} días`;
}

/** Qué sigue según el rol y el estado (texto [Propuesta]). */
export function queSigue(estado, rol) {
  const comisionista = rol === "COM";
  const textos = {
    PENDIENTE_APROBACION: comisionista
      ? "Esperando la aprobación del cliente. No puedes modificarla; si vence, crea otra."
      : "Revisa las órdenes y decide: apruébala o recházala antes de que venza.",
    APROBADA: comisionista
      ? "El cliente la aprobó. Fírmala para crear sus órdenes antes de que venza."
      : "La aprobaste. Tu comisionista debe firmarla para que se creen las órdenes.",
    FIRMADA: comisionista
      ? "Firmada: las órdenes se crearon para el cliente (estado «Firmada por comisionista»)."
      : "Tu comisionista la firmó y se crearon las órdenes: síguelas en tu historial.",
    RECHAZADA: comisionista
      ? "El cliente la rechazó. Revisa el motivo y crea una nueva si corresponde."
      : "La rechazaste; no se creó ninguna orden.",
    VENCIDA: comisionista
      ? "Venció sin completarse y no se creó ninguna orden. Crea una nueva si aún aplica."
      : "Venció sin completarse y no se creó ninguna orden. Puedes pedirle una nueva a tu comisionista.",
  };
  return textos[estado] ?? null;
}

const ETIQUETA_TIPO = {
  MARKET: "A mercado",
  LIMIT: "Límite",
  STOP_LOSS: "Stop Loss",
  TAKE_PROFIT: "Take Profit",
};
export const etiquetaTipoOrdenPropuesta = (t) => ETIQUETA_TIPO[t] ?? t;
