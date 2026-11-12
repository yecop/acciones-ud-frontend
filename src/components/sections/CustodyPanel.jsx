import styles from "./CustodyPanel.module.css";
import { ShieldIcon } from "../ui/Icons.jsx";

/**
 * Panel "Tus fondos, en custodia de Alpaca" con acciones principales.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {string} [props.primaryLabel]
 * @param {string} [props.backLabel]
 * @param {function} props.onSubmit   Acción al crear cuenta y continuar.
 * @param {function} props.onBack     Acción al volver.
 * @param {boolean}  [props.submitting] Deshabilita el botón primario.
 */
export default function CustodyPanel({
  title = "Tus fondos, en custodia de Alpaca",
  description = "Al continuar crearemos tu cuenta en Alpaca, nuestro aliado de custodia y ejecución de órdenes. Te pediremos la verificación de identidad que exige el proceso.",
  primaryLabel = "Crear cuenta y continuar",
  backLabel = "Volver",
  onSubmit,
  onBack,
  submitting = false,
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <ShieldIcon />
        <h2 className={styles.title}>{title}</h2>
      </div>
      <p className={styles.description}>{description}</p>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? "Procesando…" : primaryLabel}
      </button>
      <button type="button" className={styles.backButton} onClick={onBack}>
        {backLabel}
      </button>
    </div>
  );
}
