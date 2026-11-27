import styles from "./DashboardPage.module.css";

import KpiCards from "../components/dashboard/KpiCards.jsx";
import PriceChartCard from "../components/dashboard/PriceChartCard.jsx";
import PanelMercados from "../components/mercados/PanelMercados.jsx";
import ActivityCard from "../components/dashboard/ActivityCard.jsx";
import NuevaOrden from "../components/order/NuevaOrden.jsx";
import { PlusIcon } from "../components/ui/Icons.jsx";

import { dashboardData } from "../data/dashboardData.js";

/**
 * Panel principal (dashboard) de Acciones UD.
 *
 * Orquesta las secciones del tablero y distribuye los datos por props.
 * El objeto `data` está pensado para llegar del API Gateway (REST/JSON).
 *
 * @param {object} props
 * @param {object} [props.data]        Datos del panel.
 * @param {{cargando:boolean,error:Error|null,onReintentar:function}} [props.carga] Estado de carga.
 * @param {function} [props.onNewOrder]
 * @param {function} [props.onTrade]   Recibe el símbolo.
 * @param {function} [props.onOrdenCreada] Se llama con la orden creada (para refrescar el panel).
 */
export default function DashboardPage({
  data = dashboardData,
  carga,
  onNewOrder,
  onTrade,
  onOrdenCreada,
}) {
  return (
    <div className={styles.main}>
      <div className={styles.greetingRow}>
        <div>
          <h1 className={styles.greetingTitle}>{data.greeting.title}</h1>
          <p className={styles.greetingSubtitle}>{data.greeting.subtitle}</p>
        </div>
        <button type="button" className={styles.newOrder} onClick={onNewOrder}>
          <PlusIcon /> Nueva orden
        </button>
      </div>

      {carga?.error && (
        <div className={styles.error} role="alert">
          <p>No pudimos cargar tu resumen. {carga.error.message}</p>
          <button type="button" onClick={carga.onReintentar}>
            Reintentar
          </button>
        </div>
      )}

      <KpiCards items={data.kpis} />

      <div className={styles.columns}>
        <div className={styles.colLeft}>
          <PriceChartCard asset={data.featured} />
        </div>

        <div className={styles.colRight}>
          <NuevaOrden
            asset={data.trading.asset}
            saldoDisponible={data.trading.saldoDisponible}
            isMarketOpen={data.trading.isMarketOpen}
            onCreada={onOrdenCreada}
          />
          <ActivityCard items={data.activity} />
        </div>
      </div>

      <PanelMercados onTrade={onTrade} />

      <p className={styles.footerNote}>
        Fondos, portafolio, alertas, la acción destacada y los mercados vienen del API. El trazo del
        gráfico, sus estadísticas y la actividad son datos de ejemplo.
      </p>
    </div>
  );
}
