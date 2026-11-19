import styles from "./TopNav.module.css";
import { BellIcon } from "../ui/Icons.jsx";
import Logo from "../marca/Logo.jsx";
import ThemeSwitcher from "../../theme/ThemeSwitcher.jsx";

/**
 * Barra de navegación superior del panel.
 *
 * @param {object} props
 * @param {Array<{id:string,label:string,active?:boolean}>} props.items
 * @param {object} props.user   { name, initials, role, notifications }
 * @param {function} [props.onNavigate] Recibe el id del item.
 * @param {function} [props.onLogout]   Si se pasa, muestra el botón "Salir".
 */
export default function TopNav({ items = [], user = {}, onNavigate, onLogout }) {
  return (
    <nav className={styles.nav} aria-label="Navegación principal">
      <div className={styles.brand}>
        <Logo alto={40} />
      </div>

      <ul className={styles.links}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`${styles.link} ${item.active ? styles.linkActive : ""}`}
              aria-current={item.active ? "page" : undefined}
              onClick={() => onNavigate?.(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.right}>
        <ThemeSwitcher />
        <button type="button" className={styles.bell} aria-label="Notificaciones">
          <BellIcon />
          {user.notifications > 0 && <span className={styles.badge}>{user.notifications}</span>}
        </button>
        <div className={styles.user}>
          <span className={styles.avatar}>{user.initials}</span>
          <div className={styles.userText}>
            <p className={styles.userName}>{user.name}</p>
            <p className={styles.userRole}>{user.role}</p>
          </div>
        </div>
        {onLogout && (
          <button type="button" className={styles.logout} onClick={onLogout}>
            Salir
          </button>
        )}
      </div>

      {/* Móvil: los enlaces del encabezado se ocultan y la navegación pasa a la barra inferior. */}
      <ul className={styles.tabBar} aria-label="Secciones">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`${styles.tab} ${item.active ? styles.tabActive : ""}`}
              aria-current={item.active ? "page" : undefined}
              onClick={() => onNavigate?.(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
