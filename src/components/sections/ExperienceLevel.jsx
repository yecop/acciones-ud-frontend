import styles from "./sections.module.css";
import RadioCard from "../ui/RadioCard.jsx";

/**
 * Sección "Tu nivel de experiencia".
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {Array<{id:string,title:string,description:string}>} props.options
 * @param {string} props.value             Id de la opción seleccionada.
 * @param {function} props.onChange        Recibe el id seleccionado.
 */
export default function ExperienceLevel({
  title = "Tu nivel de experiencia",
  options = [],
  value,
  onChange,
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.gridTwo} role="radiogroup" aria-label={title}>
        {options.map((option) => (
          <RadioCard
            key={option.id}
            name="experience-level"
            value={option.id}
            title={option.title}
            description={option.description}
            selected={value === option.id}
            onSelect={() => onChange(option.id)}
          />
        ))}
      </div>
    </section>
  );
}
