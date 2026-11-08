import { useMemo, useState } from "react";
import styles from "./OrderForm.module.css";

import OrderTypeSelector from "./OrderTypeSelector.jsx";
import OrderSummary from "./OrderSummary.jsx";
import { AlertIcon } from "../ui/Icons.jsx";
import {
  calculateOrder,
  orderTypeRequiresPrice,
  formatCurrency,
  ORDER_TYPES,
} from "./orderUtils.js";

/**
 * Formulario de creación de órdenes (trading).
 *
 * Reglas de negocio implementadas:
 * - Selector de tipo: Market / Limit / Stop Loss / Take Profit.
 * - Market Order oculta el input de precio y usa el precio actual.
 * - Calcula en tiempo real el total (precio x cantidad) y la comisión (2%).
 * - Valida fondos contra `saldoDisponible`; si no alcanza, deshabilita el botón.
 * - Si `isMarketOpen` es false, muestra banner y cambia el botón a "Encolar Orden".
 *
 * Pensado para importarse directamente en el DashboardPage.
 *
 * @param {object} props
 * @param {object} [props.asset]          { symbol, name, currentPrice }.
 * @param {number} props.saldoDisponible  Saldo disponible del usuario.
 * @param {boolean} [props.isMarketOpen]  Si el mercado está abierto.
 * @param {string} [props.defaultType]    Tipo de orden inicial.
 * @param {function} [props.onSubmit]     Recibe el payload de la orden.
 */
export default function OrderForm({
  asset = { symbol: "AAPL", name: "Apple Inc.", currentPrice: 176.5 },
  saldoDisponible = 0,
  isMarketOpen = true,
  defaultType = "market",
  onSubmit,
}) {
  const [orderType, setOrderType] = useState(defaultType);
  const [side, setSide] = useState("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  const requiresPrice = orderTypeRequiresPrice(orderType);

  // Precio efectivo: manual si el tipo lo requiere, de lo contrario el actual.
  const effectivePrice = requiresPrice
    ? parseFloat(price) || 0
    : asset.currentPrice;

  const { subtotal, commission, total } = useMemo(
    () =>
      calculateOrder({
        quantity: parseInt(quantity, 10),
        price: effectivePrice,
      }),
    [quantity, effectivePrice]
  );

  const insufficientFunds = total > saldoDisponible;
  const hasValidQuantity = parseInt(quantity, 10) > 0;
  const hasValidPrice = !requiresPrice || effectivePrice > 0;
  const canSubmit = hasValidQuantity && hasValidPrice && !insufficientFunds;

  const submitLabel = isMarketOpen ? "Ejecutar Orden" : "Encolar Orden";

  const handleQuantityChange = (e) => {
    // Solo enteros no negativos.
    const next = e.target.value.replace(/[^\d]/g, "");
    setQuantity(next);
  };

  const handlePriceChange = (e) => {
    // Números con hasta 2 decimales.
    const next = e.target.value.replace(/[^\d.]/g, "");
    setPrice(next);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      symbol: asset.symbol,
      side,
      type: orderType,
      quantity: parseInt(quantity, 10),
      price: effectivePrice,
      subtotal,
      commission,
      total,
      queued: !isMarketOpen,
    };
    if (onSubmit) onSubmit(payload);
    else console.info("Orden lista para enviar al API:", payload);
  };

  return (
    <section className={styles.card} aria-label="Crear orden">
      <div className={styles.header}>
        <h2 className={styles.title}>Nueva orden</h2>
        <p className={styles.asset}>
          {asset.symbol} · {asset.name} · {formatCurrency(asset.currentPrice)}
        </p>
      </div>

      {!isMarketOpen && (
        <div className={styles.banner} role="alert">
          <span className={styles.bannerIcon}>
            <AlertIcon />
          </span>
          <p className={styles.bannerText}>
            Mercado cerrado. Tu orden se encolará para la próxima apertura y te
            pediremos confirmarla.
          </p>
        </div>
      )}

      {/* Compra / Venta */}
      <div className={styles.side} role="group" aria-label="Lado de la orden">
        <button
          type="button"
          aria-pressed={side === "buy"}
          className={`${styles.sideBtn} ${side === "buy" ? styles.sideBuyActive : ""}`}
          onClick={() => setSide("buy")}
        >
          Comprar
        </button>
        <button
          type="button"
          aria-pressed={side === "sell"}
          className={`${styles.sideBtn} ${side === "sell" ? styles.sideSellActive : ""}`}
          onClick={() => setSide("sell")}
        >
          Vender
        </button>
      </div>

      <OrderTypeSelector types={ORDER_TYPES} value={orderType} onChange={setOrderType} />

      {/* Cantidad */}
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="order-quantity">
          Cantidad
        </label>
        <div className={styles.inputWrap}>
          <input
            id="order-quantity"
            className={styles.input}
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={quantity}
            onChange={handleQuantityChange}
          />
        </div>
        <span className={styles.hint}>Número de acciones (entero).</span>
      </div>

      {/* Precio: input para tipos con precio; bloque informativo para Market */}
      {requiresPrice ? (
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="order-price">
            Precio
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.prefix}>USD</span>
            <input
              id="order-price"
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={handlePriceChange}
            />
          </div>
          <span className={styles.hint}>Precio límite por acción.</span>
        </div>
      ) : (
        <div className={styles.marketPrice}>
          <span className={styles.marketPriceLabel}>
            Precio de mercado (actual)
          </span>
          <span className={styles.marketPriceValue}>
            {formatCurrency(asset.currentPrice)}
          </span>
        </div>
      )}

      <OrderSummary
        subtotal={subtotal}
        commission={commission}
        total={total}
        availableBalance={saldoDisponible}
        insufficientFunds={hasValidQuantity && insufficientFunds}
      />

      <button
        type="button"
        className={`${styles.submit} ${!isMarketOpen ? styles.submitQueue : ""}`}
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitLabel}
      </button>
    </section>
  );
}
