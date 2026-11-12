import AuthLayout from "../components/layout/AuthLayout.jsx";
import VerificationForm from "../components/verification/VerificationForm.jsx";

/**
 * Pantalla de verificación en dos pasos (OTP) de Acciones UD, sin lógica de negocio:
 * marca a la izquierda y formulario a la derecha. La lógica (reto, errores, reenvío) vive
 * en `MfaPage`; aquí solo se compone el marco con el formulario.
 *
 * @param {object} props
 * @param {object} [props.hero]  Props para BrandHero.
 * @param {object} [props.form]  Props para VerificationForm.
 */
export default function VerificationPage({ hero = {}, form = {} }) {
  return (
    <AuthLayout hero={hero}>
      <VerificationForm {...form} />
    </AuthLayout>
  );
}
