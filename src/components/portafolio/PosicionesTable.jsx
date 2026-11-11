import styles from "./PosicionesTable.module.css";
import { formatCurrency, formatPercent, toneFromValue } from "./portafolioUtils.js";

/**
 * Tabla de posiciones del portafolio: activo, cantidad, precio de compra,
 * precio actual (desde la caché del backend), valor actual, ganancia/pérdida
 * y su porcentaje.
 *
 * @param {object} props
 * @param {Array<object>} [props.posiciones]
 * @param {boolean} [props.loading]
 * @param {string} [props.error]
 */
export default function PosicionesTable({ posiciones, loading = false, error = null }) {
  const vacio = !loading && !error && Array.isArray(posiciones) && posiciones.length === 0;
  const conDatos = !loading && !error && Array.isArray(posiciones) && posiciones.length > 0;

  return (
    <section className={styles.card} aria-labelledby="posiciones-titulo">
      <h2 id="posiciones-titulo" className={styles.title}>
        Mis posiciones
      </h2>

      {loading && (
        <p className={styles.state} role="status">
          Cargando posiciones…
        </p>
      )}

      {!loading && error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {vacio && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            📈
          </span>
          <p className={styles.emptyTitle}>Aún no tienes posiciones</p>
          <p className={styles.emptyText}>
            Cuando realices tu primera compra, tus activos aparecerán aquí.
          </p>
        </div>
      )}

      {conDatos && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Activo</th>
                <th scope="col" className={styles.num}>
                  Cantidad
                </th>
                <th scope="col" className={styles.num}>
                  Precio compra
                </th>
                <th scope="col" className={styles.num}>
                  Precio actual
                </th>
                <th scope="col" className={styles.num}>
                  Valor actual
                </th>
                <th scope="col" className={styles.num}>
                  G / P
                </th>
                <th scope="col" className={styles.num}>
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {posiciones.map((p) => {
                const toneGP = toneFromValue(p.gananciaPerdida);
                const tonePct = toneFromValue(p.porcentajeGananciaPerdida);
                return (
                  <tr key={p.activo}>
                    <td>
                      <span className={styles.ticker}>{p.activo}</span>
                    </td>
                    <td className={styles.num}>{p.cantidad}</td>
                    <td className={styles.num}>{formatCurrency(p.precioCompra)}</td>
                    <td className={styles.num}>{formatCurrency(p.precioActual)}</td>
                    <td className={styles.num}>{formatCurrency(p.valorActual)}</td>
                    <td className={`${styles.num} ${styles[toneGP]}`}>
                      {formatCurrency(p.gananciaPerdida)}
                    </td>
                    <td className={`${styles.num} ${styles[tonePct]}`}>
                      {formatPercent(p.porcentajeGananciaPerdida)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
