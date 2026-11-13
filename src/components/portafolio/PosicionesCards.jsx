import styles from "./PosicionesTable.module.css";
import { formatCurrency, formatPercent, toneFromValue } from "./portafolioUtils.js";

export default function PosicionesCards({ posiciones }) {
  return (
    <section aria-labelledby="posiciones-titulo" className={styles.card}>
      <h2 id="posiciones-titulo" className={styles.title}>
        Mis posiciones
      </h2>
      <div className={styles.cards}>
        {posiciones.map((p) => (
          <article key={p.activo} className={styles.position} aria-label={`Posición ${p.activo}`}>
            <h3 className={styles.ticker}>{p.activo}</h3>
            <dl className={styles.details}>
              <div>
                <dt>Cantidad</dt>
                <dd>{p.cantidad}</dd>
              </div>
              <div>
                <dt>Precio compra</dt>
                <dd>{formatCurrency(p.precioCompra)}</dd>
              </div>
              <div>
                <dt>Precio actual</dt>
                <dd>{formatCurrency(p.precioActual)}</dd>
              </div>
              <div>
                <dt>Valor actual</dt>
                <dd>{formatCurrency(p.valorActual)}</dd>
              </div>
              <div>
                <dt>Ganancia / Pérdida</dt>
                <dd className={styles[toneFromValue(p.gananciaPerdida)]}>
                  {formatCurrency(p.gananciaPerdida)}
                </dd>
              </div>
              <div>
                <dt>Rendimiento</dt>
                <dd className={styles[toneFromValue(p.porcentajeGananciaPerdida)]}>
                  {formatPercent(p.porcentajeGananciaPerdida)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
