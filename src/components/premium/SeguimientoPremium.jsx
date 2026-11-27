import { useEffect, useState } from "react";
import {
  agregarSeguimiento,
  listarSeguimiento,
  quitarSeguimiento,
  reactivarSeguimiento,
} from "../../api/premiumApi.js";
import styles from "../../pages/PremiumPage.module.css";

const condiciones = { SUBE_A: "Sube a", BAJA_A: "Baja a" };
const campos = { ticker: "", condicion: "SUBE_A", precioObjetivo: "" };

function descripcionAlerta(item) {
  const precio = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: item.moneda,
    currencyDisplay: "code",
  }).format(Number(item.precioObjetivo));
  return `${condiciones[item.condicion]} ${precio}`;
}

export default function SeguimientoPremium({ recurso, bloqueado }) {
  const esAlerta = recurso === "alertas";
  const [lista, setLista] = useState(null);
  const [intento, setIntento] = useState(0);
  const [errorCarga, setErrorCarga] = useState("");
  const [valores, setValores] = useState(campos);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    listarSeguimiento(recurso, { signal: controller.signal })
      .then((elementos) => {
        if (!controller.signal.aborted) setLista(elementos);
      })
      .catch((fallo) => {
        if (!controller.signal.aborted) {
          setErrorCarga(fallo.mensajeUsuario ?? "No pudimos cargar la lista.");
        }
      });
    return () => controller.abort();
  }, [recurso, intento]);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setValores((anterior) => ({ ...anterior, [name]: value }));
    setError(null);
  }

  async function actualizar(operacion, confirmacion, alGuardar) {
    setGuardando(true);
    setAviso("");
    setError(null);
    try {
      const elemento = await operacion();
      setLista((actual) =>
        actual.some(({ id }) => id === elemento.id)
          ? actual.map((item) => (item.id === elemento.id ? elemento : item))
          : [...actual, elemento]
      );
      setAviso(confirmacion);
      alGuardar?.();
    } catch (fallo) {
      setError(fallo);
    } finally {
      setGuardando(false);
    }
  }

  function agregar(evento) {
    evento.preventDefault();
    if (guardando || bloqueado) return;
    const ticker = valores.ticker.trim().toUpperCase();
    if (!ticker) {
      setError(new Error("Escribe el símbolo de una acción."));
      return;
    }
    const datos = esAlerta
      ? { ticker, condicion: valores.condicion, precioObjetivo: valores.precioObjetivo }
      : { ticker };
    void actualizar(
      () => agregarSeguimiento(recurso, datos),
      esAlerta ? "Alerta creada." : "Acción agregada a tu watchlist.",
      () => setValores(campos)
    );
  }

  function cambiarEstado(item) {
    const operacion = item.activa ? quitarSeguimiento : reactivarSeguimiento;
    const nombre = esAlerta ? "Alerta" : "Acción";
    void actualizar(
      () => operacion(recurso, item.id),
      `${nombre} ${item.activa ? "eliminada" : "reactivada"}.`
    );
  }

  const titulo = esAlerta ? "Alertas de precio" : "Watchlist";
  const deshabilitado = guardando || bloqueado;
  const detalleError = error?.detalles?.[0]?.problema;

  return (
    <section className={styles.card} aria-labelledby={`titulo-${recurso}`}>
      <h2 id={`titulo-${recurso}`}>{titulo}</h2>
      {errorCarga && (
        <>
          <p className={styles.error} role="alert">
            {errorCarga}
          </p>
          <button
            className={styles.secondary}
            onClick={() => {
              setErrorCarga("");
              setIntento((actual) => actual + 1);
            }}
          >
            Reintentar
          </button>
        </>
      )}
      {!lista && !errorCarga && <p role="status">Cargando {titulo.toLowerCase()}…</p>}
      {lista && (
        <>
          <form
            className={styles.form}
            onSubmit={agregar}
            aria-label={esAlerta ? "Crear alerta" : "Agregar acción"}
          >
            <label className={styles.field}>
              Símbolo de la acción
              <input
                name="ticker"
                value={valores.ticker}
                onChange={cambiar}
                placeholder="AAPL"
                maxLength={20}
                autoCapitalize="characters"
                autoComplete="off"
                required
                disabled={deshabilitado}
              />
            </label>
            {esAlerta && (
              <div className={styles.fields}>
                <label className={styles.field}>
                  Condición
                  <select
                    name="condicion"
                    value={valores.condicion}
                    onChange={cambiar}
                    disabled={deshabilitado}
                  >
                    {Object.entries(condiciones).map(([id, texto]) => (
                      <option key={id} value={id}>
                        {texto}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Precio objetivo
                  <input
                    name="precioObjetivo"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={valores.precioObjetivo}
                    onChange={cambiar}
                    required
                    disabled={deshabilitado}
                  />
                </label>
              </div>
            )}
            <button className={styles.primary} disabled={deshabilitado}>
              {guardando ? "Guardando…" : esAlerta ? "Crear alerta" : "Agregar acción"}
            </button>
          </form>
          {error && (
            <p className={styles.error} role="alert">
              {detalleError ?? error.mensajeUsuario ?? error.message}
            </p>
          )}
          {aviso && (
            <p className={styles.notice} role="status">
              {aviso}
            </p>
          )}
          {lista.length ? (
            <ul className={styles.list}>
              {lista.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.ticker}</strong>
                    {esAlerta && <span>{descripcionAlerta(item)}</span>}
                    <span>{item.activa ? "Activa" : "Eliminada"}</span>
                  </div>
                  <button
                    className={styles.secondary}
                    disabled={deshabilitado}
                    aria-label={`${item.activa ? "Eliminar" : "Reactivar"} ${item.ticker}${esAlerta ? ` · ${descripcionAlerta(item)}` : ""}`}
                    onClick={() => cambiarEstado(item)}
                  >
                    {item.activa ? "Eliminar" : "Reactivar"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>{esAlerta ? "Todavía no tienes alertas de precio." : "Tu watchlist está vacía."}</p>
          )}
        </>
      )}
    </section>
  );
}
