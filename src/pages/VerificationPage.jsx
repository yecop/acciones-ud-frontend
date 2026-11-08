import styles from "./VerificationPage.module.css";
import BrandHero from "../components/verification/BrandHero.jsx";
import VerificationForm from "../components/verification/VerificationForm.jsx";
import ThemeSwitcher from "../theme/ThemeSwitcher.jsx";

/**
 * Pantalla de verificación en dos pasos (OTP) de Acciones UD.
 *
 * Layout de dos columnas: branding a la izquierda y formulario a la derecha.
 * Los textos y catálogos pueden inyectarse por props para consumir datos del
 * API Gateway (REST/JSON).
 *
 * @param {object} props
 * @param {object} [props.hero]     Props para BrandHero.
 * @param {object} [props.form]     Props para VerificationForm.
 * @param {function} [props.onVerify]
 * @param {function} [props.onResend]
 * @param {function} [props.onRegister]
 */
export default function VerificationPage({
  hero = {},
  form = {},
  onVerify,
  onResend,
  onRegister,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.switcher}>
        <ThemeSwitcher />
      </div>
      <BrandHero {...hero} />
      <VerificationForm
        {...form}
        onVerify={onVerify}
        onResend={onResend}
        onRegister={onRegister}
      />
    </div>
  );
}
