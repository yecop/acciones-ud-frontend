import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./OrdenesLista.module.css";
import BotonCancelarOrden from "./BotonCancelarOrden.jsx";
import { ayudaEstado, etiquetaEstado, etiquetaLado, etiquetaTipo } from "./estadosOrden.js";
import { formatCurrency } from "./orderUtils.js";

const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "short" });
const formatoHora = new Intl.DateTimeFormat("es-CO", { timeStyle: "short" });

/**
 * Tabla de órdenes del usuario con la acción de cancelar (solo en los estados que lo permiten).
 *
 * @param {object} props
 * @param {object|null} props.pagina    Respuesta de `GET /ordenes` ({contenido, totalElementos, ...}).
 * @param {boolean} props.cargando
 * @param {string|null} props.error     Mensaje de error de la carga, si lo hubo.
 * @param {function} props.onReintentar
 * @param {function} [props.onCambio]   Se llama tras cancelar (para refrescar lista y saldo).
 * @param {string} [props.titulo]       Título de la tarjeta.
 * @param {function} [props.detalleHref] (orden) => ruta del detalle; si se pasa, agrega «Detalle».
 * @param {boolean} [props.mostrarNota] Nota «Mostrando las N más recientes» (apagar si hay paginación).
 * @param {import("react").ReactNode} [props.vacio] Mensaje cuando no hay órdenes.
 * @param {import("react").ReactNode} [props.encabezadoExtra] Contenido junto al título (enlaces).
 */
export default function OrdenesLista({
  pagina,
  cargando,
  error,
  onReintentar,
  onCambio,
  titulo = "Mis órdenes",
  detalleHref,
  mostrarNota = true,
  vacio = "Todavía no tienes órdenes. Crea la primera desde el formulario «Nueva orden».",
  encabezadoExtra,
}) {
  const [mensaje, setMensaje] = useState(null);

  const ordenes = pagina?.contenido ?? [];

  return (
    <section className={styles.card} aria-labelledby="titulo-ordenes">
      <div className={styles.encabezado}>
        <h2 id="titulo-ordenes" className={styles.titulo}>
          {titulo}
        </h2>
        <span className={styles.encabezadoAcciones}>
          {encabezadoExtra}
          <button
            type="button"
            className={styles.enlace}
            onClick={onReintentar}
            disabled={cargando}
          >
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </span>
      </div>

      {mensaje && (
        <p
          className={`${styles.mensaje} ${mensaje.tipo === "error" ? styles.mensajeError : ""}`}
          role={mensaje.tipo === "error" ? "alert" : "status"}
        >
          {mensaje.texto}
        </p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.enlace} onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      )}

      {cargando && !pagina && <p role="status">Cargando tus órdenes…</p>}

      {!cargando && !error && ordenes.length === 0 && <p className={styles.vacio}>{vacio}</p>}

      {ordenes.length > 0 && (
        <div className={styles.scroll} role="region" aria-label="Tabla de órdenes" tabIndex={0}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Acción</th>
                <th scope="col">Operación</th>
                <th scope="col" className={styles.num}>
                  Cantidad
                </th>
                <th scope="col" className={styles.num}>
                  Total
                </th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className={styles.soloLector}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => {
                const estado = etiquetaEstado(orden);
                const ayuda = ayudaEstado(orden);
                const ejecutada = Number(orden.cantidadEjecutada ?? 0);
                return (
                  <tr key={orden.id} data-orden-id={orden.id}>
                    <td>
                      <span>{formatoFecha.format(new Date(orden.creadaEn))}</span>
                      <span className={styles.hora}>
                        {formatoHora.format(new Date(orden.creadaEn))}
                      </span>
                    </td>
                    <th scope="row" className={styles.ticker}>
                      {orden.ticker}
                    </th>
                    <td>
                      {etiquetaLado(orden.lado)} · {etiquetaTipo(orden.tipo)}
                    </td>
                    <td className={styles.num}>
                      {ejecutada > 0 && ejecutada < orden.cantidad
                        ? `${ejecutada}/${orden.cantidad}`
                        : orden.cantidad}
                    </td>
                    <td className={styles.num}>{formatCurrency(Number(orden.totalTransaccion))}</td>
                    <td>
                      <span className={`${styles.chip} ${styles[estado.tono]}`}>
                        {estado.etiqueta}
                      </span>
                      {ayuda && <span className={styles.ayudaEstado}>{ayuda.corta}</span>}
                    </td>
                    <td className={styles.acciones}>
                      {detalleHref && (
                        <Link
                          className={styles.enlace}
                          to={detalleHref(orden)}
                          aria-label={`Ver detalle de la orden de ${orden.ticker}`}
                        >
                          Detalle
                        </Link>
                      )}
                      <BotonCancelarOrden
                        orden={orden}
                        onResultado={setMensaje}
                        onTerminado={onCambio}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mostrarNota && pagina && pagina.totalElementos > ordenes.length && (
        <p className={styles.nota}>
          Mostrando las {ordenes.length} más recientes de {pagina.totalElementos}.
        </p>
      )}
    </section>
  );
}
