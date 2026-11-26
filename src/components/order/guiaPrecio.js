/**
 * Ayudas y reglas del campo de precio según el tipo de orden. El backend sigue siendo quien valida
 * (⚠ cuándo se activa una Stop Loss o una Take Profit no está definido en el contrato; aquí se usa
 * la convención habitual del mercado).
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
 * Combinaciones que la interfaz NO deja enviar: un Stop Loss de venta en o sobre el precio actual
 * y una Take Profit de venta en o bajo el precio actual se activarían de inmediato, que no es lo
 * que significan esos tipos. ⚠ Regla de la convención del mercado: el contrato no la define y
 * backend puede cambiarla (todas las reglas viven en este archivo).
 * @returns {string|null} motivo del bloqueo
 */
export function bloqueoPrecio({ type, side, price, current }) {
  if (!(price > 0) || !(current > 0) || side === "buy") return null;
  if (type === "stop" && price >= current)
    return "Un Stop Loss de venta debe estar por debajo del precio actual; si no, se activaría de inmediato.";
  if (type === "take" && price <= current)
    return "Una Take Profit de venta debe estar por encima del precio actual; si no, se activaría de inmediato.";
  return null;
}

/**
 * Aviso no bloqueante: un límite que se ejecutaría de inmediato al precio de mercado.
 * @returns {string|null}
 */
export function avisoPrecio({ type, side, price, current }) {
  if (!(price > 0) || !(current > 0) || type !== "limit") return null;
  if (side === "buy" && price > current)
    return "Tu límite de compra está por encima del precio actual: se ejecutaría de inmediato al precio de mercado.";
  if (side !== "buy" && price < current)
    return "Tu límite de venta está por debajo del precio actual: se ejecutaría de inmediato al precio de mercado.";
  return null;
}
