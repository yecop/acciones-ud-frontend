import styles from "./Chip.module.css";

/**
 * Chip de selección (pill) para mercados y sectores.
 * Actúa como toggle multi-selección.
 *
 * @param {object}   props
 * @param {string}   props.label   Texto del chip.
 * @param {boolean}  props.active  Si está seleccionado.
 * @param {function} props.onToggle Callback al pulsar.
 */
export default function Chip({ label, active = false, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`${styles.chip} ${active ? styles.active : ""}`}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}
