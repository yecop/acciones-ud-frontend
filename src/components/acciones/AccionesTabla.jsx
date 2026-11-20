import styles from "./AccionesTabla.module.css";
import AdvertenciaAntiguedad from "./AdvertenciaAntiguedad.jsx";
import { formatearPrecio } from "./formato.js";
import { SECTORES } from "./AccionesFiltros.jsx";

const ETIQUETA_SECTOR = Object.fromEntries(SECTORES.map((s) => [s.valor, s.etiqueta]));

/**
 * Tabla de acciones con su última cotización en caché. Cada fila es seleccionable para
 * ver el detalle de la cotización.
 *
 * @param {object} props
 * @param {Array<import("../../api/cotizacionesApi.js").Accion>} props.acciones
 * @param {string|null} props.seleccionada
 * @param {(accion:import("../../api/cotizacionesApi.js").Accion) => void} props.onSeleccionar
 * @param {number} props.ahora
 */
export default function AccionesTabla({ acciones, seleccionada, onSeleccionar, ahora }) {
  if (acciones.length === 0) {
    return <p className={styles.vacio}>No hay acciones que coincidan con los filtros.</p>;
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th scope="col">Acción</th>
            <th scope="col">Mercado</th>
            <th scope="col">Sector</th>
            <th scope="col" className={styles.num}>
              Precio
            </th>
            <th scope="col">Dato</th>
          </tr>
        </thead>
        <tbody>
          {acciones.map((a) => {
            const activa = a.ticker === seleccionada;
            return (
              <tr key={a.ticker} className={activa ? styles.activa : undefined}>
                <td>
                  <button
                    type="button"
                    className={styles.fila}
                    onClick={() => onSeleccionar(a)}
                    aria-pressed={activa}
                    aria-label={`Ver cotización de ${a.ticker}`}
                  >
                    <span className={styles.ticker}>{a.ticker}</span>
                    <span className={styles.nombre}>{a.nombre}</span>
                  </button>
                </td>
                <td>{a.mercado}</td>
                <td>{ETIQUETA_SECTOR[a.sector] ?? a.sector}</td>
                <td className={styles.num}>
                  {a.cotizacion ? formatearPrecio(a.cotizacion.precio, a.moneda) : "—"}
                </td>
                <td>
                  <AdvertenciaAntiguedad cotizacion={a.cotizacion} ahora={ahora} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
