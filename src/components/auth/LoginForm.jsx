import { useId, useState } from "react";
import { formatearTiempo } from "../../utils/tiempo.js";
import styles from "./LoginForm.module.css";

const REGEX_CORREO = /^\S+@\S+\.\S+$/;

/**
 * Formulario de credenciales (primer factor).
 *
 * Valida en el cliente lo evidente (campos vacíos, formato de correo) y deja que el backend
 * decida lo demás: los errores por campo del servidor llegan en `fieldErrors`.
 *
 * @param {object} props
 * @param {function} props.onSubmit      Recibe `{ correo, contrasena }`.
 * @param {string|null} [props.error]    Error general (credenciales inválidas, red, etc.).
 * @param {{correo?:string, contrasena?:string}} [props.fieldErrors] Errores por campo del backend.
 * @param {string|null} [props.notice]   Aviso informativo (p. ej. «tu sesión expiró»).
 * @param {boolean} [props.loading]
 * @param {number} [props.bloqueadoSegundos] Segundos de bloqueo restantes (429); >0 deshabilita.
 * @param {function} [props.onRegister]
 */
export default function LoginForm({
  onSubmit,
  error = null,
  fieldErrors = {},
  notice = null,
  loading = false,
  bloqueadoSegundos = 0,
  onRegister,
}) {
  const id = useId();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [erroresLocales, setErroresLocales] = useState({});

  const errores = { ...fieldErrors, ...erroresLocales };
  const bloqueado = bloqueadoSegundos > 0;

  const validar = () => {
    const nuevos = {};
    if (!correo.trim()) nuevos.correo = "Ingresa tu correo electrónico.";
    else if (!REGEX_CORREO.test(correo.trim())) nuevos.correo = "Revisa el formato del correo.";
    if (!contrasena) nuevos.contrasena = "Ingresa tu contraseña.";
    return nuevos;
  };

  const enviar = (evento) => {
    evento.preventDefault();
    if (loading || bloqueado) return;
    const nuevos = validar();
    setErroresLocales(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    onSubmit?.({ correo: correo.trim(), contrasena });
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.card} onSubmit={enviar} noValidate>
        <p className={styles.step}>Paso 1 de 2 · Credenciales</p>
        <h2 className={styles.title}>Ingresa a tu cuenta</h2>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        <div className={styles.field}>
          <label htmlFor={`${id}-correo`}>Correo electrónico</label>
          <input
            id={`${id}-correo`}
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              setErroresLocales((prev) => ({ ...prev, correo: undefined }));
            }}
            aria-invalid={Boolean(errores.correo)}
            aria-describedby={errores.correo ? `${id}-correo-error` : undefined}
          />
          {errores.correo && (
            <p id={`${id}-correo-error`} className={styles.fieldError}>
              {errores.correo}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${id}-contrasena`}>Contraseña</label>
          <div className={styles.passwordRow}>
            <input
              id={`${id}-contrasena`}
              type={verContrasena ? "text" : "password"}
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => {
                setContrasena(e.target.value);
                setErroresLocales((prev) => ({ ...prev, contrasena: undefined }));
              }}
              aria-invalid={Boolean(errores.contrasena)}
              aria-describedby={errores.contrasena ? `${id}-contrasena-error` : undefined}
            />
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={verContrasena}
              onClick={() => setVerContrasena((v) => !v)}
            >
              {verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
            </button>
          </div>
          {errores.contrasena && (
            <p id={`${id}-contrasena-error`} className={styles.fieldError}>
              {errores.contrasena}
            </p>
          )}
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={loading || bloqueado}>
          {loading
            ? "Verificando…"
            : bloqueado
              ? `Disponible en ${formatearTiempo(bloqueadoSegundos)}`
              : "Continuar"}
        </button>

        {onRegister && (
          <button type="button" className={styles.link} onClick={onRegister}>
            ¿No tienes cuenta? Regístrate
          </button>
        )}
      </form>
    </div>
  );
}
