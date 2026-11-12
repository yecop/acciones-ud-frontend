/**
 * Utilidades de presentación para saldo y portafolio (SCRUM-25).
 * Funciones puras para facilitar pruebas y reutilización.
 *
 * El backend ya entrega los montos como texto con 2 decimales; estas funciones
 * solo agregan formato de presentación (moneda, signo del porcentaje) y derivan
 * el `tone` ("positive" | "negative" | "neutral") usado por los estilos.
 */

/** Formatea un monto en texto ("1500.00") como moneda USD. */
export function formatCurrency(value) {
  const n = Number(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Formatea un porcentaje en texto ("26.67") como "+26.67 %" / "-20.00 %". */
export function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00 %";
  const signo = n > 0 ? "+" : "";
  return `${signo}${n.toFixed(2)} %`;
}

/**
 * Deriva el tono visual a partir de un valor numérico en texto.
 * @returns {"positive"|"negative"|"neutral"}
 */
export function toneFromValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "neutral";
  return n > 0 ? "positive" : "negative";
}
