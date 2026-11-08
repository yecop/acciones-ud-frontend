import styles from "./sections.module.css";
import RadioCard from "../ui/RadioCard.jsx";

/**
 * Panel "Elige tu plan".
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {Array<{id:string,title:string,description:string}>} props.plans
 * @param {string} props.value       Id del plan seleccionado.
 * @param {function} props.onChange  Recibe el id seleccionado.
 */
export default function PlanSelection({
  title = "Elige tu plan",
  plans = [],
  value,
  onChange,
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.stack} role="radiogroup" aria-label={title}>
        {plans.map((plan) => (
          <RadioCard
            key={plan.id}
            name="plan"
            value={plan.id}
            title={plan.title}
            description={plan.description}
            selected={value === plan.id}
            onSelect={() => onChange(plan.id)}
          />
        ))}
      </div>
    </section>
  );
}
