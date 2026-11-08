import { useState } from "react";
import styles from "./VerificationForm.module.css";
import OtpInput from "./OtpInput.jsx";

/**
 * Formulario de verificación OTP (columna derecha).
 *
 * @param {object} props
 * @param {string} [props.step]          Texto del paso (ej. "Paso 2 de 2 · Verificación").
 * @param {string} [props.title]
 * @param {string} [props.maskedTarget]  Destino enmascarado del código.
 * @param {string} [props.expiresIn]     Tiempo de vencimiento (ej. "04:32").
 * @param {number} [props.codeLength]
 * @param {Array<{id:string,label:string}>} [props.channels]
 * @param {string} [props.defaultChannel]
 * @param {function} props.onVerify      Recibe { code, channel }.
 * @param {function} props.onResend
 * @param {function} props.onRegister
 */
export default function VerificationForm({
  step = "Paso 2 de 2 · Verificación",
  title = "Ingresa tu código",
  maskedTarget = "ju***@correo.com",
  expiresIn = "04:32",
  codeLength = 6,
  channels = [
    { id: "email", label: "Correo electrónico" },
    { id: "sms", label: "SMS al celular terminado en 4471" },
  ],
  defaultChannel = "email",
  onVerify,
  onResend,
  onRegister,
}) {
  const [code, setCode] = useState(Array(codeLength).fill(""));
  const [channel, setChannel] = useState(defaultChannel);

  const isComplete = code.every((digit) => digit !== "");

  const handleVerify = () => {
    const joined = code.join("");
    if (onVerify) onVerify({ code: joined, channel });
    else console.info("Verificando código:", { code: joined, channel });
  };

  return (
    <div className={styles.wrapper}>
      <section className={styles.card}>
        <p className={styles.step}>{step}</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>
          Enviamos un código de {codeLength} dígitos a {maskedTarget}. Vence en {expiresIn}.
        </p>

        <OtpInput length={codeLength} value={code} onChange={setCode} />

        <p className={styles.channelLabel}>Recibir el código por</p>
        <div className={styles.channels} role="radiogroup" aria-label="Recibir el código por">
          {channels.map((item) => {
            const active = channel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${styles.channel} ${active ? styles.channelActive : ""}`}
                onClick={() => setChannel(item.id)}
              >
                <span className={styles.radio} aria-hidden="true">
                  <span className={styles.radioDot} />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.submit}
          onClick={handleVerify}
          disabled={!isComplete}
        >
          Verificar e ingresar
        </button>

        <div className={styles.footer}>
          <button type="button" className={styles.link} onClick={onResend}>
            Reenviar código
          </button>
          <button type="button" className={styles.link} onClick={onRegister}>
            ¿No tienes cuenta? Regístrate
          </button>
        </div>
      </section>
    </div>
  );
}
