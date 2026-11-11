import BrandHero from "../verification/BrandHero.jsx";
import ThemeSwitcher from "../../theme/ThemeSwitcher.jsx";
import styles from "./AuthLayout.module.css";

/**
 * Marco de las pantallas de acceso (ingreso y verificación): marca a la izquierda y el
 * formulario a la derecha. En móvil se apilan y la marca se reduce a su cabecera.
 *
 * @param {object} props
 * @param {object} [props.hero]  Props para BrandHero.
 * @param {React.ReactNode} props.children  Formulario (columna derecha).
 */
export default function AuthLayout({ hero = {}, children }) {
  return (
    <div className={styles.page}>
      <div className={styles.switcher}>
        <ThemeSwitcher />
      </div>
      <div className={styles.hero}>
        <BrandHero {...hero} />
      </div>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
