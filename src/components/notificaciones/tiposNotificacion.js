/** Presentación de los tipos de notificación (⚠ el backend puede añadir tipos: ver docs). */
const TIPOS = {
  APERTURA_CIERRE_MERCADO: "Mercado",
  RESUMEN_DIARIO_OPERACIONES: "Resumen diario",
  ORDEN_EJECUTADA: "Orden ejecutada",
  ORDEN_CANCELADA: "Orden cancelada",
};

export const OPCIONES_TIPO = Object.entries(TIPOS).map(([valor, etiqueta]) => ({
  valor,
  etiqueta,
}));

/** Un tipo desconocido se muestra legible en vez de romper la lista. */
export const etiquetaTipo = (tipo) =>
  TIPOS[tipo] ??
  String(tipo ?? "Aviso")
    .toLowerCase()
    .replace(/_/g, " ");

/** Las notificaciones de órdenes enlazan al detalle de la orden (solo inversionistas). */
export const enlaceDeNotificacion = (n, rol) =>
  n.referenciaId && String(n.tipo).startsWith("ORDEN_") && rol === "INV"
    ? `/historial/${n.referenciaId}`
    : null;
