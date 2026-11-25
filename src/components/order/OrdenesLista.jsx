import { useState } from "react";
import styles from "./OrdenesLista.module.css";
import { cancelarOrden } from "../../api/ordenesApi.js";
import { etiquetaEstado, etiquetaLado, etiquetaTipo, puedeCancelar } from "./estadosOrden.js";
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
 */
export default function OrdenesLista({ pagina, cargando, error, onReintentar, onCambio }) {
  const [confirmando, setConfirmando] = useState(null);
  const [cancelando, setCancelando] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const ordenes = pagina?.contenido ?? [];

  const cancelar = async (orden) => {
    setCancelando(orden.id);
    setMensaje(null);
    try {
      const r = await cancelarOrden(orden.id);
      const liberado = Number(r.saldoLiberado);
      setMensaje({
        tipo: "ok",
        texto: liberado
          ? `Orden cancelada. Se liberaron ${formatCurrency(liberado)}.`
          : "Orden cancelada.",
      });
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto: e?.mensajeUsuario ?? "No pudimos cancelar la orden. Inténtalo de nuevo.",
      });
    } finally {
      setCancelando(null);
      setConfirmando(null);
      onCambio?.();
    }
  };

  return (
    <section className={styles.card} aria-labelledby="titulo-ordenes">
      <div className={styles.encabezado}>
        <h2 id="titulo-ordenes" className={styles.titulo}>
          Mis órdenes
        </h2>
        <button type="button" className={styles.enlace} onClick={onReintentar} disabled={cargando}>
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
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

      {!cargando && !error && ordenes.length === 0 && (
        <p className={styles.vacio}>
          Todavía no tienes órdenes. Crea la primera desde el formulario «Nueva orden».
        </p>
      )}

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
                    </td>
                    <td className={styles.acciones}>
                      {puedeCancelar(orden) &&
                        (confirmando === orden.id ? (
                          <span className={styles.confirmar}>
                            <span>
                              ¿Cancelar {etiquetaLado(orden.lado).toLowerCase()} de {orden.cantidad}{" "}
                              {orden.ticker}?
                            </span>
                            <button
                              type="button"
                              className={styles.peligro}
                              disabled={cancelando === orden.id}
                              onClick={() => cancelar(orden)}
                            >
                              {cancelando === orden.id ? "Cancelando…" : "Sí, cancelar"}
                            </button>
                            <button
                              type="button"
                              className={styles.enlace}
                              disabled={cancelando === orden.id}
                              onClick={() => setConfirmando(null)}
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={styles.enlace}
                            aria-label={`Cancelar orden de ${orden.ticker}`}
                            onClick={() => setConfirmando(orden.id)}
                          >
                            Cancelar
                          </button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagina && pagina.totalElementos > ordenes.length && (
        <p className={styles.nota}>
          Mostrando las {ordenes.length} más recientes de {pagina.totalElementos}.
        </p>
      )}
    </section>
  );
}
