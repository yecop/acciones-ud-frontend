import { Link } from "react-router-dom";
import styles from "./StatusPage.module.css";

/**
 * Pantalla simple de estado (sin acceso, no encontrada, pendiente de construir).
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {string} props.mensaje
 * @param {{ to: string, label: string }} [props.accion]
 * @param {string} [props.etiqueta] Etiqueta pequeña sobre el título (p. ej. "403").
 */
export default function StatusPage({ titulo, mensaje, accion, etiqueta }) {
  return (
    <section className={styles.card}>
      {etiqueta && <p className={styles.tag}>{etiqueta}</p>}
      <h1 className={styles.title}>{titulo}</h1>
      <p className={styles.message}>{mensaje}</p>
      {accion && (
        <Link className={styles.action} to={accion.to}>
          {accion.label}
        </Link>
      )}
    </section>
  );
}
