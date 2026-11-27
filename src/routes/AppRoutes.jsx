import { useMemo } from "react";
import { Navigate, Route, Routes, useNavigate, useOutletContext } from "react-router-dom";
import AppShell from "../layout/AppShell.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import RegistrationPage from "../pages/RegistrationPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import StatusPage from "../pages/StatusPage.jsx";
import MfaPage from "../pages/MfaPage.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import PortafolioView from "../pages/PortafolioView.jsx";
import AccionesPage from "../pages/AccionesPage.jsx";
import OrdenDetallePage from "../pages/OrdenDetallePage.jsx";
import OrdenesPage from "../pages/OrdenesPage.jsx";
import HistorialOrdenesPage from "../pages/HistorialOrdenesPage.jsx";
import PremiumPage from "../pages/PremiumPage.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { ETIQUETA_ROL, ROLES } from "../auth/roles.js";
import { dashboardData } from "../data/dashboardData.js";
import { construirDatosPanel } from "../pages/panelDatos.js";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { RUTA_INICIAL_POR_ROL, RUTAS, RUTAS_PROTEGIDAS } from "./routesConfig.js";

/** "/" lleva a la pantalla inicial del rol, o al ingreso si no hay sesión. */
function Inicio() {
  const { autenticado, rol } = useAuth();
  const destino = autenticado ? (RUTA_INICIAL_POR_ROL[rol] ?? RUTAS.sinAcceso) : RUTAS.ingreso;
  return <Navigate to={destino} replace />;
}

/** "Jueves 12 de noviembre", en el idioma y la zona horaria de la persona. */
function fechaDeHoy() {
  const texto = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Panel del inversionista: saldo, portafolio y destacada vienen de la API; el gráfico es de ejemplo. */
function RutaPanel() {
  const { usuario, rol } = useAuth();
  const navigate = useNavigate();
  const resumen = useOutletContext();

  const datos = useMemo(
    () =>
      construirDatosPanel({
        base: dashboardData,
        persona: { nombre: usuario?.nombre ?? "", rol: ETIQUETA_ROL[rol] },
        saldo: resumen.saldo,
        dashboard: resumen.dashboard,
        estadoMercado: resumen.estadoMercado,
        fecha: fechaDeHoy(),
      }),
    [usuario, rol, resumen.saldo, resumen.dashboard, resumen.estadoMercado]
  );

  return (
    <DashboardPage
      data={datos}
      carga={{ cargando: resumen.cargando, error: resumen.error, onReintentar: resumen.refrescar }}
      onNewOrder={() => navigate("/operar")}
      onTrade={(ticker) =>
        navigate(ticker ? `/operar?ticker=${encodeURIComponent(ticker)}` : "/operar")
      }
      onOrdenCreada={resumen.refrescar}
    />
  );
}

/** Pantallas ya construidas dentro del marco común, por id de ruta. */
const PANTALLAS = {
  panel: <RutaPanel />,
  perfil: <ProfilePage />,
  portafolio: <PortafolioView />,
  acciones: <AccionesPage />,
  operar: <OrdenesPage />,
  historial: <HistorialOrdenesPage />,
  premium: <PremiumPage />,
};

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

      {/* Rutas protegidas dentro de la misma cabecera */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          {RUTAS_PROTEGIDAS.map((ruta) => (
            <Route key={ruta.id} element={<ProtectedRoute roles={ruta.roles} />}>
              <Route
                path={ruta.path}
                element={PANTALLAS[ruta.id] ?? <PaginaPendiente ruta={ruta} />}
              />
            </Route>
          ))}
          <Route element={<ProtectedRoute roles={[ROLES.INV]} />}>
            <Route path="/historial/:id" element={<OrdenDetallePage />} />
          </Route>
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
