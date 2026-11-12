import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { RUTAS } from "./routesConfig.js";

/**
 * Guarda de rutas por sesión y rol.
 *  - Sin sesión: va al ingreso y recuerda a dónde quería ir (`state.desde`).
 *  - Con sesión pero rol no permitido: va a "sin acceso".
 *
 * @param {object} props
 * @param {string[]} [props.roles] Roles permitidos; si se omite, basta con estar autenticado.
 */
export default function ProtectedRoute({ roles }) {
  const { autenticado, rol } = useAuth();
  const ubicacion = useLocation();

  if (!autenticado) {
    return <Navigate to={RUTAS.ingreso} replace state={{ desde: ubicacion.pathname }} />;
  }
  if (roles && !roles.includes(rol)) {
    return <Navigate to={RUTAS.sinAcceso} replace />;
  }
  return <Outlet />;
}
