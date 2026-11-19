import styles from "./CotizacionDetalle.module.css";
import AdvertenciaAntiguedad from "./AdvertenciaAntiguedad.jsx";
import { formatearFechaHora, formatearPrecio, formatearVolumen } from "./formato.js";
import { evaluarAntiguedad, formatearAntiguedad, segundosDesde } from "../../utils/antiguedad.js";

/**
 * Detalle de la cotización de una acción: precio, bid, ask, spread, volumen, fuente y
 * `actualizadoEn`. Si el dato tiene más de 15 s respecto a la hora local (o el proveedor
 * no responde), la tarjeta se resalta y muestra la advertencia.
 *
 * @param {object} props
 * @param {import("../../api/cotizacionesApi.js").Accion|null} props.accion
 * @param {import("../../api/cotizacionesApi.js").Cotizacion|null} props.cotizacion
 * @param {boolean} props.cargando
 * @param {import("../../api/ApiError.js").ApiError|null} props.error
 * @param {number} props.ahora
 * @param {() => void} [props.onReintentar]
 */
export default function CotizacionDetalle({
  accion,
  cotizacion,
  cargando,
  error,
  ahora,
  onReintentar,
}) {
  if (!accion) {
    return (
      <section className={styles.card} aria-label="Detalle de cotización">
        <p className={styles.estado}>Selecciona una acción para ver su cotización.</p>
      </section>
    );
  }

  const { estado } = evaluarAntiguedad(cotizacion, ahora);
  const destacada = estado === "desactualizada" || estado === "proveedor";
  const moneda = accion.moneda ?? "USD";

  return (
    <section
      className={`${styles.card} ${destacada ? styles[estado] : ""}`}
      aria-labelledby="cotizacion-titulo"
      data-estado={estado}
    >
      <header className={styles.encabezado}>
        <div>
          <h2 id="cotizacion-titulo" className={styles.titulo}>
            {accion.ticker}
          </h2>
          <p className={styles.subtitulo}>
            {accion.nombre} · {accion.mercado}
          </p>
        </div>
        {cotizacion && <AdvertenciaAntiguedad cotizacion={cotizacion} ahora={ahora} />}
      </header>

      {cargando && !cotizacion && (
        <p className={styles.estado} role="status">
          Cargando cotización…
        </p>
      )}

      {error && !cotizacion && (
        <div className={styles.error} role="alert">
          <span>
            {error.codigo === "PROVEEDOR_NO_DISPONIBLE"
              ? "Aún no hay cotización disponible: el proveedor de datos no ha respondido."
              : (error.mensajeUsuario ?? error.message)}
          </span>
          {onReintentar && (
            <button type="button" onClick={onReintentar}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {cotizacion && (
        <>
          <AdvertenciaAntiguedad cotizacion={cotizacion} ahora={ahora} variante="banner" />

          <p className={styles.precio}>{formatearPrecio(cotizacion.precio, moneda)}</p>

          <dl className={styles.datos}>
            <div>
              <dt>Bid</dt>
              <dd>{formatearPrecio(cotizacion.bid, moneda)}</dd>
            </div>
            <div>
              <dt>Ask</dt>
              <dd>{formatearPrecio(cotizacion.ask, moneda)}</dd>
            </div>
            <div>
              <dt>Spread</dt>
              <dd>{formatearPrecio(cotizacion.spread, moneda)}</dd>
            </div>
            <div>
              <dt>Volumen</dt>
              <dd>{formatearVolumen(cotizacion.volumen)}</dd>
            </div>
            <div>
              <dt>Actualizado</dt>
              <dd>
                <time dateTime={cotizacion.actualizadoEn}>
                  {formatearFechaHora(cotizacion.actualizadoEn)}
                </time>
                <span className={styles.hace}>
                  hace {formatearAntiguedad(segundosDesde(cotizacion.actualizadoEn, ahora))}
                </span>
              </dd>
            </div>
            <div>
              <dt>Fuente</dt>
              <dd>{cotizacion.fuente}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
