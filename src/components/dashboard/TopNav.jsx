import { useId, useRef, useState } from "react";
import styles from "./TopNav.module.css";
import { BellIcon } from "../ui/Icons.jsx";
import Logo from "../marca/Logo.jsx";

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
  const [abierto, setAbierto] = useState(false);
  const menuId = useId();
  const control = useRef(null);

  function cerrarMenu() {
    setAbierto(false);
    control.current?.focus();
  }

  return (
    <nav
      className={styles.nav}
      aria-label="Navegación principal"
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && abierto) cerrarMenu();
      }}
    >
      <div className={styles.brand}>
        <Logo alto={40} />
      </div>

      <button
        ref={control}
        type="button"
        className={styles.menuToggle}
        aria-label="Menú de navegación"
        aria-controls={menuId}
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d={abierto ? "m6 6 12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      <ul id={menuId} className={`${styles.links} ${abierto ? styles.linksOpen : ""}`}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`${styles.link} ${item.active ? styles.linkActive : ""}`}
              aria-current={item.active ? "page" : undefined}
              onClick={() => {
                if (abierto) cerrarMenu();
                onNavigate?.(item.id);
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.right}>
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
    </nav>
  );
}
