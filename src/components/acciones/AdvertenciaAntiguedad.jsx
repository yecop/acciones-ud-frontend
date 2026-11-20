import styles from "./AdvertenciaAntiguedad.module.css";
import { evaluarAntiguedad } from "../../utils/antiguedad.js";

/**
 * Indicador de antigüedad de una cotización. Se destaca (ámbar o rojo) cuando
 * `actualizadoEn` tiene más de 15 s de retraso respecto a la hora local, o cuando el
 * backend avisa que el proveedor no responde.
 *
 * @param {object} props
 * @param {import("../../api/cotizacionesApi.js").Cotizacion} [props.cotizacion]
 * @param {number} props.ahora           `Date.now()` (ver `useAhora`).
 * @param {"chip"|"banner"} [props.variante="chip"]
 */
export default function AdvertenciaAntiguedad({ cotizacion, ahora, variante = "chip" }) {
  const { estado, mensaje } = evaluarAntiguedad(cotizacion, ahora);
  const destacada = estado === "desactualizada" || estado === "proveedor";

  if (variante === "banner") {
    if (!destacada) return null;
    return (
      <div className={`${styles.banner} ${styles[estado]}`} role="alert" data-estado={estado}>
        <span className={styles.icono} aria-hidden="true">
          ⚠
        </span>
        <span>{mensaje}</span>
      </div>
    );
  }

  return (
    <span
      className={`${styles.chip} ${styles[estado] ?? ""}`}
      title={mensaje}
      data-estado={estado}
      aria-label={mensaje}
    >
      {destacada && (
        <span className={styles.icono} aria-hidden="true">
          ⚠
        </span>
      )}
      {etiqueta(estado)}
    </span>
  );
}

function etiqueta(estado) {
  switch (estado) {
    case "proveedor":
      return "Proveedor caído";
    case "desactualizada":
      return "Desactualizado";
    case "sin-dato":
      return "Sin dato";
    default:
      return "Al día";
  }
}
