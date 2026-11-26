import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "./NotificacionesPage.module.css";
import {
  enlaceDeNotificacion,
  etiquetaTipo,
  OPCIONES_TIPO,
} from "../components/notificaciones/tiposNotificacion.js";
import Paginacion from "../components/ui/Paginacion.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNotificaciones } from "../hooks/useNotificaciones.js";
import { useNoLeidas } from "../notificaciones/NotificacionesContext.jsx";

const TAMANO = 10;
const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function leerVista(params) {
  const tipo = params.get("tipo") ?? "";
  const pagina = Number.parseInt(params.get("pagina") ?? "1", 10);
  return {
    soloSinLeer: params.get("vista") === "sin-leer",
    tipo: OPCIONES_TIPO.some((o) => o.valor === tipo) ? tipo : "",
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Centro de notificaciones (SCRUM-63): lista, filtros, marcar como leída y enlace a la orden. */
export default function NotificacionesPage() {
  const { rol } = useAuth();
  const { refrescar: refrescarCampana } = useNoLeidas();
  const [params, setParams] = useSearchParams();
  const { soloSinLeer, tipo, pagina } = leerVista(params);
  const [aviso, setAviso] = useState(null);

  const filtros = { pagina: pagina - 1, tamano: TAMANO };
  if (tipo) filtros.tipo = tipo;
  if (soloSinLeer) filtros.leida = false;
  const datos = useNotificaciones(filtros);
  const lista = datos.pagina?.contenido ?? [];
  const sinLeerEnPagina = lista.filter((n) => !n.leida);

  const cambiar = (cambios) => {
    const siguiente = { vista: soloSinLeer ? "sin-leer" : "", tipo, pagina: 1, ...cambios };
    const q = new URLSearchParams();
    if (siguiente.vista) q.set("vista", siguiente.vista);
    if (siguiente.tipo) q.set("tipo", siguiente.tipo);
    if (siguiente.pagina > 1) q.set("pagina", String(siguiente.pagina));
    setParams(q);
    setAviso(null);
  };

  const marcar = async (ids) => {
    setAviso(null);
    const fallidas = await datos.marcarLeidas(ids);
    refrescarCampana();
    if (fallidas > 0) {
      setAviso(
        fallidas === ids.length
          ? "No pudimos marcarlas como leídas. Inténtalo de nuevo."
          : `${fallidas} no se pudieron marcar. Inténtalo de nuevo.`
      );
    }
    // Si la página queda vacía al ver solo las sin leer, se vuelve a la anterior.
    if (soloSinLeer && ids.length === lista.length && pagina > 1) cambiar({ pagina: pagina - 1 });
  };

  return (
    <div className={styles.main}>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>Notificaciones</h1>
          <p className={styles.subheading}>
            Avisos de mercado, resúmenes y el resultado de tus órdenes.
          </p>
        </div>
        {sinLeerEnPagina.length > 0 && (
          <button
            type="button"
            className={styles.secundario}
            onClick={() => marcar(sinLeerEnPagina.map((n) => n.id))}
          >
            Marcar esta página como leída
          </button>
        )}
      </div>

      <div className={styles.filtros}>
        <div className={styles.vistas} role="group" aria-label="Vista">
          <button
            type="button"
            className={`${styles.vista} ${!soloSinLeer ? styles.vistaActiva : ""}`}
            aria-pressed={!soloSinLeer}
            onClick={() => cambiar({ vista: "" })}
          >
            Todas
          </button>
          <button
            type="button"
            className={`${styles.vista} ${soloSinLeer ? styles.vistaActiva : ""}`}
            aria-pressed={soloSinLeer}
            onClick={() => cambiar({ vista: "sin-leer" })}
          >
            Sin leer
          </button>
        </div>
        <label className={styles.campo}>
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => cambiar({ tipo: e.target.value })}>
            <option value="">Todos</option>
            {OPCIONES_TIPO.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {aviso && (
        <p className={styles.error} role="alert">
          {aviso}
        </p>
      )}

      {datos.error && !datos.pagina && (
        <div className={styles.error} role="alert">
          <span>{datos.error}</span>
          <button type="button" className={styles.enlace} onClick={datos.recargar}>
            Reintentar
          </button>
        </div>
      )}

      {datos.cargando && !datos.pagina && <p role="status">Cargando notificaciones…</p>}

      {datos.pagina && lista.length === 0 && (
        <p className={styles.vacio}>
          {soloSinLeer || tipo
            ? "No hay notificaciones con estos filtros."
            : "Todavía no tienes notificaciones."}
        </p>
      )}

      {lista.length > 0 && (
        <ul className={styles.lista} aria-label="Lista de notificaciones">
          {lista.map((n) => {
            const enlace = enlaceDeNotificacion(n, rol);
            return (
              <li key={n.id} className={`${styles.item} ${n.leida ? "" : styles.sinLeer}`}>
                <div className={styles.cuerpo}>
                  <p className={styles.titulo}>
                    {!n.leida && <span className={styles.punto} role="img" aria-label="Sin leer" />}
                    {n.titulo}
                  </p>
                  <p className={styles.mensaje}>{n.mensaje}</p>
                  <p className={styles.meta}>
                    <span className={styles.chip}>{etiquetaTipo(n.tipo)}</span>
                    <time dateTime={n.creadaEn}>{formatoFecha.format(new Date(n.creadaEn))}</time>
                  </p>
                </div>
                <div className={styles.acciones}>
                  {enlace && (
                    <Link className={styles.enlace} to={enlace}>
                      Ver orden
                    </Link>
                  )}
                  {!n.leida && (
                    <button
                      type="button"
                      className={styles.secundario}
                      aria-label={`Marcar como leída: ${n.titulo}`}
                      onClick={() => marcar([n.id])}
                    >
                      Marcar como leída
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Paginacion
        pagina={pagina}
        totalPaginas={datos.pagina?.totalPaginas ?? 0}
        totalElementos={datos.pagina?.totalElementos}
        unidad="notificaciones"
        onCambiar={(n) => cambiar({ pagina: n })}
      />
    </div>
  );
}
