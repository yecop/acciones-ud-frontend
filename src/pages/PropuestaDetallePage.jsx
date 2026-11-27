import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "../components/comisionista/comisionista.module.css";
import EstadoCarga from "../components/comisionista/EstadoCarga.jsx";
import { clasificarError, textoDeError } from "../components/comisionista/errores.js";
import {
  estaVigente,
  etiquetaEstadoPropuesta,
  etiquetaTipoOrdenPropuesta,
  queSigue,
  textoVencimiento,
} from "../components/comisionista/estadosPropuesta.js";
import { etiquetaLado } from "../components/order/estadosOrden.js";
import { formatCurrency } from "../components/order/orderUtils.js";
import {
  aprobarPropuesta,
  firmarPropuesta,
  obtenerPropuesta,
  rechazarPropuesta,
} from "../api/propuestasApi.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ROLES } from "../auth/roles.js";
import { useCarga } from "../hooks/useCarga.js";

const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const fecha = (iso) => (iso ? formatoFecha.format(new Date(iso)) : "—");

function textoActor(actor, usuarioId, esCom) {
  if (!actor || actor.tipo === "SISTEMA") return "Sistema";
  if (actor.tipo === "COMISIONISTA") return actor.id === usuarioId ? "Tú" : "Comisionista";
  return actor.id === usuarioId ? "Tú" : esCom ? "Cliente" : "Usuario";
}

const ACCIONES = {
  aprobar: {
    dialogo: "Confirmar aprobación",
    boton: "Aprobar propuesta",
    si: "Sí, aprobar",
    resultado: "Propuesta aprobada.",
  },
  rechazar: {
    dialogo: "Confirmar rechazo",
    boton: "Rechazar propuesta",
    si: "Sí, rechazar",
    resultado: "Propuesta rechazada.",
  },
  firmar: {
    dialogo: "Confirmar firma",
    boton: "Firmar propuesta",
    si: "Sí, firmar",
    resultado: "Propuesta firmada.",
  },
};

/** Detalle de una propuesta con las acciones que corresponden a cada rol (SCRUM-65). */
export default function PropuestaDetallePage() {
  const { id } = useParams();
  const { usuario, rol } = useAuth();
  const esCom = rol === ROLES.COM;
  const cargar = useCallback(({ signal }) => obtenerPropuesta(id, { signal }), [id]);
  const carga = useCarga(cargar, { intervaloMs: 30_000 });
  const p = carga.datos;

  const [accion, setAccion] = useState(null); // "aprobar" | "rechazar" | "firmar"
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const volver = (
    <Link className={styles.volver} to="/propuestas">
      ← Volver a propuestas
    </Link>
  );

  const ejecutar = async () => {
    if (accion === "rechazar" && motivo.trim().length < 3) {
      setErrorMotivo("Cuéntale a tu comisionista por qué la rechazas (mínimo 3 caracteres).");
      return;
    }
    setTrabajando(true);
    setErrorMotivo(null);
    setResultado(null);
    try {
      const nueva =
        accion === "aprobar"
          ? await aprobarPropuesta(id)
          : accion === "rechazar"
            ? await rechazarPropuesta(id, motivo.trim())
            : await firmarPropuesta(id);
      carga.setDatos(nueva);
      setResultado({
        tipo: "ok",
        texto: `${ACCIONES[accion].resultado} Estado: ${etiquetaEstadoPropuesta(nueva.estado).etiqueta}.`,
      });
      setAccion(null);
      setMotivo("");
    } catch (e) {
      setResultado({ tipo: "error", texto: textoDeError(e, "esta propuesta") });
      // Vencida o ya cambiada por la otra parte: se muestra el estado real.
      if (["vencida", "otro"].includes(clasificarError(e)) || e?.status === 409) carga.refrescar();
      setAccion(null);
    } finally {
      setTrabajando(false);
    }
  };

  if (!p) {
    return (
      <div className={styles.main}>
        {volver}
        <EstadoCarga {...carga} onReintentar={carga.recargar} recurso="esta propuesta" />
      </div>
    );
  }

  const estado = etiquetaEstadoPropuesta(p.estado);
  const vigente = estaVigente(p);
  const vence = textoVencimiento(p);
  const puedeAprobar = !esCom && p.estado === "PENDIENTE_APROBACION" && vigente;
  const puedeFirmar = esCom && p.estado === "APROBADA" && vigente;
  const n = p.ordenes.length;
  const sigue = queSigue(p.estado, rol);

  return (
    <div className={styles.main}>
      {volver}

      <header className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>{p.titulo}</h1>
          <p className={styles.texto}>
            {esCom ? `Cliente: ${p.clienteNombre}` : `De ${p.comisionistaNombre}`}
            {p.estrategia && ` · Estrategia: ${p.estrategia.nombre}`}
          </p>
        </div>
        <span className={`${styles.chip} ${styles[estado.tono]}`}>{estado.etiqueta}</span>
      </header>

      {resultado && (
        <p
          className={resultado.tipo === "error" ? styles.error : styles.mensaje}
          role={resultado.tipo === "error" ? "alert" : "status"}
        >
          {resultado.texto}
        </p>
      )}

      <aside className={styles.ayuda} aria-label="Qué sigue">
        <p className={styles.filaTitulo}>Qué sigue</p>
        <p className={styles.texto}>{sigue}</p>
        {vence && <p className={styles.texto}>{vence}.</p>}
        {!vigente && ["PENDIENTE_APROBACION", "APROBADA"].includes(p.estado) && (
          <p className={styles.texto}>
            El plazo terminó: ya no puedes actuar sobre esta propuesta.
          </p>
        )}
      </aside>

      {(puedeAprobar || puedeFirmar) && !accion && (
        <div className={styles.accionesFila}>
          {puedeAprobar && (
            <>
              <button
                type="button"
                className={styles.botonPrimario}
                onClick={() => setAccion("aprobar")}
              >
                {ACCIONES.aprobar.boton}
              </button>
              <button
                type="button"
                className={styles.botonPeligro}
                onClick={() => setAccion("rechazar")}
              >
                {ACCIONES.rechazar.boton}
              </button>
            </>
          )}
          {puedeFirmar && (
            <button
              type="button"
              className={styles.botonPrimario}
              onClick={() => setAccion("firmar")}
            >
              {ACCIONES.firmar.boton}
            </button>
          )}
        </div>
      )}

      {accion && (
        <div
          className={styles.confirmacion}
          role="alertdialog"
          aria-label={ACCIONES[accion].dialogo}
        >
          <p>
            {accion === "aprobar" &&
              `Aprobar autoriza a tu comisionista a firmar ${n} ${n === 1 ? "orden" : "órdenes"}. No se ejecutan hasta que las firme.`}
            {accion === "rechazar" && "Rechazar cierra la propuesta y no se creará ninguna orden."}
            {accion === "firmar" &&
              `Al firmar se crearán ${n} ${n === 1 ? "orden" : "órdenes"} a nombre de ${p.clienteNombre}. Esta acción no se puede deshacer.`}
          </p>
          {accion === "rechazar" && (
            <>
              <label className={styles.campo}>
                <span>Motivo del rechazo</span>
                <textarea
                  value={motivo}
                  maxLength={300}
                  aria-invalid={errorMotivo ? true : undefined}
                  aria-describedby={errorMotivo ? "error-motivo" : undefined}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </label>
              {errorMotivo && (
                <p id="error-motivo" className={styles.errorCampo}>
                  {errorMotivo}
                </p>
              )}
            </>
          )}
          <div className={styles.accionesFila}>
            <button
              type="button"
              className={styles.botonPrimario}
              disabled={trabajando}
              onClick={ejecutar}
            >
              {ACCIONES[accion].si}
            </button>
            <button
              type="button"
              className={styles.boton}
              disabled={trabajando}
              onClick={() => {
                setAccion(null);
                setErrorMotivo(null);
              }}
            >
              No
            </button>
          </div>
        </div>
      )}

      <section className={styles.card} aria-labelledby="titulo-ordenes">
        <h2 id="titulo-ordenes" className={styles.subtitulo}>
          Órdenes propuestas
        </h2>
        {p.nota && <p className={styles.texto}>{p.nota}</p>}
        <div
          className={styles.scroll}
          role="region"
          aria-label="Tabla de órdenes propuestas"
          tabIndex={0}
        >
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">Acción</th>
                <th scope="col">Operación</th>
                <th scope="col">Tipo</th>
                <th scope="col" className={styles.num}>
                  Cantidad
                </th>
                <th scope="col" className={styles.num}>
                  Precio
                </th>
              </tr>
            </thead>
            <tbody>
              {p.ordenes.map((o, i) => (
                <tr key={`${o.ticker}-${i}`}>
                  <td>{o.ticker}</td>
                  <td>{etiquetaLado(o.lado)}</td>
                  <td>{etiquetaTipoOrdenPropuesta(o.tipo)}</td>
                  <td className={styles.num}>{o.cantidad}</td>
                  <td className={styles.num}>
                    {o.precioLimite || o.precioStop
                      ? formatCurrency(Number(o.precioLimite ?? o.precioStop))
                      : "Mercado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {p.ordenesIds?.length > 0 && !esCom && (
          <p className={styles.texto}>
            Órdenes creadas:{" "}
            {p.ordenesIds.map((oid, i) => (
              <span key={oid}>
                {i > 0 && ", "}
                <Link to={`/historial/${oid}`}>Ver orden {i + 1}</Link>
              </span>
            ))}
          </p>
        )}
        {p.motivoRechazo && <p className={styles.texto}>Motivo del rechazo: {p.motivoRechazo}</p>}
        <dl className={styles.datos}>
          <div>
            <dt>Creada</dt>
            <dd>{fecha(p.creadaEn)}</dd>
          </div>
          <div>
            <dt>Vence</dt>
            <dd>{fecha(p.venceEn)}</dd>
          </div>
          <div>
            <dt>Última actualización</dt>
            <dd>{fecha(p.actualizadaEn)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="titulo-seguimiento">
        <h2 id="titulo-seguimiento" className={styles.subtitulo}>
          Seguimiento
        </h2>
        <ol className={styles.linea} aria-label="Cambios de estado">
          {p.historial.map((h, i) => {
            const e = etiquetaEstadoPropuesta(h.estado);
            return (
              <li key={`${h.fecha}-${i}`} className={styles.paso}>
                <p className={styles.pasoTitulo}>
                  <span className={`${styles.chip} ${styles[e.tono]}`}>{e.etiqueta}</span>
                  <time dateTime={h.fecha}>{fecha(h.fecha)}</time>
                </p>
                <p className={styles.texto}>
                  {textoActor(h.actor, usuario?.id, esCom)}
                  {h.motivo ? ` · ${h.motivo}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
