/**
 * Formato de montos del contrato (texto con 2 decimales) para la interfaz.
 * @param {string|number|undefined|null} valor
 * @param {string} [moneda="USD"]
 */
export function formatearPrecio(valor, moneda = "USD") {
  if (valor === undefined || valor === null || valor === "") return "—";
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
}

/** Volumen con separador de miles. */
export function formatearVolumen(valor) {
  if (valor === undefined || valor === null) return "—";
  return new Intl.NumberFormat("es-CO").format(valor);
}

/** Fecha y hora local con segundos. */
export function formatearFechaHora(iso) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(fecha);
}
