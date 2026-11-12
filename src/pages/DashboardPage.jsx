import styles from "./DashboardPage.module.css";

import TopNav from "../components/dashboard/TopNav.jsx";
import KpiCards from "../components/dashboard/KpiCards.jsx";
import PriceChartCard from "../components/dashboard/PriceChartCard.jsx";
import PanelMercados from "../components/mercados/PanelMercados.jsx";
import ActivityCard from "../components/dashboard/ActivityCard.jsx";
import OrderForm from "../components/order/OrderForm.jsx";
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
 * @param {function} [props.onNewOrder]
 * @param {function} [props.onTrade]   Recibe el símbolo.
 * @param {function} [props.onNavigate]
 * @param {function} [props.onSubmitOrder] Recibe el payload de la orden creada.
 * @param {function} [props.onLogout]
 */
export default function DashboardPage({
  data = dashboardData,
  onNewOrder,
  onTrade,
  onNavigate,
  onSubmitOrder,
  onLogout,
}) {
  return (
    <div className={styles.page}>
      <TopNav items={data.nav} user={data.user} onNavigate={onNavigate} onLogout={onLogout} />

      <main className={styles.main}>
        <div className={styles.greetingRow}>
          <div>
            <h1 className={styles.greetingTitle}>{data.greeting.title}</h1>
            <p className={styles.greetingSubtitle}>{data.greeting.subtitle}</p>
          </div>
          <button type="button" className={styles.newOrder} onClick={onNewOrder}>
            <PlusIcon /> Nueva orden
          </button>
        </div>

        <KpiCards items={data.kpis} />

        <div className={styles.columns}>
          <div className={styles.colLeft}>
            <PriceChartCard asset={data.featured} />
          </div>

          <div className={styles.colRight}>
            <OrderForm
              asset={data.trading.asset}
              saldoDisponible={data.trading.saldoDisponible}
              isMarketOpen={data.trading.isMarketOpen}
              onSubmit={onSubmitOrder}
            />
            <ActivityCard items={data.activity} />
          </div>
        </div>

        <PanelMercados onTrade={onTrade} />

        <p className={styles.footerNote}>
          Mercados y acciones vienen del API. Los indicadores, el gráfico y la actividad son datos
          de ejemplo.
        </p>
      </main>
    </div>
  );
}
