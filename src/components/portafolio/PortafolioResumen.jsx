import styles from "./PortafolioResumen.module.css";
import { formatCurrency, formatPercent, toneFromValue } from "./portafolioUtils.js";

/**
 * Resumen del portafolio: valor total, costo invertido, ganancia/pérdida y
 * rendimiento porcentual.
 *
 * @param {object} props
 * @param {{valorTotal:string, costoTotal:string, gananciaPerdidaTotal:string, porcentajeGananciaPerdidaTotal:string, numeroPosiciones:number}} [props.resumen]
 * @param {boolean} [props.loading]
 * @param {string} [props.error]
 */
export default function PortafolioResumen({ resumen, loading = false, error = null }) {
  const toneGP = resumen ? toneFromValue(resumen.gananciaPerdidaTotal) : "neutral";
  const tonePct = resumen ? toneFromValue(resumen.porcentajeGananciaPerdidaTotal) : "neutral";

  return (
    <section className={styles.card} aria-labelledby="resumen-titulo">
      <div className={styles.header}>
        <h2 id="resumen-titulo" className={styles.title}>Resumen del portafolio</h2>
        {resumen && (
          <span className={styles.badge}>
            {resumen.numeroPosiciones}{" "}
            {resumen.numeroPosiciones === 1 ? "posición" : "posiciones"}
          </span>
        )}
      </div>

      {loading && <p className={styles.state} role="status">Cargando resumen…</p>}

      {!loading && error && (
        <p className={styles.error} role="alert">{error}</p>
      )}

      {!loading && !error && resumen && (
        <div className={styles.grid}>
          <div className={styles.item}>
            <span className={styles.label}>Valor total</span>
            <span className={styles.value}>{formatCurrency(resumen.valorTotal)}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Costo invertido</span>
            <span className={styles.value}>{formatCurrency(resumen.costoTotal)}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Ganancia / Pérdida</span>
            <span className={`${styles.value} ${styles[toneGP]}`}>
              {formatCurrency(resumen.gananciaPerdidaTotal)}
            </span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Rendimiento</span>
            <span className={`${styles.value} ${styles[tonePct]}`}>
              {formatPercent(resumen.porcentajeGananciaPerdidaTotal)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
