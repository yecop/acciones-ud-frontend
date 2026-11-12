import { HashRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";

/**
 * Raíz de la aplicación Acciones UD.
 *
 * Usa HashRouter (`#/panel`) para poder desplegar en hosting estático sin reglas de
 * reescritura. Las rutas y los roles que pueden verlas están en `routes/routesConfig.js`.
 */
export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
