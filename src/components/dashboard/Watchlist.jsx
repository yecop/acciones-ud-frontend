import styles from "./Watchlist.module.css";

/**
 * Tabla "Mis acciones de interés" (watchlist).
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.sector]
 * @param {Array<{symbol:string,name:string,price:string,change:string,tone:string}>} props.rows
 * @param {function} [props.onTrade] Recibe el símbolo al pulsar "Operar".
 */
export default function Watchlist({
  title = "Mis acciones de interés",
  sector,
  rows = [],
  onTrade,
}) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {sector && <span className={styles.sector}>Sector: {sector}</span>}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Código</th>
            <th className={styles.hideSmall}>Empresa</th>
            <th className={styles.alignRight}>Precio</th>
            <th>Cambio</th>
            <th className={`${styles.sparkCell} ${styles.hideSmall}`}>Hoy</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const toneClass = row.tone === "negative" ? styles.negative : styles.positive;
            return (
              <tr key={row.symbol}>
                <td className={styles.symbol}>{row.symbol}</td>
                <td className={styles.hideSmall}>{row.name}</td>
                <td className={`${styles.price} ${styles.alignRight}`}>{row.price}</td>
                <td className={`${styles.change} ${toneClass}`}>{row.change}</td>
                <td className={`${styles.sparkCell} ${styles.hideSmall}`}>
                  <div className={styles.spark}>
                    <div
                      className={`${styles.sparkFill} ${toneClass}`}
                      style={{ width: row.tone === "negative" ? "40%" : "72%" }}
                    />
                  </div>
                </td>
                <td className={styles.alignRight}>
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => onTrade?.(row.symbol)}
                  >
                    Operar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
