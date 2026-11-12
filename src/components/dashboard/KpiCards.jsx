import styles from "./KpiCards.module.css";

/**
 * Rejilla de tarjetas de métricas (KPIs) del panel.
 *
 * @param {object} props
 * @param {Array<{id:string,label:string,value:string,hint:string,tone?:string,hintLink?:boolean}>} props.items
 * @param {function} [props.onHintClick] Recibe el id de la tarjeta.
 */
export default function KpiCards({ items = [], onHintClick }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <article key={item.id} className={styles.card}>
          <p className={styles.label}>{item.label}</p>
          <p className={`${styles.value} ${item.tone === "positive" ? styles.positive : ""}`}>
            {item.value}
          </p>
          {item.hintLink ? (
            <button
              type="button"
              className={styles.hintLink}
              onClick={() => onHintClick?.(item.id)}
            >
              {item.hint}
            </button>
          ) : (
            <p className={`${styles.hint} ${item.tone === "positive" ? styles.positive : ""}`}>
              {item.hint}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
