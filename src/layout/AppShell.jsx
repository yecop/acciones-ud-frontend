import { Outlet, useLocation, useNavigate } from "react-router-dom";
import TopNav from "../components/dashboard/TopNav.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { ETIQUETA_ROL } from "../auth/roles.js";
import { RUTAS, rutaDeNavegacion, rutasDelRol } from "../routes/routesConfig.js";
import styles from "./AppShell.module.css";

function iniciales(nombre = "") {
  return (
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}

/**
 * Marco común de las pantallas autenticadas: barra superior con el menú del rol
 * (escritorio) o barra inferior (móvil) y el contenido de la ruta activa.
 */
export default function AppShell() {
  const { usuario, rol, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = rutasDelRol(rol).map((r) => ({
    id: r.id,
    label: r.titulo,
    active: pathname === r.path,
  }));

  const salir = async () => {
    await cerrarSesion();
    navigate(RUTAS.ingreso, { replace: true });
  };

  return (
    <div className={styles.shell}>
      <TopNav
        items={items}
        user={{
          name: usuario?.nombre,
          initials: iniciales(usuario?.nombre),
          role: ETIQUETA_ROL[rol],
          notifications: 0,
        }}
        onNavigate={(id) => navigate(rutaDeNavegacion(id))}
        onLogout={salir}
      />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
