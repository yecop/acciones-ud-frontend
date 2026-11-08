import { useState } from "react";
import styles from "./PriceChartCard.module.css";

/** Puntos de ejemplo para el trazo del gráfico (0-100 en Y). */
const DEFAULT_SERIES = [62, 58, 65, 60, 55, 68, 72, 64, 70, 78, 74, 82];

/**
 * Convierte una serie numérica en una ruta SVG (coordenadas 0-100).
 */
function buildPath(series, width, height) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const stepX = width / (series.length - 1);
  return series
    .map((point, i) => {
      const x = i * stepX;
      const y = height - ((point - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Tarjeta con el detalle del activo destacado y su gráfico de precio.
 *
 * @param {object} props
 * @param {object} props.asset  Estructura `featured` de dashboardData.
 * @param {number[]} [props.series] Serie de puntos del gráfico.
 */
export default function PriceChartCard({ asset, series = DEFAULT_SERIES }) {
  const [activeRange, setActiveRange] = useState(asset.activeRange);

  const width = 600;
  const height = 200;
  const linePath = buildPath(series, width, height);
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const toneClass = asset.tone === "negative" ? styles.negative : styles.positive;

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.symbol}>
            {asset.symbol} · {asset.name} · {asset.market}
          </p>
          <p className={styles.price}>
            {asset.price}
            <span className={`${styles.change} ${toneClass}`}>{asset.change}</span>
          </p>
        </div>
        <div className={styles.ranges} role="tablist" aria-label="Rango de tiempo">
          {asset.ranges.map((range) => (
            <button
              key={range}
              type="button"
              role="tab"
              aria-selected={activeRange === range}
              className={`${styles.range} ${activeRange === range ? styles.rangeActive : ""}`}
              onClick={() => setActiveRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chartWrap}>
        <div className={styles.yAxis} aria-hidden="true">
          {asset.yAxis.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className={styles.chartArea}>
          <svg
            className={styles.chart}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Gráfico de precio de ${asset.symbol}`}
            style={{ color: "var(--color-brand-accent)" }}
          >
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#priceFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-brand-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className={styles.xAxis} aria-hidden="true">
            {asset.xAxis.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        {asset.stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={styles.statValue}>{stat.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
