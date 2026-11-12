import styles from "./OrderSummary.module.css";
import { AlertIcon } from "../ui/Icons.jsx";
import { formatCurrency } from "./orderUtils.js";

/**
 * Resumen de la orden: desglose de montos, comisión, saldo y alerta de fondos.
 *
 * @param {object} props
 * @param {number} props.subtotal         Total de la transacción (precio x cantidad).
 * @param {number} props.commission       Comisión calculada (2%).
 * @param {number} props.total            Subtotal + comisión.
 * @param {number} props.availableBalance Saldo disponible del usuario.
 * @param {boolean} props.insufficientFunds Si el total supera el saldo.
 */
export default function OrderSummary({
  subtotal,
  commission,
  total,
  availableBalance,
  insufficientFunds,
}) {
  return (
    <div className={styles.summary}>
      <div className={styles.breakdown}>
        <div className={styles.row}>
          <p className={styles.label}>Total de la transacción</p>
          <p className={styles.value}>{formatCurrency(subtotal)}</p>
        </div>
        <div className={styles.row}>
          <p className={styles.label}>Comisión (2%)</p>
          <p className={styles.value}>{formatCurrency(commission)}</p>
        </div>
        <div className={`${styles.row} ${styles.totalRow}`}>
          <p className={styles.totalLabel}>Total + comisión</p>
          <p className={`${styles.totalValue} ${insufficientFunds ? styles.negative : ""}`}>
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className={styles.balanceRow}>
        <span className={styles.balanceLabel}>Saldo disponible</span>
        <span className={styles.balanceValue}>{formatCurrency(availableBalance)}</span>
      </div>

      {insufficientFunds && (
        <div className={styles.alert} role="alert">
          <span className={styles.alertIcon}>
            <AlertIcon />
          </span>
          <p className={styles.alertText}>
            Fondos insuficientes. El total supera tu saldo disponible por{" "}
            {formatCurrency(total - availableBalance)}.
          </p>
        </div>
      )}
    </div>
  );
}
