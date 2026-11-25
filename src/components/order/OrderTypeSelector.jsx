import styles from "./OrderTypeSelector.module.css";
import { ORDER_TYPES } from "./orderUtils.js";

/**
 * Selector de tipo de orden (tabs).
 * Market Order · Limit Order · Stop Loss · Take Profit.
 *
 * @param {object} props
 * @param {Array<{id:string,label:string}>} [props.types]
 * @param {string} props.value       Id del tipo seleccionado.
 * @param {function} props.onChange  Recibe el id del tipo.
 * @param {string} [props.label]
 * @param {boolean} [props.disabled]
 */
export default function OrderTypeSelector({
  types = ORDER_TYPES,
  value,
  onChange,
  label = "Tipo de orden",
  disabled = false,
}) {
  return (
    <div className={styles.field}>
      <p className={styles.label}>{label}</p>
      <div className={styles.tabs} role="tablist" aria-label={label}>
        {types.map((type) => {
          const active = value === type.id;
          return (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => onChange(type.id)}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
