import styles from "./SaldoWidget.module.css";
import { formatCurrency } from "./portafolioUtils.js";

/**
 * Widget de saldo de la cuenta: dinero disponible, reservado y total.
 *
 * @param {object} props
 * @param {{disponible:string, reservado:string, total:string}} [props.saldo]
 * @param {boolean} [props.loading]
 * @param {string} [props.error]
 */
export default function SaldoWidget({ saldo, loading = false, error = null }) {
  return (
    <section className={styles.card} aria-labelledby="saldo-titulo">
      <h2 id="saldo-titulo" className={styles.title}>
        Mi dinero
      </h2>

      {loading && (
        <p className={styles.state} role="status">
          Cargando saldo…
        </p>
      )}

      {!loading && error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!loading && !error && saldo && (
        <div className={styles.grid}>
          <div className={`${styles.item} ${styles.featured}`}>
            <span className={styles.label}>Disponible</span>
            <span className={styles.value}>{formatCurrency(saldo.disponible)}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Reservado</span>
            <span className={styles.value}>{formatCurrency(saldo.reservado)}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Total</span>
            <span className={styles.value}>{formatCurrency(saldo.total)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
