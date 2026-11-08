import { useState } from "react";
import styles from "./InvestmentProfilePage.module.css";

import Header from "../components/layout/Header.jsx";
import Stepper from "../components/layout/Stepper.jsx";
import Card from "../components/layout/Card.jsx";

import ExperienceLevel from "../components/sections/ExperienceLevel.jsx";
import Interests from "../components/sections/Interests.jsx";
import BrokerSelection from "../components/sections/BrokerSelection.jsx";
import Notifications from "../components/sections/Notifications.jsx";
import PlanSelection from "../components/sections/PlanSelection.jsx";
import CustodyPanel from "../components/sections/CustodyPanel.jsx";

import { investmentProfileData } from "../data/investmentProfileData.js";

/**
 * Página "Perfil de inversión" (paso 2 del onboarding de Acciones UD).
 *
 * Orquesta el estado del formulario y lo distribuye a los componentes de
 * sección mediante props. Los catálogos (`data`) están pensados para llegar
 * desde el API Gateway (REST/JSON); por defecto usa datos de ejemplo con la
 * misma forma que entregaría el backend.
 *
 * @param {object} props
 * @param {object} [props.data]            Catálogos del formulario.
 * @param {function} [props.onSubmit]      Callback con el perfil al enviar.
 * @param {function} [props.onBack]        Callback al volver al paso anterior.
 */
export default function InvestmentProfilePage({
  data = investmentProfileData,
  onSubmit,
  onBack,
}) {
  const { defaults } = data;

  // Estado de los elementos interactivos del mockup.
  const [experienceLevel, setExperienceLevel] = useState(defaults.experienceLevel);
  const [selectedMarkets, setSelectedMarkets] = useState(defaults.markets);
  const [selectedSectors, setSelectedSectors] = useState(defaults.sectors);
  const [broker, setBroker] = useState(defaults.broker);
  const [notifications, setNotifications] = useState(defaults.notifications);
  const [plan, setPlan] = useState(defaults.plan);
  const [submitting, setSubmitting] = useState(false);

  /** Alterna un valor dentro de un arreglo (multi-selección). */
  const toggleInList = (list, id) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  const handleSubmit = async () => {
    const profile = {
      experienceLevel,
      markets: selectedMarkets,
      sectors: selectedSectors,
      broker,
      notifications,
      plan,
    };

    if (!onSubmit) {
      // Sin handler externo, dejamos trazable el payload que iría al API.
      console.info("Perfil de inversión listo para enviar al API:", profile);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(profile);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>Cuéntanos cómo quieres invertir</h1>

        <Stepper steps={data.steps} currentStep={data.currentStep} />

        <div className={styles.layout}>
          {/* Columna principal: perfil */}
          <Card>
            <ExperienceLevel
              options={data.experienceLevels}
              value={experienceLevel}
              onChange={setExperienceLevel}
            />

            <Interests
              markets={data.markets}
              sectors={data.sectors}
              selectedMarkets={selectedMarkets}
              selectedSectors={selectedSectors}
              onToggleMarket={(id) =>
                setSelectedMarkets((prev) => toggleInList(prev, id))
              }
              onToggleSector={(id) =>
                setSelectedSectors((prev) => toggleInList(prev, id))
              }
            />

            <BrokerSelection
              brokers={data.brokers}
              value={broker}
              onChange={setBroker}
            />

            <Notifications
              channels={data.notificationChannels}
              selected={notifications}
              onToggle={(id) =>
                setNotifications((prev) => toggleInList(prev, id))
              }
            />
          </Card>

          {/* Columna lateral: plan y custodia */}
          <aside className={styles.rightColumn}>
            <Card>
              <PlanSelection
                plans={data.plans}
                value={plan}
                onChange={setPlan}
              />
            </Card>

            <Card>
              <CustodyPanel
                onSubmit={handleSubmit}
                onBack={onBack}
                submitting={submitting}
              />
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
