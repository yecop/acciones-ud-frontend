/**
 * Presentación de los estados de una orden.
 *
 * [Definido por backend] Existen 10 estados y NO existe EJECUTADA: las ejecuciones (incluidas las
 * parciales) van aparte, en `ejecuciones` y `cantidadEjecutada`. Cómo se ve una orden ya
 * completamente ejecutada está sin definir (⚠ pregunta abierta, docs/trading-mock.md); toda esa
 * decisión vive en `etiquetaEstado` para cambiarla en un solo lugar.
 */

const ESTADOS = {
  PENDIENTE: { etiqueta: "Pendiente", tono: "aviso" },
  ENVIADA: { etiqueta: "Enviada", tono: "neutro" },
  FIRMADA_POR_COMISIONISTA: { etiqueta: "Firmada por comisionista", tono: "neutro" },
  EN_EJECUCION: { etiqueta: "En ejecución", tono: "neutro" },
  CANCELADA: { etiqueta: "Cancelada", tono: "apagado" },
  RECHAZADA: { etiqueta: "Rechazada", tono: "negativo" },
  EXPIRADA: { etiqueta: "Expirada", tono: "apagado" },
  EN_REVISION: { etiqueta: "En revisión", tono: "aviso" },
  FALLIDA: { etiqueta: "Fallida", tono: "negativo" },
  DETENIDA: { etiqueta: "Detenida", tono: "negativo" },
};

/** [Propuesta de backend] Solo se puede cancelar en PENDIENTE o EN_REVISION. */
const CANCELABLES = new Set(["PENDIENTE", "EN_REVISION"]);

export const puedeCancelar = (orden) => CANCELABLES.has(orden?.estado);

/**
 * Texto y tono para mostrar el estado de una orden. Una orden EN_EJECUCION se muestra como
 * «Ejecutada» si ya ejecutó toda su cantidad, o como «Parcial (x/y)» si ejecutó una parte.
 * @returns {{etiqueta:string, tono:"positivo"|"negativo"|"aviso"|"neutro"|"apagado"}}
 */
export function etiquetaEstado(orden) {
  const base = ESTADOS[orden?.estado] ?? { etiqueta: orden?.estado ?? "—", tono: "neutro" };
  if (orden?.estado === "EN_EJECUCION") {
    const hecha = Number(orden.cantidadEjecutada ?? 0);
    if (hecha > 0 && hecha >= orden.cantidad) return { etiqueta: "Ejecutada", tono: "positivo" };
    if (hecha > 0) return { etiqueta: `Parcial (${hecha}/${orden.cantidad})`, tono: "aviso" };
  }
  return base;
}

const TIPOS = {
  MARKET: "Market",
  LIMIT: "Limit",
  STOP_LOSS: "Stop Loss",
  TAKE_PROFIT: "Take Profit",
};
export const etiquetaTipo = (tipo) => TIPOS[tipo] ?? tipo;
export const etiquetaLado = (lado) => (lado === "COMPRA" ? "Compra" : "Venta");

/** Opciones del filtro por estado (valor de la API y texto en español). */
export const OPCIONES_ESTADO = Object.entries(ESTADOS).map(([valor, { etiqueta }]) => ({
  valor,
  // ⚠ Una orden totalmente ejecutada sigue en EN_EJECUCION (ver `etiquetaEstado`).
  etiqueta: valor === "EN_EJECUCION" ? "En ejecución o ejecutada" : etiqueta,
}));
