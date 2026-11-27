import { useEffect, useRef, useState } from "react";
import {
  cancelarSuscripcion,
  iniciarPago,
  listarPlanes,
  obtenerSuscripcion,
} from "../api/premiumApi.js";
import { USE_MOCK } from "../config/env.js";
import SeguimientoPremium from "../components/premium/SeguimientoPremium.jsx";
import styles from "./PremiumPage.module.css";

const tarjetasPrueba = [
  { id: "APROBADO", nombre: "Tarjeta terminada en 4242 · pago aprobado" },
  { id: "RECHAZADO", nombre: "Tarjeta terminada en 0002 · pago rechazado" },
];

function precioPlan(plan) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: plan.moneda,
    currencyDisplay: "code",
  }).format(Number(plan.precio));
}

export default function PremiumPage() {
  const [datos, setDatos] = useState(null);
  const [intento, setIntento] = useState(0);
  const [errorCarga, setErrorCarga] = useState("");
  const [planElegido, setPlanElegido] = useState(null);
  const [tarjeta, setTarjeta] = useState("APROBADO");
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState("");
  const [aviso, setAviso] = useState("");
  const tituloSuscripcion = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const opciones = { signal: controller.signal };
    Promise.all([listarPlanes(opciones), obtenerSuscripcion(opciones)])
      .then(([planes, suscripcion]) => {
        if (!controller.signal.aborted) setDatos({ planes, suscripcion });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setErrorCarga(error.mensajeUsuario ?? "No pudimos consultar los planes.");
        }
      });
    return () => controller.abort();
  }, [intento]);

  function reintentar() {
    setErrorCarga("");
    setIntento((actual) => actual + 1);
  }

  function elegirPlan(plan) {
    setErrorOperacion("");
    setAviso("");
    setTarjeta("APROBADO");
    setPlanElegido(plan);
  }

  async function actualizarSuscripcion(operacion, confirmacion) {
    setGuardando(true);
    setErrorOperacion("");
    setAviso("");
    try {
      const suscripcion = await operacion();
      if (suscripcion) {
        setDatos((actual) => ({ ...actual, suscripcion }));
        setPlanElegido(null);
        setConfirmarCancelacion(false);
        setAviso(confirmacion);
      }
    } catch (error) {
      setErrorOperacion(
        error.mensajeUsuario ?? error.message ?? "No pudimos completar la operación."
      );
    } finally {
      setGuardando(false);
    }
  }

  function pagar(evento) {
    evento.preventDefault();
    if (!planElegido || guardando) return;
    void actualizarSuscripcion(async () => {
      const resultado = await iniciarPago({
        planId: planElegido.id,
        ...(USE_MOCK ? { escenarioPrueba: tarjeta } : {}),
      });
      if (USE_MOCK && resultado?.suscripcion?.estado === "ACTIVA") return resultado.suscripcion;

      // En modo API, el proveedor confirma el pago. Al regresar, la página consulta la suscripción.
      const destino = URL.canParse(resultado?.urlPago) ? new URL(resultado.urlPago) : null;
      if (!USE_MOCK && destino?.origin === "https://checkout.stripe.com") {
        window.location.assign(destino.href);
        return null;
      }
      throw new Error("El servicio de pagos no devolvió una sesión válida.");
    }, "Pago de prueba aprobado. Tu suscripción Premium está activa.");
  }

  const activa = datos?.suscripcion.estado === "ACTIVA";
  const planActual = datos?.planes.find(({ id }) => id === datos.suscripcion.planId);
  const estado = activa
    ? "Premium activo"
    : datos?.suscripcion.estado === "CANCELADA"
      ? "Suscripción cancelada"
      : "Plan básico";

  return (
    <div className={styles.main}>
      <header className={styles.hero}>
        <h1>Premium</h1>
        <p>Sigue tus acciones favoritas y configura alertas por precio.</p>
        {datos && <span className={styles.badge}>{estado}</span>}
      </header>

      {errorCarga && (
        <section className={styles.card}>
          <p role="alert" className={styles.error}>
            {errorCarga}
          </p>
          <button className={styles.secondary} onClick={reintentar}>
            Reintentar
          </button>
        </section>
      )}
      {!datos && !errorCarga && <p role="status">Cargando planes y suscripción…</p>}
      {datos && (
        <>
          <section aria-labelledby="suscripcion" className={styles.card}>
            <h2 id="suscripcion" ref={tituloSuscripcion} tabIndex={-1}>
              {activa ? "Tu suscripción" : "Planes Premium"}
            </h2>
            {aviso && (
              <p className={styles.notice} role="status">
                {aviso}
              </p>
            )}
            {errorOperacion && (
              <p className={styles.error} role="alert">
                {errorOperacion}
              </p>
            )}
            {activa ? (
              <>
                <p>
                  {planActual?.nombre ?? "Premium"}
                  {planActual && ` · ${precioPlan(planActual)} por ${planActual.periodo}`}
                </p>
                {confirmarCancelacion ? (
                  <div className={styles.confirmation}>
                    <p>Perderás el acceso a la watchlist y las alertas al cancelar.</p>
                    <div className={styles.actions}>
                      <button
                        className={styles.danger}
                        disabled={guardando}
                        onClick={() =>
                          void actualizarSuscripcion(
                            cancelarSuscripcion,
                            "Tu suscripción se canceló. Puedes volver a activarla cuando quieras."
                          )
                        }
                      >
                        {guardando ? "Cancelando…" : "Confirmar cancelación"}
                      </button>
                      <button
                        className={styles.secondary}
                        disabled={guardando}
                        onClick={() => {
                          setConfirmarCancelacion(false);
                          setErrorOperacion("");
                        }}
                      >
                        Mantener suscripción
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.secondary}
                    onClick={() => setConfirmarCancelacion(true)}
                  >
                    Cancelar suscripción
                  </button>
                )}
              </>
            ) : (
              <>
                {datos.planes.length ? (
                  <div className={styles.grid}>
                    {datos.planes.map((plan) => (
                      <article key={plan.id} className={styles.plan}>
                        <h3>{plan.nombre}</h3>
                        <p>
                          <strong>{precioPlan(plan)}</strong> <span>/ {plan.periodo}</span>
                        </p>
                        <button
                          className={styles.primary}
                          disabled={guardando}
                          aria-expanded={planElegido?.id === plan.id}
                          onClick={() => elegirPlan(plan)}
                        >
                          Elegir {plan.nombre}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No hay planes disponibles en este momento.</p>
                )}
                {planElegido && (
                  <form
                    onSubmit={pagar}
                    className={styles.confirmation}
                    aria-label="Confirmar suscripción"
                  >
                    <h3>{USE_MOCK ? "Pago de prueba" : "Confirmar suscripción"}</h3>
                    <p>
                      {planElegido.nombre} · {precioPlan(planElegido)} por {planElegido.periodo}
                    </p>
                    {USE_MOCK && (
                      <label className={styles.field}>
                        Tarjeta de prueba
                        <select
                          value={tarjeta}
                          onChange={(e) => setTarjeta(e.target.value)}
                          disabled={guardando}
                        >
                          {tarjetasPrueba.map(({ id, nombre }) => (
                            <option key={id} value={id}>
                              {nombre}
                            </option>
                          ))}
                        </select>
                        <span>El pago es simulado y no genera cobros.</span>
                      </label>
                    )}
                    <div className={styles.actions}>
                      <button className={styles.primary} disabled={guardando}>
                        {guardando
                          ? "Procesando…"
                          : USE_MOCK
                            ? "Confirmar pago de prueba"
                            : "Continuar al pago"}
                      </button>
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={guardando}
                        onClick={() => elegirPlan(null)}
                      >
                        Volver a los planes
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>

          {activa ? (
            <div className={styles.grid}>
              <SeguimientoPremium recurso="watchlist" bloqueado={guardando} />
              <SeguimientoPremium recurso="alertas" bloqueado={guardando} />
            </div>
          ) : (
            <section className={styles.card} aria-labelledby="seguimiento-premium">
              <h2 id="seguimiento-premium">Watchlist y alertas</h2>
              <p>
                Elige un plan Premium para guardar tus acciones favoritas y crear alertas de precio.
              </p>
              <button
                className={styles.secondary}
                onClick={() => tituloSuscripcion.current?.focus()}
              >
                Ver planes
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
