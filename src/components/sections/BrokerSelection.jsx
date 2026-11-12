import styles from "./sections.module.css";
import RadioCard from "../ui/RadioCard.jsx";

/**
 * Sección "¿Quieres un comisionista?".
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {Array<{id:string,title:string,description:string}>} props.brokers
 * @param {string} props.value       Id del comisionista seleccionado.
 * @param {function} props.onChange  Recibe el id seleccionado.
 * @param {string} [props.footnote]  Nota legal sobre comisiones.
 */
export default function BrokerSelection({
  title = "¿Quieres un comisionista?",
  description = "Un comisionista certificado revisa tu perfil, propone estrategias y puede operar a tu nombre con tu aprobación. Solo verá tu portafolio y tus órdenes.",
  brokers = [],
  value,
  onChange,
  footnote = "Con comisionista, la comisión de cada operación se reparte 60 % para Acciones UD y 40 % para el comisionista. Siempre verás el desglose antes de confirmar.",
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <p className={styles.helpText}>{description}</p>

      <div className={styles.stack} role="radiogroup" aria-label={title}>
        {brokers.map((broker) => (
          <RadioCard
            key={broker.id}
            name="broker"
            value={broker.id}
            title={broker.title}
            description={broker.description}
            selected={value === broker.id}
            onSelect={() => onChange(broker.id)}
            badge="Seleccionado"
          />
        ))}
      </div>

      {footnote && <p className={styles.note}>{footnote}</p>}
    </section>
  );
}
