import styles from "./RadioCard.module.css";

/**
 * Tarjeta seleccionable tipo radio (una sola selección en el grupo).
 * Usada para nivel de experiencia y selección de comisionista.
 *
 * @param {object}   props
 * @param {string}   props.title        Título principal de la opción.
 * @param {string}   [props.description] Texto descriptivo opcional.
 * @param {boolean}  props.selected     Si la opción está seleccionada.
 * @param {function} props.onSelect     Callback al seleccionar.
 * @param {string}   [props.badge]      Etiqueta a la derecha (ej. "Seleccionado").
 * @param {string}   [props.name]       Nombre del grupo de radios.
 * @param {string}   [props.value]      Valor de la opción.
 */
export default function RadioCard({
  title,
  description,
  selected = false,
  onSelect,
  badge,
  name,
  value,
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      name={name}
      value={value}
      className={`${styles.card} ${selected ? styles.selected : ""}`}
      onClick={onSelect}
    >
      <span className={styles.radio} aria-hidden="true">
        <span className={styles.radioDot} />
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      {badge && selected && <span className={styles.badge}>{badge}</span>}
    </button>
  );
}
