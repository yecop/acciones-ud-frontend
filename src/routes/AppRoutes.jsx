import { useMemo } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AppShell from "../layout/AppShell.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import RegistrationPage from "../pages/RegistrationPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import StatusPage from "../pages/StatusPage.jsx";
import MfaPage from "../pages/MfaPage.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import PortafolioView from "../pages/PortafolioView.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { ETIQUETA_ROL, ROLES } from "../auth/roles.js";
import { dashboardData } from "../data/dashboardData.js";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { RUTA_INICIAL_POR_ROL, RUTAS, RUTAS_PROTEGIDAS, rutaDeNavegacion } from "./routesConfig.js";

/** "/" lleva a la pantalla inicial del rol, o al ingreso si no hay sesión. */
function Inicio() {
  const { autenticado, rol } = useAuth();
  const destino = autenticado ? (RUTA_INICIAL_POR_ROL[rol] ?? RUTAS.sinAcceso) : RUTAS.ingreso;
  return <Navigate to={destino} replace />;
}

/** Panel del inversionista. SCRUM-30 reemplaza los datos de ejemplo por el API. */
function RutaPanel() {
  const { usuario, rol, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const datos = useMemo(() => {
    const nombre = usuario?.nombre ?? "";
    return {
      ...dashboardData,
      user: {
        ...dashboardData.user,
        name: nombre,
        initials: nombre.slice(0, 2).toUpperCase(),
        role: ETIQUETA_ROL[rol],
      },
      greeting: { ...dashboardData.greeting, title: `Hola, ${nombre}` },
    };
  }, [usuario, rol]);

  return (
    <DashboardPage
      data={datos}
      onNewOrder={() => navigate("/operar")}
      onTrade={() => navigate("/operar")}
      onNavigate={(id) => navigate(rutaDeNavegacion(id))}
      onSubmitOrder={(orden) => console.info("Orden (pendiente de integración):", orden)}
      onLogout={async () => {
        await cerrarSesion();
        navigate(RUTAS.ingreso, { replace: true });
      }}
    />
  );
}

function PaginaPendiente({ ruta }) {
  return (
    <StatusPage
      etiqueta="En construcción"
      titulo={ruta.titulo}
      mensaje={`Esta pantalla todavía no está construida (${ruta.pendiente}). La ruta y la protección por rol ya funcionan.`}
    />
  );
}

/** Todas las rutas de la aplicación. Se monta dentro de un Router y de <AuthProvider>. */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />

      {/* Públicas */}
      <Route path={RUTAS.ingreso} element={<LoginPage />} />
      <Route path={RUTAS.verificacion} element={<MfaPage />} />
      <Route path={RUTAS.registro} element={<RegistrationPage />} />
      <Route
        path={RUTAS.sinAcceso}
        element={
          <StatusPage
            etiqueta="403"
            titulo="No tienes acceso a esta sección"
            mensaje="Tu rol no permite ver esta pantalla. Si crees que es un error, contacta a soporte."
            accion={{ to: "/", label: "Volver al inicio" }}
          />
        }
      />

      {/* Panel (diseño propio con barra superior) */}
      <Route element={<ProtectedRoute roles={[ROLES.INV]} />}>
        <Route path="/panel" element={<RutaPanel />} />
      </Route>

      {/* Resto de rutas protegidas, dentro del marco común */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          {RUTAS_PROTEGIDAS.filter((r) => r.id !== "panel").map((ruta) => (
            <Route key={ruta.id} element={<ProtectedRoute roles={ruta.roles} />}>
              <Route
                path={ruta.path}
                element={
                  ruta.id === "perfil" ? (
                    <ProfilePage />
                  ) : ruta.id === "portafolio" ? (
                    <PortafolioView />
                  ) : (
                    <PaginaPendiente ruta={ruta} />
                  )
                }
              />
            </Route>
          ))}
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <StatusPage
            etiqueta="404"
            titulo="Página no encontrada"
            mensaje="La dirección no existe o fue movida."
            accion={{ to: "/", label: "Volver al inicio" }}
          />
        }
      />
    </Routes>
  );
}
