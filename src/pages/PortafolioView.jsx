import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./PortafolioView.module.css";
import SaldoWidget from "../components/portafolio/SaldoWidget.jsx";
import PortafolioResumen from "../components/portafolio/PortafolioResumen.jsx";
import PosicionesTable from "../components/portafolio/PosicionesTable.jsx";
import PosicionesCards from "../components/portafolio/PosicionesCards.jsx";
import { fetchSaldo, fetchResumenPortafolio, fetchPosiciones } from "../services/portafolioApi.js";
import { obtenerPreferencias } from "../api/perfilApi.js";
import { useTheme } from "../theme/ThemeContext.jsx";

export default function PortafolioView() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);
  const { setTheme, themes } = useTheme();
  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError(null);
    setDatos(null);
    Promise.all([fetchSaldo(), fetchResumenPortafolio(), fetchPosiciones(), obtenerPreferencias()])
      .then(([saldo, resumen, posiciones, preferencias]) => {
        if (!activo) return;
        const vista = preferencias.visualizacion?.portafolio ?? "TABLA";
        if (!["TABLA", "TARJETAS"].includes(vista))
          throw new Error(
            "No podemos mostrar la vista guardada. Revisa tus preferencias en Perfil."
          );
        if (!Array.isArray(posiciones) || !saldo || !resumen)
          throw new Error("La respuesta del portafolio no es válida.");
        if (themes.some((t) => t.id === preferencias.visualizacion?.tema))
          setTheme(preferencias.visualizacion.tema);
        setDatos({ saldo, resumen, posiciones, vista });
      })
      .catch((e) => {
        if (activo) setError(e.mensajeUsuario ?? e.message ?? "No pudimos cargar tu cuenta.");
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [intento, setTheme, themes]);
  return (
    <div className={styles.main}>
      <div className={styles.headingRow}>
        <div>
          <h1 className={styles.heading}>Mi dinero y mis posiciones</h1>
          <p className={styles.subheading}>Consulta tu saldo y el detalle de cada activo.</p>
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => setIntento((i) => i + 1)}
          disabled={loading}
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
      {loading && <p role="status">Cargando saldo y portafolio…</p>}
      {error && (
        <div className={styles.banner} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.retry} onClick={() => setIntento((i) => i + 1)}>
            Reintentar
          </button>
        </div>
      )}
      {datos && !loading && !error && (
        <>
          <div className={styles.columns}>
            <SaldoWidget saldo={datos.saldo} />
            <PortafolioResumen resumen={datos.resumen} />
          </div>
          <p className={styles.subheading}>
            Vista guardada: {datos.vista === "TARJETAS" ? "Tarjetas" : "Tabla"}.{" "}
            <Link to="/perfil">Cambiar en Perfil</Link>
          </p>
          {datos.vista === "TARJETAS" && datos.posiciones.length ? (
            <PosicionesCards posiciones={datos.posiciones} />
          ) : (
            <PosicionesTable posiciones={datos.posiciones} />
          )}
        </>
      )}
    </div>
  );
}
