import styles from "./BrandHero.module.css";
import { LogoIcon, CheckIcon } from "../ui/Icons.jsx";

/**
 * Panel de marca (columna izquierda) de la pantalla de verificación.
 *
 * @param {object} props
 * @param {string} [props.brandName]
 * @param {string[]} [props.titleLines]  Líneas del titular principal.
 * @param {string} [props.subtitle]
 * @param {string[]} [props.features]     Lista de beneficios con check.
 * @param {string[]} [props.markets]      Etiquetas de mercados.
 */
export default function BrandHero({
  brandName = "Acciones UD",
  titleLines = ["Opera en los mercados", "del mundo, con cada", "movimiento a la vista."],
  subtitle = "Day trading en NYSE, NASDAQ, Londres, Tokio y Sídney, con comisionistas que te asesoran cuando lo necesitas.",
  features = [
    "Fondos custodiados por Alpaca",
    "Trazabilidad completa de cada orden",
    "Verificación en dos pasos en cada ingreso",
  ],
  markets = ["NYSE", "NASDAQ", "LSE", "TSE", "ASX"],
}) {
  return (
    <aside className={styles.hero}>
      <div className={styles.brand}>
        <LogoIcon size={44} />
        <span className={styles.brandName}>{brandName}</span>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>
          {titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className={styles.subtitle}>{subtitle}</p>

        <ul className={styles.features}>
          {features.map((feature) => (
            <li key={feature} className={styles.feature}>
              <span className={styles.featureIcon}>
                <CheckIcon size={18} />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.markets}>
        {markets.map((market) => (
          <span key={market} className={styles.marketTag}>
            {market}
          </span>
        ))}
      </div>
    </aside>
  );
}
