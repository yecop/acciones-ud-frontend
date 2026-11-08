/**
 * Utilidades de negocio para la creación de órdenes.
 * Funciones puras para facilitar pruebas y reutilización.
 */

/** Comisión aplicada sobre el total de la transacción (2%). */
export const COMMISSION_RATE = 0.02;

/** Tipos de orden soportados por la plataforma. */
export const ORDER_TYPES = [
  { id: "market", label: "Market Order", requiresPrice: false },
  { id: "limit", label: "Limit Order", requiresPrice: true },
  { id: "stop", label: "Stop Loss", requiresPrice: true },
  { id: "take", label: "Take Profit", requiresPrice: true },
];

/** Indica si un tipo de orden requiere precio manual. */
export function orderTypeRequiresPrice(typeId) {
  const type = ORDER_TYPES.find((t) => t.id === typeId);
  return type ? type.requiresPrice : true;
}

/**
 * Calcula los montos de una orden.
 *
 * @param {object} params
 * @param {number} params.quantity  Cantidad (entero >= 0).
 * @param {number} params.price      Precio unitario aplicado.
 * @param {number} [params.commissionRate=COMMISSION_RATE]
 * @returns {{ subtotal:number, commission:number, total:number }}
 */
export function calculateOrder({ quantity, price, commissionRate = COMMISSION_RATE }) {
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0;
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  const subtotal = safeQty * safePrice;
  const commission = subtotal * commissionRate;
  const total = subtotal + commission;
  return { subtotal, commission, total };
}

/** Formatea un número como moneda USD. */
export function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
