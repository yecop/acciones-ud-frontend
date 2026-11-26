/**
 * Ayudas del campo de precio según el tipo de orden. Son orientativas y NO bloquean el envío:
 * quien decide si una orden es válida es el backend (⚠ cuándo se activa una Stop Loss o una
 * Take Profit no está definido en el contrato; aquí se usa la convención habitual del mercado).
 */

export const GUIA_TIPO = {
  limit: {
    etiqueta: "Precio límite",
    ayuda: "Precio máximo que pagas (compra) o mínimo que aceptas (venta) por acción.",
  },
  stop: {
    etiqueta: "Precio stop",
    ayuda:
      "Stop Loss: la orden se activa cuando el precio llega a este valor, para limitar pérdidas.",
  },
  take: {
    etiqueta: "Precio objetivo",
    ayuda:
      "Take Profit: la orden se activa cuando el precio llega a este valor, para asegurar ganancias.",
  },
};

/** Diferencia porcentual del precio escrito frente al actual (`null` si no se puede calcular). */
export function diferenciaPorcentual(precio, actual) {
  if (!(precio > 0) || !(actual > 0)) return null;
  return ((precio - actual) / actual) * 100;
}

/** «+2,3 % sobre el precio actual» / «−1,0 % bajo el precio actual». */
export function textoDiferencia(precio, actual) {
  const d = diferenciaPorcentual(precio, actual);
  if (d === null) return null;
  if (Math.abs(d) < 0.05) return "Igual al precio actual";
  const valor = Math.abs(d).toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return d > 0 ? `${valor} % sobre el precio actual` : `${valor} % bajo el precio actual`;
}

/**
 * Aviso no bloqueante cuando el precio parece inconsistente con el tipo y la operación:
 * - Limit de compra por encima del mercado, o de venta por debajo: se ejecutaría de inmediato.
 * - Stop Loss de venta por encima del mercado: no limita pérdidas, se activaría de inmediato.
 * - Take Profit de venta por debajo del mercado: se activaría de inmediato.
 * @returns {string|null}
 */
export function avisoPrecio({ type, side, price, current }) {
  if (!(price > 0) || !(current > 0)) return null;
  const compra = side === "buy";
  if (type === "limit") {
    if (compra && price > current)
      return "Tu límite de compra está por encima del precio actual: se ejecutaría de inmediato al precio de mercado.";
    if (!compra && price < current)
      return "Tu límite de venta está por debajo del precio actual: se ejecutaría de inmediato al precio de mercado.";
  }
  if (type === "stop" && !compra && price >= current)
    return "Un Stop Loss de venta debería estar por debajo del precio actual; así se activaría de inmediato.";
  if (type === "take" && !compra && price <= current)
    return "Una Take Profit de venta debería estar por encima del precio actual; así se activaría de inmediato.";
  return null;
}
