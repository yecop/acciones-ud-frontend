import { useEffect, useState } from "react";
import { formatearTiempo } from "../../utils/tiempo.js";
import styles from "./VerificationForm.module.css";
import OtpInput from "./OtpInput.jsx";

/**
 * Formulario de verificación OTP (segundo factor).
 *
 * Es presentacional: los tiempos llegan ya calculados (`venceEnSegundos`,
 * `esperaReenvioSegundos`, `bloqueadoSegundos`) y las decisiones las toma la página.
 *
 * @param {object} props
 * @param {string} [props.step]
 * @param {string} [props.title]
 * @param {string} [props.destino]          A dónde se envió el código («tu correo electrónico»).
 * @param {number} [props.codeLength]
 * @param {number|null} [props.venceEnSegundos] Segundos de vigencia restantes; null oculta el dato.
 * @param {boolean} [props.expirado]        El código venció: no se puede verificar, sí reenviar.
 * @param {number} [props.esperaReenvioSegundos] Espera restante para pedir otro código.
 * @param {number} [props.bloqueadoSegundos]    Bloqueo por intentos excedidos (429).
 * @param {string|null} [props.error]
 * @param {string|null} [props.info]        Aviso positivo (p. ej. «te enviamos un código nuevo»).
 * @param {boolean} [props.loading]
 * @param {boolean} [props.reenviando]
 * @param {boolean} [props.sinReto]         No hay código vigente que verificar (hay que volver).
 * @param {number} [props.resetKey]         Al cambiar, limpia el código y devuelve el foco.
 * @param {function} props.onVerify         Recibe `{ code }`.
 * @param {function} props.onResend
 * @param {function} [props.onBack]         Volver a las credenciales.
 * @param {function} [props.onEdit]         Se llama cuando la persona modifica el código.
 */
export default function VerificationForm({
  step = "Paso 2 de 2 · Verificación",
  title = "Ingresa tu código",
  destino = "tu correo electrónico",
  codeLength = 6,
  venceEnSegundos = null,
  expirado = false,
  esperaReenvioSegundos = 0,
  bloqueadoSegundos = 0,
  error = null,
  info = null,
  loading = false,
  reenviando = false,
  sinReto = false,
  resetKey = 0,
  onVerify,
  onResend,
  onBack,
  onEdit,
}) {
  const [code, setCode] = useState(Array(codeLength).fill(""));

  // Tras un código inválido la página cambia `resetKey`: se limpia el campo.
  useEffect(() => {
    setCode(Array(codeLength).fill(""));
  }, [resetKey, codeLength]);

  const bloqueado = bloqueadoSegundos > 0;
  const completo = code.every((digit) => digit !== "");
  const puedeVerificar = completo && !loading && !expirado && !bloqueado && !sinReto;
  const puedeReenviar = esperaReenvioSegundos === 0 && !reenviando && !sinReto;

  const cambiarCodigo = (nuevo) => {
    setCode(nuevo);
    onEdit?.();
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.card}>
        <p className={styles.step}>{step}</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>
          Enviamos un código de {codeLength} dígitos a {destino}.
          {venceEnSegundos !== null &&
            !expirado &&
            ` Vence en ${formatearTiempo(venceEnSegundos)}.`}
        </p>

        <OtpInput
          length={codeLength}
          value={code}
          onChange={cambiarCodigo}
          autoFocus
          resetKey={resetKey}
          disabled={bloqueado || sinReto}
          invalid={Boolean(error)}
        />

        {expirado && !error && (
          <p className={styles.error} role="alert">
            El código venció. Solicita uno nuevo.
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {info && (
          <p className={styles.info} role="status">
            {info}
          </p>
        )}

        <button
          type="button"
          className={styles.submit}
          onClick={() => onVerify?.({ code: code.join("") })}
          disabled={!puedeVerificar}
        >
          {loading
            ? "Verificando…"
            : bloqueado
              ? `Intenta de nuevo en ${formatearTiempo(bloqueadoSegundos)}`
              : "Verificar e ingresar"}
        </button>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.link}
            onClick={onResend}
            disabled={!puedeReenviar}
          >
            {reenviando
              ? "Enviando…"
              : esperaReenvioSegundos > 0
                ? `Reenviar código en ${formatearTiempo(esperaReenvioSegundos)}`
                : "Reenviar código"}
          </button>
          {onBack && (
            <button type="button" className={styles.link} onClick={onBack}>
              Volver a iniciar sesión
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
