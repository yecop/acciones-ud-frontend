import { useMercadosEstado } from "../../hooks/useMercadosEstado";
import styles from "./MercadosStatusWidget.module.css";

/**
 * Formatea un instante ISO a hora local del mercado (zona IANA).
 * @param {string|null} isoInstant
 * @param {string} zonaHoraria
 */
function formatearHora(isoInstant, zonaHoraria) {
  if (!isoInstant) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: zonaHoraria,
    }).format(new Date(isoInstant));
  } catch {
    return new Date(isoInstant).toLocaleString("es-CO");
  }
}

/**
 * Widget de estado de mercados (SCRUM-23).
 *
 * Consume GET /api/v1/mercados y GET /api/v1/mercados/{codigo}/estado y muestra,
 * para cada mercado, un indicador de color (verde = abierto, rojo = cerrado),
 * la próxima apertura o cierre y las restricciones vigentes.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {number} [props.intervaloMs] intervalo de refresco en ms.
 */
export default function MercadosStatusWidget({
  title = "Estado de mercados",
  intervaloMs = 60000,
}) {
  const { mercados, cargando, error, refrescar } = useMercadosEstado({ intervaloMs });

  return (
    <section className={styles.card} aria-busy={cargando}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <button
          type="button"
          className={styles.refrescar}
          onClick={refrescar}
          aria-label="Refrescar estado de mercados"
        >
          Actualizar
        </button>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {cargando && mercados.length === 0 && (
        <p className={styles.cargando}>Consultando mercados…</p>
      )}

      <ul className={styles.lista}>
        {mercados.map((mercado) => {
          const abierto = mercado.abierto;
          return (
            <li key={mercado.codigo} className={styles.row}>
              <div className={styles.info}>
                <span
                  className={`${styles.indicador} ${abierto ? styles.abierto : styles.cerrado}`}
                  aria-hidden="true"
                />
                <div>
                  <p className={styles.name}>
                    {mercado.nombre} <span className={styles.codigo}>({mercado.codigo})</span>
                  </p>
                  <p className={styles.schedule}>
                    {mercado.horaApertura}–{mercado.horaCierre} · {mercado.zonaHoraria}
                  </p>
                  <p className={styles.detalle}>
                    {abierto
                      ? `Cierra: ${formatearHora(mercado.proximoCierre, mercado.zonaHoraria)}`
                      : `Abre: ${formatearHora(mercado.proximaApertura, mercado.zonaHoraria)}`}
                  </p>
                  {mercado.restricciones?.length > 0 && (
                    <ul className={styles.restricciones}>
                      {mercado.restricciones.map((r) => (
                        <li key={r.codigo} className={styles.restriccion}>
                          {r.descripcion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <span
                className={`${styles.status} ${
                  abierto ? styles.statusAbierto : styles.statusCerrado
                }`}
              >
                {abierto ? "Abierto" : "Cerrado"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
