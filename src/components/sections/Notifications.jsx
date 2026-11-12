import styles from "./sections.module.css";
import CheckboxCard from "../ui/CheckboxCard.jsx";

/**
 * Sección "¿Cómo quieres recibir tus notificaciones?".
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {Array<{id:string,label:string}>} props.channels
 * @param {string[]} props.selected        Ids de canales marcados.
 * @param {function} props.onToggle        Recibe el id del canal.
 */
export default function Notifications({
  title = "¿Cómo quieres recibir tus notificaciones?",
  channels = [],
  selected = [],
  onToggle,
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.chipRow}>
        {channels.map((channel) => (
          <CheckboxCard
            key={channel.id}
            label={channel.label}
            checked={selected.includes(channel.id)}
            onToggle={() => onToggle(channel.id)}
          />
        ))}
      </div>
    </section>
  );
}
