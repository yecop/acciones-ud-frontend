import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "./OrdenDetallePage.module.css";
import BotonCancelarOrden from "../components/order/BotonCancelarOrden.jsx";
import { etiquetaEstado, etiquetaLado, etiquetaTipo } from "../components/order/estadosOrden.js";
import { formatCurrency } from "../components/order/orderUtils.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useOrdenDetalle } from "../hooks/useOrdenDetalle.js";

const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "medium" });
const fecha = (iso) => (iso ? formatoFecha.format(new Date(iso)) : "—");
const dinero = (valor) => formatCurrency(Number(valor));

/** Quién hizo el cambio: [Propuesta de backend] actor `{ tipo: USUARIO | COMISIONISTA | SISTEMA, id | null }`. */
function textoActor(actor, usuarioId) {
  if (!actor || actor.tipo === "SISTEMA") return "Sistema";
  if (actor.tipo === "COMISIONISTA") return "Comisionista";
  return actor.id && actor.id === usuarioId ? "Tú" : "Usuario";
}

function Dato({ etiqueta, children }) {
  return (
    <div className={styles.dato}>
      <dt>{etiqueta}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Detalle de una orden (SCRUM-62): resumen, ejecuciones y línea de tiempo de estados. */
export default function OrdenDetallePage() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const detalle = useOrdenDetalle(id);
  const [mensaje, setMensaje] = useState(null);
  const { orden } = detalle;

  const volver = (
    <Link className={styles.volver} to="/historial">
      ← Volver al historial
    </Link>
  );

  if (detalle.cargando && !orden) {
    return (
      <div className={styles.main}>
        {volver}
        <p role="status">Cargando la orden…</p>
      </div>
    );
  }

  if (detalle.noEncontrada) {
    return (
      <div className={styles.main}>
        {volver}
        <h1 className={styles.heading}>No encontramos esta orden</h1>
        <p className={styles.texto} role="alert">
          La orden no existe o no te pertenece. Revisa el enlace o vuelve al historial.
        </p>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className={styles.main}>
        {volver}
        <div className={styles.error} role="alert">
          <span>{detalle.errorOrden ?? "No pudimos cargar la orden."}</span>
          <button type="button" className={styles.enlace} onClick={detalle.recargar}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const estado = etiquetaEstado(orden);
  const ejecutada = Number(orden.cantidadEjecutada ?? 0);
  const comisionista = Number(orden.comision?.valorComisionista ?? 0);
  const esCompra = orden.lado === "COMPRA";

  return (
    <div className={styles.main}>
      {volver}

      <header className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>
            {etiquetaLado(orden.lado)} de {orden.ticker}
          </h1>
          <p className={styles.texto}>
            {etiquetaTipo(orden.tipo)} · {orden.cantidad}{" "}
            {orden.cantidad === 1 ? "acción" : "acciones"}
          </p>
        </div>
        <div className={styles.cabeceraDerecha}>
          <span className={`${styles.chip} ${styles[estado.tono]}`}>{estado.etiqueta}</span>
          <BotonCancelarOrden
            orden={orden}
            onResultado={setMensaje}
            onTerminado={detalle.refrescar}
          />
        </div>
      </header>

      {mensaje && (
        <p
          className={`${styles.mensaje} ${mensaje.tipo === "error" ? styles.mensajeError : ""}`}
          role={mensaje.tipo === "error" ? "alert" : "status"}
        >
          {mensaje.texto}
        </p>
      )}

      <section className={styles.card} aria-labelledby="titulo-resumen">
        <h2 id="titulo-resumen" className={styles.subtitulo}>
          Resumen
        </h2>
        <dl className={styles.datos}>
          <Dato etiqueta="Cantidad ejecutada">
            {ejecutada} de {orden.cantidad}
          </Dato>
          {orden.precioLimite && <Dato etiqueta="Precio límite">{dinero(orden.precioLimite)}</Dato>}
          {orden.precioStop && <Dato etiqueta="Precio stop">{dinero(orden.precioStop)}</Dato>}
          <Dato etiqueta="Precio estimado">{dinero(orden.precioEstimado)}</Dato>
          {orden.precioEjecucion && (
            <Dato etiqueta="Precio de ejecución (promedio)">{dinero(orden.precioEjecucion)}</Dato>
          )}
          <Dato etiqueta="Total de la transacción">{dinero(orden.totalTransaccion)}</Dato>
          <Dato etiqueta={`Comisión (${Number(orden.comision?.porcentaje ?? 0)} %)`}>
            {dinero(orden.comision?.valor)}
            {comisionista > 0 && (
              <span className={styles.nota}>
                Plataforma {dinero(orden.comision.valorPlataforma)} · Comisionista{" "}
                {dinero(orden.comision.valorComisionista)}
              </span>
            )}
          </Dato>
          <Dato etiqueta={esCompra ? "Total descontado" : "Total a recibir"}>
            <strong>{dinero(orden.totalDescontado)}</strong>
          </Dato>
          {orden.encolada && <Dato etiqueta="Encolada">Sí, esperando la apertura del mercado</Dato>}
          {orden.validadaPor && (
            <Dato etiqueta="Doble autorización">
              {orden.validadaPor === usuario?.id ? "Validada por ti" : "Validada"} el{" "}
              {fecha(orden.validadaEn)}
            </Dato>
          )}
          <Dato etiqueta="Creada">{fecha(orden.creadaEn)}</Dato>
          <Dato etiqueta="Última actualización">{fecha(orden.actualizadaEn)}</Dato>
          <Dato etiqueta="Referencia">
            <code className={styles.codigo}>{orden.id}</code>
          </Dato>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="titulo-ejecuciones">
        <h2 id="titulo-ejecuciones" className={styles.subtitulo}>
          Ejecuciones
        </h2>
        {orden.ejecuciones?.length ? (
          <div
            className={styles.scroll}
            role="region"
            aria-label="Tabla de ejecuciones"
            tabIndex={0}
          >
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col" className={styles.num}>
                    Cantidad
                  </th>
                  <th scope="col" className={styles.num}>
                    Precio
                  </th>
                  <th scope="col" className={styles.num}>
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {orden.ejecuciones.map((e, i) => (
                  <tr key={`${e.fecha}-${i}`}>
                    <td>{fecha(e.fecha)}</td>
                    <td className={styles.num}>{e.cantidad}</td>
                    <td className={styles.num}>{dinero(e.precio)}</td>
                    <td className={styles.num}>{formatCurrency(e.cantidad * Number(e.precio))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.texto}>Esta orden todavía no tiene ejecuciones.</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="titulo-historial">
        <h2 id="titulo-historial" className={styles.subtitulo}>
          Historial de estados
        </h2>
        {detalle.errorHistorial && (
          <div className={styles.error} role="alert">
            <span>{detalle.errorHistorial}</span>
            <button type="button" className={styles.enlace} onClick={detalle.recargar}>
              Reintentar
            </button>
          </div>
        )}
        {detalle.historial?.length ? (
          <ol className={styles.linea} aria-label="Cambios de estado">
            {detalle.historial.map((h, i) => {
              const e = etiquetaEstado({ estado: h.estado, cantidad: orden.cantidad });
              return (
                <li key={`${h.fecha}-${i}`} className={styles.paso}>
                  <p className={styles.pasoTitulo}>
                    <span className={`${styles.chip} ${styles[e.tono]}`}>{e.etiqueta}</span>
                    <time dateTime={h.fecha}>{fecha(h.fecha)}</time>
                  </p>
                  <p className={styles.texto}>
                    {textoActor(h.actor, usuario?.id)}
                    {h.motivo ? ` · ${h.motivo}` : ""}
                  </p>
                  {h.precioReferencia && (
                    <p className={styles.nota}>
                      Precio de referencia {dinero(h.precioReferencia)}
                      {h.bid && h.ask ? ` (compra ${dinero(h.bid)} · venta ${dinero(h.ask)})` : ""}
                    </p>
                  )}
                  {h.traceId && <p className={styles.nota}>Traza: {h.traceId}</p>}
                </li>
              );
            })}
          </ol>
        ) : (
          !detalle.errorHistorial && (
            <p className={styles.texto}>Sin cambios de estado registrados.</p>
          )
        )}
      </section>
    </div>
  );
}
