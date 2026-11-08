import styles from "./sections.module.css";
import Chip from "../ui/Chip.jsx";

/**
 * Sección "Tus intereses": mercados y sectores (multi-selección).
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {Array<{id:string,label:string}>} props.markets
 * @param {Array<{id:string,label:string}>} props.sectors
 * @param {string[]} props.selectedMarkets
 * @param {string[]} props.selectedSectors
 * @param {function} props.onToggleMarket  Recibe el id del mercado.
 * @param {function} props.onToggleSector  Recibe el id del sector.
 */
export default function Interests({
  title = "Tus intereses",
  markets = [],
  sectors = [],
  selectedMarkets = [],
  selectedSectors = [],
  onToggleMarket,
  onToggleSector,
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>

      <div className={styles.fieldGroup}>
        <p className={styles.helpText}>Mercados</p>
        <div className={styles.chipRow}>
          {markets.map((market) => (
            <Chip
              key={market.id}
              label={market.label}
              active={selectedMarkets.includes(market.id)}
              onToggle={() => onToggleMarket(market.id)}
            />
          ))}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <p className={styles.helpText}>Sectores</p>
        <div className={styles.chipRow}>
          {sectors.map((sector) => (
            <Chip
              key={sector.id}
              label={sector.label}
              active={selectedSectors.includes(sector.id)}
              onToggle={() => onToggleSector(sector.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
