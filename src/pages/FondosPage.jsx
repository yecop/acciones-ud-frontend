import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { depositar, listarMovimientos, retirar } from "../api/fondosApi.js";
import { nuevoUuid } from "../api/httpClient.js";
import { obtenerSaldo } from "../api/portafolioApi.js";
import { formatCurrency } from "../components/portafolio/portafolioUtils.js";
import SaldoWidget from "../components/portafolio/SaldoWidget.jsx";
import Paginacion from "../components/ui/Paginacion.jsx";
import { rutaDeNavegacion } from "../routes/routesConfig.js";
import styles from "./FondosPage.module.css";

const TAMANO = 10;
const LIMITE_MONTO = 1_000_000;
const TIPOS = {
  DEPOSITO: "Depósito",
  RETIRO: "Retiro",
  RESERVA: "Reserva",
  LIBERACION: "Liberación",
  LIQUIDACION: "Liquidación",
};
const ESTADOS = {
  COMPLETADO: "Completado",
  PENDIENTE: "Pendiente",
  FALLIDO: "Fallido",
  CANCELADO: "Cancelado",
};
const fechaLocal = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function montoNormalizado(valor) {
  const texto = valor.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const monto = Number(texto);
  return monto > 0 && monto <= LIMITE_MONTO ? monto.toFixed(2) : null;
}

function mensajeDe(error, alternativa) {
  return error?.mensajeUsuario ?? alternativa;
}

function HistorialFondos({ consulta, onCambiar }) {
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const { pagina } = consulta;
    const controller = new AbortController();
    listarMovimientos({ pagina, tamano: TAMANO }, { signal: controller.signal })
      .then((datos) => {
        if (!Array.isArray(datos?.contenido)) throw new Error("Historial inválido.");
        if (!controller.signal.aborted) setResultado({ consulta, datos });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResultado({ consulta, error: mensajeDe(error, "No pudimos consultar el historial.") });
        }
      });
    return () => controller.abort();
  }, [consulta]);

  const actual = resultado?.consulta === consulta ? resultado : null;
  const datos = actual?.datos;
  return (
    <section className={styles.card} aria-labelledby="movimientos-titulo">
      <h2 id="movimientos-titulo">Historial de movimientos</h2>
      {!actual && <p role="status">Cargando movimientos…</p>}
      {actual?.error && (
        <>
          <p className={styles.error} role="alert">
            {actual.error}
          </p>
          <button
            className={styles.secondary}
            type="button"
            onClick={() => onCambiar(consulta.pagina)}
          >
            Reintentar historial
          </button>
        </>
      )}
      {datos && (
        <>
          {datos.contenido.length === 0 ? (
            <p>Todavía no tienes movimientos.</p>
          ) : (
            <ul className={styles.movimientos}>
              {datos.contenido.map((movimiento) => {
                const fecha = new Date(movimiento.creadoEn);
                const importe =
                  movimiento.moneda === "USD"
                    ? formatCurrency(movimiento.monto)
                    : new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: movimiento.moneda,
                      }).format(Number(movimiento.monto));
                return (
                  <li className={styles.movimiento} key={movimiento.id}>
                    <div>
                      <strong>{TIPOS[movimiento.tipo] ?? movimiento.tipo}</strong>
                      <time dateTime={movimiento.creadoEn}>{fechaLocal.format(fecha)}</time>
                    </div>
                    <div className={styles.detalle}>
                      <strong>{importe}</strong>
                      <span className={styles.estado}>
                        {ESTADOS[movimiento.estado] ?? movimiento.estado}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Paginacion
            pagina={consulta.pagina + 1}
            totalPaginas={datos.totalPaginas}
            totalElementos={datos.totalElementos}
            unidad="movimientos"
            onCambiar={(pagina) => onCambiar(pagina - 1)}
          />
        </>
      )}
    </section>
  );
}

export default function FondosPage() {
  const [saldo, setSaldo] = useState(null);
  const [errorSaldo, setErrorSaldo] = useState("");
  const [intentoSaldo, setIntentoSaldo] = useState(0);
  const [consulta, setConsulta] = useState({ pagina: 0 });
  const [tipo, setTipo] = useState("DEPOSITO");
  const [importe, setImporte] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorMonto, setErrorMonto] = useState("");
  const [errorOperacion, setErrorOperacion] = useState("");
  const [exito, setExito] = useState("");
  const campoMonto = useRef(null);
  const enCurso = useRef(false);
  const intencion = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    obtenerSaldo({ signal: controller.signal })
      .then((datos) => {
        if (!datos) throw new Error("Saldo inválido.");
        if (!controller.signal.aborted) setSaldo(datos);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setErrorSaldo(mensajeDe(error, "No pudimos consultar el saldo."));
        }
      });
    return () => controller.abort();
  }, [intentoSaldo]);

  function limpiarMensajes() {
    setErrorMonto("");
    setErrorOperacion("");
    setExito("");
  }

  function invalidarMonto(mensaje) {
    setErrorMonto(mensaje);
    campoMonto.current?.focus();
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (!saldo || enCurso.current) return;
    limpiarMensajes();
    const monto = montoNormalizado(importe);
    if (!monto) {
      invalidarMonto(
        "Ingresa un monto mayor que cero y hasta USD 1.000.000, con máximo dos decimales."
      );
      return;
    }
    if (tipo === "RETIRO" && Number(monto) > Number(saldo.disponible)) {
      invalidarMonto("El monto del retiro supera tu saldo disponible.");
      return;
    }

    const firma = `${tipo}:${monto}`;
    if (intencion.current?.firma !== firma) {
      intencion.current = { firma, clave: nuevoUuid() };
    }
    const operacion = tipo === "DEPOSITO" ? depositar : retirar;
    enCurso.current = true;
    setGuardando(true);
    try {
      const resultado = await operacion(monto, { idempotencyKey: intencion.current.clave });
      if (!resultado?.saldo || !resultado.movimiento) throw new Error("Resultado inválido.");
      setSaldo(resultado.saldo);
      setConsulta({ pagina: 0 });
      intencion.current = null;
      setImporte("");
      setExito(`${TIPOS[tipo]} de ${formatCurrency(monto)} completado.`);
    } catch (error) {
      if (error.codigo === "FONDOS_INSUFICIENTES") {
        setErrorMonto("El monto del retiro supera tu saldo disponible.");
        setSaldo(null);
        setConsulta({ pagina: 0 });
        setIntentoSaldo((i) => i + 1);
        intencion.current = null;
      } else {
        const detalle = error.problemaDeCampo?.("monto");
        if (detalle) setErrorMonto(detalle);
        else
          setErrorOperacion(
            mensajeDe(error, "No pudimos confirmar el movimiento. Reintenta con el mismo monto.")
          );
        if ([400, 409].includes(error.status)) intencion.current = null;
      }
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }

  return (
    <div className={styles.main}>
      <header>
        <Link className={styles.volver} to={rutaDeNavegacion("portafolio")}>
          Volver al portafolio
        </Link>
        <h1>Depósitos y retiros</h1>
        <p>Gestiona los fondos simulados de tu cuenta en USD.</p>
      </header>

      <div className={styles.columns}>
        <div className={styles.saldo}>
          <SaldoWidget saldo={saldo} error={errorSaldo} loading={!saldo && !errorSaldo} />
          {errorSaldo && (
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                setErrorSaldo("");
                setIntentoSaldo((i) => i + 1);
              }}
            >
              Reintentar saldo
            </button>
          )}
        </div>
        <section className={styles.card} aria-labelledby="operaciones-titulo">
          <h2 id="operaciones-titulo">Mover fondos</h2>
          <form noValidate onSubmit={enviar} aria-labelledby="operaciones-titulo">
            <fieldset className={styles.form} disabled={guardando}>
              <legend>Tipo de movimiento</legend>
              <div className={styles.opciones}>
                {["DEPOSITO", "RETIRO"].map((opcion) => (
                  <label key={opcion} className={styles.opcion}>
                    <input
                      type="radio"
                      name="tipo"
                      value={opcion}
                      checked={tipo === opcion}
                      onChange={() => {
                        setTipo(opcion);
                        limpiarMensajes();
                      }}
                    />
                    {TIPOS[opcion]}
                  </label>
                ))}
              </div>
              <label className={styles.campo}>
                Monto (USD)
                <input
                  ref={campoMonto}
                  name="monto"
                  inputMode="decimal"
                  autoComplete="off"
                  required
                  value={importe}
                  placeholder="50,00"
                  aria-invalid={Boolean(errorMonto)}
                  aria-describedby={errorMonto ? "monto-ayuda monto-error" : "monto-ayuda"}
                  onChange={(evento) => {
                    setImporte(evento.target.value);
                    limpiarMensajes();
                  }}
                />
              </label>
              <p id="monto-ayuda" className={styles.ayuda}>
                Usa una coma o un punto para los decimales, sin separadores de miles.
              </p>
              {errorMonto && (
                <p id="monto-error" className={styles.error} role="alert">
                  {errorMonto}
                </p>
              )}
              <button
                className={styles.primary}
                disabled={!saldo || Boolean(errorSaldo) || guardando}
              >
                {guardando
                  ? "Procesando…"
                  : tipo === "DEPOSITO"
                    ? "Confirmar depósito"
                    : "Confirmar retiro"}
              </button>
            </fieldset>
            {errorOperacion && (
              <p className={styles.error} role="alert">
                {errorOperacion}
              </p>
            )}
            {exito && (
              <p className={styles.exito} role="status">
                {exito}
              </p>
            )}
          </form>
        </section>
      </div>
      <HistorialFondos consulta={consulta} onCambiar={(pagina) => setConsulta({ pagina })} />
    </div>
  );
}
