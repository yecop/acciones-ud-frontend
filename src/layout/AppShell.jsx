import { Outlet, useLocation, useNavigate } from "react-router-dom";
import TopNav from "../components/dashboard/TopNav.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { ETIQUETA_ROL, ROLES } from "../auth/roles.js";
import { useResumenPanel } from "../hooks/useResumenPanel.js";
import { menuDelRol, RUTAS, rutaDeNavegacion } from "../routes/routesConfig.js";
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
 * y el contenido de la ruta activa.
 */
export default function AppShell() {
  const { usuario, rol, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const esPanel = pathname.replace(/\/+$/, "") === "/panel";
  const resumen = useResumenPanel({ activo: esPanel && rol === ROLES.INV });

  const items = menuDelRol(rol, pathname);

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
          notifications: resumen.dashboard?.alertas?.length ?? 0,
        }}
        onNavigate={(id) => navigate(rutaDeNavegacion(id))}
        onLogout={salir}
      />
      <main className={esPanel ? undefined : styles.main}>
        <Outlet context={resumen} />
      </main>
    </div>
  );
}
