import styles from "./MarketsCard.module.css";

/**
 * Tarjeta de estado de mercados.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {Array<{id:string,name:string,schedule:string,status:"open"|"closed"}>} props.markets
 * @param {string} [props.note]
 */
export default function MarketsCard({ title = "Mercados", markets = [], note }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{title}</h2>

      {markets.map((market) => (
        <div key={market.id} className={styles.row}>
          <div>
            <p className={styles.name}>{market.name}</p>
            <p className={styles.schedule}>{market.schedule}</p>
          </div>
          <span
            className={`${styles.status} ${
              market.status === "open" ? styles.open : styles.closed
            }`}
          >
            {market.status === "open" ? "Abierto" : "Cerrado"}
          </span>
        </div>
      ))}

      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}
