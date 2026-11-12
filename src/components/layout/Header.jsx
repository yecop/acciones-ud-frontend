import styles from "./Header.module.css";
import { LogoIcon } from "../ui/Icons.jsx";
import ThemeSwitcher from "../../theme/ThemeSwitcher.jsx";

/**
 * Cabecera global con marca y acceso a cuenta.
 *
 * @param {object} props
 * @param {string} [props.brandName]   Nombre de la marca.
 * @param {string} [props.accountText] Texto previo al enlace de ingreso.
 * @param {string} [props.loginLabel]  Texto del enlace de ingreso.
 * @param {string} [props.loginHref]   Destino del enlace de ingreso.
 */
export default function Header({
  brandName = "Acciones UD",
  accountText = "¿Ya tienes cuenta?",
  loginLabel = "Ingresar",
  loginHref = "#",
}) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <LogoIcon />
        <span className={styles.brandName}>{brandName}</span>
      </div>
      <div className={styles.actions}>
        <ThemeSwitcher />
        <p className={styles.account}>
          {accountText}{" "}
          <a href={loginHref} className={styles.loginLink}>
            {loginLabel}
          </a>
        </p>
      </div>
    </header>
  );
}
