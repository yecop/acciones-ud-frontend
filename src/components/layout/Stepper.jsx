import styles from "./Stepper.module.css";

/**
 * Indicador de pasos del onboarding.
 *
 * @param {object} props
 * @param {Array<{id:number,label:string}>} props.steps    Lista de pasos.
 * @param {number} props.currentStep                        Id del paso activo.
 */
export default function Stepper({ steps = [], currentStep = 1 }) {
  return (
    <nav className={styles.stepper} aria-label="Progreso del registro">
      <ol className={styles.list}>
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          return (
            <li key={step.id} className={styles.item}>
              <span
                className={`${styles.bullet} ${isActive ? styles.bulletActive : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                {step.id}
              </span>
              <span className={styles.label}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
