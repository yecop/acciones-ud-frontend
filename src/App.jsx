import { useEffect, useState } from "react";
import DashboardPage from "./pages/DashboardPage.jsx";
import InvestmentProfilePage from "./pages/InvestmentProfilePage.jsx";
import VerificationPage from "./pages/VerificationPage.jsx";
import PortafolioView from "./pages/PortafolioView.jsx";

/**
 * Raíz de la aplicación Acciones UD.
 *
 * Enrutamiento ligero basado en hash (sin dependencias extra) para navegar
 * entre las pantallas del flujo:
 *   #/panel         → Panel principal (dashboard)
 *   #/portafolio    → Mi dinero y mis posiciones (SCRUM-25)
 *   #/perfil        → Perfil de inversión (onboarding paso 2)
 *   #/verificacion  → Verificación en dos pasos (OTP)
 *
 * Los callbacks (`onSubmit`, `onVerify`, etc.) son los puntos de integración
 * con el API Gateway (REST/JSON).
 */
const ROUTES = {
  "#/panel": "dashboard",
  "#/portafolio": "portafolio",
  "#/perfil": "profile",
  "#/verificacion": "verification",
};

/** Mapea el id de un item de navegación al hash de su ruta. */
const NAV_HASH = {
  panel: "#/panel",
  portafolio: "#/portafolio",
  perfil: "#/perfil",
};

function getRoute() {
  return ROUTES[window.location.hash] ?? "dashboard";
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (hash) => {
    window.location.hash = hash;
  };

  // Navegación desde el TopNav: recibe el id del item y lo lleva a su hash.
  const navigateById = (id) => {
    const hash = NAV_HASH[id];
    if (hash) navigate(hash);
    else console.info("Navegar a:", id);
  };

  // Ejemplo de integración REST con el API Gateway.
  const submitProfile = async (profile) => {
    // await fetch("/api/onboarding/investment-profile", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(profile),
    // });
    console.info("Enviando perfil al API Gateway:", profile);
    navigate("#/verificacion");
  };

  const verifyCode = async ({ code, channel }) => {
    // await fetch("/api/auth/verify", { method: "POST", ... });
    console.info("Verificando código:", { code, channel });
    navigate("#/panel");
  };

  const submitOrder = async (order) => {
    // await fetch("/api/orders", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(order),
    // });
    console.info("Enviando orden al API Gateway:", order);
  };

  switch (route) {
    case "portafolio":
      return <PortafolioView onNavigate={navigateById} />;
    case "profile":
      return (
        <InvestmentProfilePage
          onSubmit={submitProfile}
          onBack={() => navigate("#/panel")}
        />
      );
    case "verification":
      return (
        <VerificationPage
          onVerify={verifyCode}
          onResend={() => console.info("Reenviar código")}
          onRegister={() => console.info("Ir a registro")}
        />
      );
    case "dashboard":
    default:
      return (
        <DashboardPage
          onNewOrder={() => navigate("#/perfil")}
          onTrade={(symbol) => console.info("Operar:", symbol)}
          onNavigate={navigateById}
          onSubmitOrder={submitOrder}
        />
      );
  }
}
