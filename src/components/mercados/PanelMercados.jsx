import { useEffect, useState } from "react";
import { useMercadosDashboard } from "../../hooks/useMercadosDashboard.js";
import {
  esCierreDiario,
  evaluarFrescura,
  esDeInteres,
  formatearEdad,
  edadEnSegundos,
  ordenarAcciones,
  ordenarMercados,
} from "../../mercados/reglas.js";
import { formatCurrency, formatPercent, toneFromValue } from "../portafolio/portafolioUtils.js";
import styles from "./PanelMercados.module.css";

const ETIQUETA_CIERRE_DIARIO = "Cierre diario";
const ETIQUETA_SIMULADA = "Ejecución simulada";
const AYUDA_CIERRE_DIARIO =
  "El precio es el del cierre diario del mercado, no una cotización en vivo.";
const AYUDA_SIMULADA =
  "Las órdenes en este mercado se ejecutan de forma simulada, no contra el mercado real.";

/** Reloj que se actualiza solo, para que "hace 12 s" y la advertencia de dato antiguo avancen. */
function useAhora(intervaloMs = 15000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

/** "lun 09:30 GMT-5", en la zona horaria del mercado. */
function formatearInstante(iso, zonaHoraria) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("es-CO", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: zonaHoraria,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString("es-CO");
  }
}

/** ¿El error indica que el proveedor de datos (o la conexión) no respondió? */
function esFalloDeProveedor(error) {
  return (
    error?.codigo === "PROVEEDOR_NO_DISPONIBLE" ||
    error?.codigo === "TIEMPO_AGOTADO" ||
    error?.status === 502 ||
    error?.status === 504 ||
    error?.status === 0
  );
}

function EstadoMercado({ mercado }) {
  const estado = mercado.estado;
  if (!estado) {
    return (
      <span className={`${styles.estado} ${styles.estadoDesconocido}`}>Estado desconocido</span>
    );
  }
  const proximo = estado.abierto
    ? `Cierra ${formatearInstante(estado.proximoCierre, mercado.zonaHoraria) ?? "—"}`
    : `Abre ${formatearInstante(estado.proximaApertura, mercado.zonaHoraria) ?? "—"}`;
  return (
    <>
      <span
        className={`${styles.estado} ${estado.abierto ? styles.estadoAbierto : styles.estadoCerrado}`}
      >
        {estado.abierto ? "Abierto" : "Cerrado"}
      </span>
      <span className={styles.proximo}>{proximo}</span>
    </>
  );
}

function CeldaCotizacion({ etiqueta, children, className = "" }) {
  return (
    <td data-label={etiqueta} className={`${styles.celda} ${className}`}>
      {children}
    </td>
  );
}

function FilaAccion({ accion, mercado, cotizacion, intereses, ahora, onTrade }) {
  const deInteres = esDeInteres(accion, intereses);
  const abierto = mercado.estado?.abierto;
  const datos = cotizacion?.datos;
  const falla = cotizacion?.error;
  const frescura = datos
    ? evaluarFrescura({
        codigoMercado: mercado.codigo,
        abierto,
        actualizadoEn: datos.actualizadoEn,
        ahora,
      })
    : null;

  return (
    <tr className={styles.fila} data-ticker={accion.ticker}>
      <th scope="row" className={styles.accion}>
        <span className={styles.ticker}>{accion.ticker}</span>
        <span className={styles.nombre}>{accion.nombre}</span>
        {deInteres && <span className={styles.interes}>★ De tu interés</span>}
      </th>

      {datos ? (
        <>
          <CeldaCotizacion etiqueta="Último precio" className={styles.precio}>
            {formatCurrency(datos.precio)}
          </CeldaCotizacion>
          <CeldaCotizacion etiqueta="Bid" className={styles.secundaria}>
            {formatCurrency(datos.bid)}
          </CeldaCotizacion>
          <CeldaCotizacion etiqueta="Ask" className={styles.secundaria}>
            {formatCurrency(datos.ask)}
          </CeldaCotizacion>
          <CeldaCotizacion etiqueta="Spread" className={styles.secundaria}>
            {formatCurrency(datos.spread)}
          </CeldaCotizacion>
          <CeldaCotizacion
            etiqueta="Variación"
            className={`${styles.variacion} ${styles[toneFromValue(datos.variacionPorcentaje)]}`}
          >
            {formatPercent(datos.variacionPorcentaje)}
          </CeldaCotizacion>
          <CeldaCotizacion etiqueta="Actualizado" className={styles.edad}>
            <span>
              {frescura.ultimoCierre ? "Último cierre · " : ""}
              {frescura.texto}
            </span>
            {frescura.antiguo && (
              <span className={styles.antiguo} role="status">
                ⚠ Dato antiguo
              </span>
            )}
          </CeldaCotizacion>
        </>
      ) : (
        <td colSpan={6} className={`${styles.celda} ${styles.sinCotizacion}`}>
          {falla
            ? esFalloDeProveedor(falla)
              ? "Cotización no disponible: el proveedor no responde."
              : "Cotización no disponible."
            : "Cargando cotización…"}
        </td>
      )}

      <td className={`${styles.celda} ${styles.operar}`}>
        <button
          type="button"
          className={styles.botonOperar}
          onClick={() => onTrade?.(accion.ticker)}
          aria-label={`Operar ${accion.ticker}`}
        >
          Operar
        </button>
      </td>
    </tr>
  );
}

function GrupoMercado({ mercado, acciones, cotizaciones, intereses, ahora, onTrade }) {
  const cierreDiario = esCierreDiario(mercado.codigo);
  const ordenadas = ordenarAcciones(acciones, intereses);
  const idTitulo = `mercado-${mercado.codigo}`;

  return (
    <section className={styles.grupo} aria-labelledby={idTitulo}>
      <header className={styles.grupoCabecera}>
        <h3 id={idTitulo} className={styles.grupoTitulo}>
          {mercado.nombre} <span className={styles.codigo}>({mercado.codigo})</span>
        </h3>
        <div className={styles.chips}>
          <EstadoMercado mercado={mercado} />
          {cierreDiario && (
            <>
              <span className={styles.etiqueta} title={AYUDA_CIERRE_DIARIO}>
                {ETIQUETA_CIERRE_DIARIO}
              </span>
              <span className={styles.etiqueta} title={AYUDA_SIMULADA}>
                {ETIQUETA_SIMULADA}
              </span>
            </>
          )}
        </div>
      </header>

      {mercado.estadoError && (
        <p className={styles.aviso} role="alert">
          No pudimos consultar el estado de este mercado. {mercado.estadoError.message}
        </p>
      )}

      {mercado.accionesError ? (
        <p className={styles.aviso} role="alert">
          No pudimos cargar las acciones de este mercado. {mercado.accionesError.message}
        </p>
      ) : ordenadas.length === 0 ? (
        <p className={styles.vacio}>No hay acciones disponibles en este mercado.</p>
      ) : (
        <table className={styles.tabla}>
          <caption className={styles.soloLectores}>Acciones de {mercado.nombre}</caption>
          <thead>
            <tr>
              <th scope="col">Acción</th>
              <th scope="col">Último precio</th>
              <th scope="col">Bid</th>
              <th scope="col">Ask</th>
              <th scope="col">Spread</th>
              <th scope="col">Variación</th>
              <th scope="col">Actualizado</th>
              <th scope="col">
                <span className={styles.soloLectores}>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((accion) => (
              <FilaAccion
                key={accion.ticker}
                accion={accion}
                mercado={mercado}
                cotizacion={cotizaciones[accion.ticker]}
                intereses={intereses}
                ahora={ahora}
                onTrade={onTrade}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/**
 * Dashboard de mercados y acciones (SCRUM-30): estado de cada mercado, acciones por mercado
 * con su cotización (último precio, bid, ask, spread) y su antigüedad. Las acciones de los
 * intereses del usuario van primero. LSE, TSE y ASX se marcan como «cierre diario» y
 * «ejecución simulada». Si el proveedor falla, se dice con claridad y se conserva lo cargado.
 *
 * @param {object} props
 * @param {number} [props.intervaloMs] cada cuánto se refresca (por defecto 30 s).
 * @param {function} [props.onTrade] recibe el ticker al pulsar «Operar».
 */
export default function PanelMercados({ intervaloMs = 30000, onTrade }) {
  const datos = useMercadosDashboard({ intervaloMs });
  const ahora = useAhora();
  const { cargando, error, mercados, acciones, cotizaciones, intereses, actualizadoEn } = datos;

  const tickers = Object.values(acciones).flatMap((lista) => lista.map((a) => a.ticker));
  const resultados = tickers.map((t) => cotizaciones[t]).filter(Boolean);
  const proveedorCaido =
    tickers.length > 0 &&
    resultados.length === tickers.length &&
    resultados.every((r) => r.error && esFalloDeProveedor(r.error));

  const hayDatos = mercados.length > 0;
  const edadActualizacion = actualizadoEn
    ? formatearEdad(edadEnSegundos(new Date(actualizadoEn).toISOString(), ahora))
    : null;

  return (
    <section className={styles.panel} aria-busy={cargando} aria-labelledby="panel-mercados-titulo">
      <header className={styles.cabecera}>
        <div>
          <h2 id="panel-mercados-titulo" className={styles.titulo}>
            Mercados y acciones
          </h2>
          {edadActualizacion && (
            <p className={styles.subtitulo}>
              Actualizado {edadActualizacion} · se refresca solo cada{" "}
              {Math.round(intervaloMs / 1000)} s
            </p>
          )}
        </div>
        <button
          type="button"
          className={styles.refrescar}
          onClick={datos.refrescar}
          disabled={cargando}
        >
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          <p>
            No pudimos cargar los mercados. {error.message}
            {hayDatos && " Mostramos los últimos datos que tenemos."}
          </p>
          <button type="button" className={styles.reintentar} onClick={datos.refrescar}>
            Reintentar
          </button>
        </div>
      )}

      {proveedorCaido && (
        <div className={styles.error} role="alert">
          <p>
            El proveedor de datos de mercado no está disponible. Las acciones se muestran sin
            cotización y volveremos a intentarlo automáticamente.
          </p>
          <button type="button" className={styles.reintentar} onClick={datos.refrescar}>
            Reintentar
          </button>
        </div>
      )}

      {cargando && !hayDatos && !error && (
        <p className={styles.cargando} role="status">
          Consultando mercados…
        </p>
      )}

      {ordenarMercados(mercados, intereses).map((mercado) => (
        <GrupoMercado
          key={mercado.codigo}
          mercado={mercado}
          acciones={acciones[mercado.codigo] ?? []}
          cotizaciones={cotizaciones}
          intereses={intereses}
          ahora={ahora}
          onTrade={onTrade}
        />
      ))}

      {hayDatos && (
        <p className={styles.nota}>
          LSE, TSE y ASX muestran el cierre diario y sus órdenes se ejecutan de forma simulada. Un
          dato se marca como antiguo cuando el mercado está abierto y la cotización no se ha
          actualizado a tiempo.
        </p>
      )}
    </section>
  );
}
