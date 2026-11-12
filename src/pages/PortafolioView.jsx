import { useCallback, useEffect, useState } from "react";
import styles from "./PortafolioView.module.css";

import TopNav from "../components/dashboard/TopNav.jsx";
import SaldoWidget from "../components/portafolio/SaldoWidget.jsx";
import PortafolioResumen from "../components/portafolio/PortafolioResumen.jsx";
import PosicionesTable from "../components/portafolio/PosicionesTable.jsx";

import { fetchSaldo, fetchResumenPortafolio, fetchPosiciones } from "../services/portafolioApi.js";
import { dashboardData } from "../data/dashboardData.js";

/**
 * Vista de "Mi dinero y mis posiciones" (SCRUM-25).
 *
 * Carga en paralelo el saldo, el resumen del portafolio y las posiciones desde
 * el backend, manejando estados de carga, error y portafolio vacío.
 *
 * @param {object} props
 * @param {function} [props.onNavigate] Navegación del TopNav.
 */
export default function PortafolioView({ onNavigate }) {
  const [saldo, setSaldo] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [posiciones, setPosiciones] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [saldoData, resumenData, posicionesData] = await Promise.all([
        fetchSaldo(),
        fetchResumenPortafolio(),
        fetchPosiciones(),
      ]);
      setSaldo(saldoData);
      setResumen(resumenData);
      setPosiciones(posicionesData);
    } catch {
      setError(
        "No se pudieron cargar tus datos. Verifica que el backend esté disponible."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Marca "Portafolio y órdenes" como activo en la navegación.
  const nav = dashboardData.nav.map((item) => ({
    ...item,
    active: item.id === "portafolio",
  }));

  return (
    <div className={styles.page}>
      <TopNav items={nav} user={dashboardData.user} onNavigate={onNavigate} />

      <main className={styles.main}>
        <div className={styles.headingRow}>
          <div>
            <h1 className={styles.heading}>Mi dinero y mis posiciones</h1>
            <p className={styles.subheading}>
              Consulta tu saldo, el valor de tu portafolio y el detalle de cada activo.
            </p>
          </div>
          <button
            type="button"
            className={styles.refresh}
            onClick={cargarDatos}
            disabled={loading}
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {error && (
          <div className={styles.banner} role="alert">
            <span>{error}</span>
            <button type="button" className={styles.retry} onClick={cargarDatos}>
              Reintentar
            </button>
          </div>
        )}

        <div className={styles.columns}>
          <SaldoWidget saldo={saldo} loading={loading} error={error} />
          <PortafolioResumen resumen={resumen} loading={loading} error={error} />
        </div>

        <PosicionesTable posiciones={posiciones} loading={loading} error={error} />
      </main>
    </div>
  );
}
