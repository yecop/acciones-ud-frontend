import horizontal from "../../assets/marca/logo-horizontal.png";
import completo from "../../assets/marca/logo-completo.png";
import isotipo from "../../assets/marca/isotipo.png";
import styles from "./Logo.module.css";

const VARIANTES = {
  horizontal: { src: horizontal, ancho: 457, alto: 120 },
  completo: { src: completo, ancho: 354, alto: 260 },
  isotipo: { src: isotipo, ancho: 106, alto: 120 },
};

/**
 * Logo aprobado de Acciones UD (los PNG tienen fondo transparente y están pensados
 * para fondos claros; sobre fondos oscuros va dentro de una «placa» clara).
 *
 * @param {object} props
 * @param {"horizontal"|"completo"|"isotipo"} [props.variante]
 * @param {number} [props.alto]  Alto en px (el ancho se calcula solo).
 * @param {string} [props.className]
 */
export default function Logo({ variante = "horizontal", alto = 40, className = "" }) {
  const { src, ancho, alto: altoOriginal } = VARIANTES[variante];
  return (
    <img
      className={`${styles.logo} ${className}`}
      src={src}
      alt="Acciones UD"
      height={alto}
      width={Math.round((alto * ancho) / altoOriginal)}
      decoding="async"
    />
  );
}
