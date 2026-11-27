import styles from "./comisionista.module.css";
import { textoDeError } from "./errores.js";

/**
 * Pie común de las pantallas que cargan datos: cargando, error con reintento (red/403/404/otro).
 * Devuelve `null` cuando hay datos que mostrar.
 */
export default function EstadoCarga({ cargando, error, datos, onReintentar, recurso, volver }) {
  if (error && !datos) {
    const reintentable = error.status !== 403 && error.status !== 404;
    return (
      <div className={styles.error} role="alert">
        <span>{textoDeError(error, recurso)}</span>
        <span className={styles.accionesFila}>
          {reintentable && (
            <button type="button" className={styles.enlaceBoton} onClick={onReintentar}>
              Reintentar
            </button>
          )}
          {volver}
        </span>
      </div>
    );
  }
  if (cargando && !datos) return <p role="status">Cargando…</p>;
  return null;
}
