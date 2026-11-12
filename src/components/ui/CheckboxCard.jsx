import styles from "./CheckboxCard.module.css";
import { CheckIcon } from "./Icons.jsx";

/**
 * Casilla de verificación con estilo de tarjeta.
 * Usada para los canales de notificación (Correo, SMS, WhatsApp).
 *
 * @param {object}   props
 * @param {string}   props.label    Texto de la casilla.
 * @param {boolean}  props.checked  Si está marcada.
 * @param {function} props.onToggle Callback al alternar.
 */
export default function CheckboxCard({ label, checked = false, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`${styles.card} ${checked ? styles.checked : ""}`}
      onClick={onToggle}
    >
      <span className={styles.box} aria-hidden="true">
        <CheckIcon />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
