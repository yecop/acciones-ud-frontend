import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { RUTA_INICIAL_POR_ROL, RUTAS } from "../routes/routesConfig.js";
import styles from "./LoginPage.module.css";

/**
 * Primer factor del ingreso (correo y contraseña). PROVISIONAL: SCRUM-28 define la pantalla
 * definitiva de login; aquí solo existe para poder abrir sesión contra el mock y probar rutas.
 */
export default function LoginPage() {
  const { autenticado, rol, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (autenticado) return <Navigate to={RUTA_INICIAL_POR_ROL[rol] ?? "/"} replace />;

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion({ correo, contrasena });
      // `desde` viaja hasta la verificación para volver a la pantalla que se quería abrir.
      navigate(RUTAS.verificacion, { state: ubicacion.state });
    } catch (e) {
      setError(e.mensajeUsuario ?? "No fue posible iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={enviar} noValidate>
        <p className={styles.step}>Paso 1 de 2 · Credenciales</p>
        <h1 className={styles.title}>Ingresa a Acciones UD</h1>

        <label className={styles.field}>
          <span>Correo electrónico</span>
          <input
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className={styles.submit}
          disabled={enviando || !correo || !contrasena}
        >
          {enviando ? "Verificando…" : "Continuar"}
        </button>

        <button type="button" className={styles.link} onClick={() => navigate(RUTAS.registro)}>
          ¿No tienes cuenta? Regístrate
        </button>
      </form>
    </main>
  );
}
