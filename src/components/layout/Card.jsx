import styles from "./Card.module.css";

/**
 * Contenedor con borde y esquinas redondeadas.
 * Base visual para los paneles del formulario.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children Contenido del panel.
 * @param {string} [props.className]       Clases adicionales.
 */
export default function Card({ children, className = "" }) {
  return <section className={`${styles.card} ${className}`}>{children}</section>;
}
