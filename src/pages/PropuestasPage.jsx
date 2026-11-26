import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "../components/comisionista/comisionista.module.css";
import EstadoCarga from "../components/comisionista/EstadoCarga.jsx";
import {
  etiquetaEstadoPropuesta,
  OPCIONES_ESTADO_PROPUESTA,
  textoVencimiento,
} from "../components/comisionista/estadosPropuesta.js";
import Paginacion from "../components/ui/Paginacion.jsx";
import { listarPropuestas } from "../api/propuestasApi.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ROLES } from "../auth/roles.js";
import { useCarga } from "../hooks/useCarga.js";

const TAMANO = 10;
const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

/** Lista de propuestas; muestra las acciones de cada rol (COM crea, INV decide). SCRUM-65. */
export default function PropuestasPage() {
  const { rol } = useAuth();
  const esCom = rol === ROLES.COM;
  const [params, setParams] = useSearchParams();
  const estado = OPCIONES_ESTADO_PROPUESTA.some((o) => o.valor === params.get("estado"))
    ? params.get("estado")
    : "";
  const paginaUrl = Number.parseInt(params.get("pagina") ?? "1", 10);
  const pagina = Number.isInteger(paginaUrl) && paginaUrl > 0 ? paginaUrl : 1;

  const cargar = useCallback(
    ({ signal }) =>
      listarPropuestas(
        { ...(estado ? { estado } : {}), pagina: pagina - 1, tamano: TAMANO },
        { signal }
      ),
    [estado, pagina]
  );
  const carga = useCarga(cargar, { intervaloMs: 30_000 });
  const lista = carga.datos?.contenido ?? [];

  const cambiar = (cambios) => {
    const siguiente = { estado, pagina: 1, ...cambios };
    const q = new URLSearchParams();
    if (siguiente.estado) q.set("estado", siguiente.estado);
    if (siguiente.pagina > 1) q.set("pagina", String(siguiente.pagina));
    setParams(q);
  };

  return (
    <div className={styles.main}>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>Propuestas</h1>
          <p className={styles.texto}>
            {esCom
              ? "Propuestas que enviaste a tus clientes. Cuando el cliente aprueba, tú firmas."
              : "Propuestas de tu comisionista. Tú decides: apruebas o rechazas."}
          </p>
        </div>
        {esCom ? (
          <Link className={styles.botonPrimario} to="/propuestas/nueva">
            Nueva propuesta
          </Link>
        ) : (
          <Link className={styles.boton} to="/mi-comisionista">
            Mi comisionista
          </Link>
        )}
      </div>

      <div className={styles.filtros}>
        <label className={styles.campo}>
          <span>Estado</span>
          <select value={estado} onChange={(e) => cambiar({ estado: e.target.value })}>
            <option value="">Todos</option>
            {OPCIONES_ESTADO_PROPUESTA.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <EstadoCarga {...carga} onReintentar={carga.recargar} recurso="las propuestas" />

      {carga.datos && lista.length === 0 && (
        <p className={styles.vacio}>
          {estado
            ? "Ninguna propuesta coincide con ese estado."
            : esCom
              ? "Todavía no has enviado propuestas."
              : "Tu comisionista todavía no te ha enviado propuestas."}
        </p>
      )}

      {lista.length > 0 && (
        <ul className={styles.lista} aria-label="Lista de propuestas">
          {lista.map((p) => {
            const e = etiquetaEstadoPropuesta(p.estado);
            const vence = textoVencimiento(p);
            return (
              <li key={p.id} className={styles.fila}>
                <div className={styles.filaCuerpo}>
                  <p className={styles.filaTitulo}>{p.titulo}</p>
                  <p className={styles.texto}>
                    {esCom ? `Cliente: ${p.clienteNombre}` : `De ${p.comisionistaNombre}`} ·{" "}
                    {p.ordenes.length} {p.ordenes.length === 1 ? "orden" : "órdenes"} · Creada{" "}
                    {fecha.format(new Date(p.creadaEn))}
                  </p>
                  {vence && <p className={styles.texto}>{vence}</p>}
                </div>
                <span className={`${styles.chip} ${styles[e.tono]}`}>{e.etiqueta}</span>
                <Link
                  className={styles.boton}
                  to={`/propuestas/${p.id}`}
                  aria-label={`Ver propuesta: ${p.titulo}`}
                >
                  Ver
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Paginacion
        pagina={pagina}
        totalPaginas={carga.datos?.totalPaginas ?? 0}
        totalElementos={carga.datos?.totalElementos}
        unidad="propuestas"
        onCambiar={(n) => cambiar({ pagina: n })}
      />
    </div>
  );
}
