import { useCallback, useEffect, useState } from "react";
import styles from "./PortafolioView.module.css";

import SaldoWidget from "../components/portafolio/SaldoWidget.jsx";
import PortafolioResumen from "../components/portafolio/PortafolioResumen.jsx";
import PosicionesTable from "../components/portafolio/PosicionesTable.jsx";

import { listarPosiciones, obtenerResumenPortafolio, obtenerSaldo } from "../api/portafolioApi.js";

/**
 * Vista de "Mi dinero y mis posiciones" (SCRUM-25).
 *
 * Carga en paralelo el saldo, el resumen del portafolio y las posiciones desde
 * el backend, manejando estados de carga, error y portafolio vacío.
 *

 * Se muestra dentro del marco común (`AppShell`), que aporta la navegación.
 */
export default function PortafolioView() {
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
        obtenerSaldo(),
        obtenerResumenPortafolio(),
        listarPosiciones(),
      ]);
      setSaldo(saldoData);
      setResumen(resumenData);
      setPosiciones(posicionesData);
    } catch (e) {
      // ApiError ya trae un mensaje en español según el código del contrato.
      setError(e?.message || "No se pudieron cargar tus datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div className={styles.headingRow}>
          <div>
            <h1 className={styles.heading}>Mi dinero y mis posiciones</h1>
            <p className={styles.subheading}>
              Consulta tu saldo, el valor de tu portafolio y el detalle de cada activo.
            </p>
          </div>
          <button type="button" className={styles.refresh} onClick={cargarDatos} disabled={loading}>
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
      </div>
    </div>
  );
}
