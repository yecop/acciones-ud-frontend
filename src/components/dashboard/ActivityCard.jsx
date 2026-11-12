import styles from "./ActivityCard.module.css";

/**
 * Tarjeta "Notificaciones recientes".
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {Array<{id:string,title:string,detail:string,time:string}>} props.items
 */
export default function ActivityCard({ title = "Notificaciones recientes", items = [] }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      {items.map((item) => (
        <article key={item.id} className={styles.item}>
          <span className={styles.dot} aria-hidden="true" />
          <div>
            <p className={styles.itemTitle}>{item.title}</p>
            <p className={styles.itemDetail}>{item.detail}</p>
            <p className={styles.itemTime}>{item.time}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
