import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import LoginForm from "../components/auth/LoginForm.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { ESPERA_BLOQUEO_POR_DEFECTO_SEGUNDOS } from "../auth/mfaConfig.js";
import { useCuentaRegresiva } from "../hooks/useCuentaRegresiva.js";
import { RUTA_INICIAL_POR_ROL, RUTAS } from "../routes/routesConfig.js";

/** Convierte los `detalles` de un 400 en `{ campo: problema }` para el formulario. */
function erroresPorCampo(error) {
  const campos = {};
  error.detalles?.forEach(({ campo, problema }) => {
    if (campo && problema) campos[campo] = problema;
  });
  return campos;
}

/**
 * Ingreso: primer factor (correo y contraseña). Si el backend acepta las credenciales,
 * deja un reto MFA en la sesión y sigue a la verificación del código.
 */
export default function LoginPage() {
  const { autenticado, rol, iniciarSesion, sesionExpirada } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();

  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [bloqueoHasta, setBloqueoHasta] = useState(null);
  const bloqueadoSegundos = useCuentaRegresiva(bloqueoHasta);

  if (autenticado) return <Navigate to={RUTA_INICIAL_POR_ROL[rol] ?? "/"} replace />;

  const enviar = async (credenciales) => {
    setError(null);
    setFieldErrors({});
    setEnviando(true);
    try {
      await iniciarSesion(credenciales);
      // `desde` viaja hasta la verificación para volver a la pantalla que se quería abrir.
      navigate(RUTAS.verificacion, { state: ubicacion.state });
    } catch (e) {
      setError(
        e.datos?.estado === "PENDIENTE_ALTA"
          ? "Tu cuenta está pendiente de alta. Espera la confirmación antes de iniciar sesión."
          : (e.mensajeUsuario ?? "No fue posible iniciar sesión.")
      );
      if (e.codigo === "VALIDACION_FALLIDA") setFieldErrors(erroresPorCampo(e));
      if (e.status === 429) {
        const segundos = e.retryAfter ?? ESPERA_BLOQUEO_POR_DEFECTO_SEGUNDOS;
        setBloqueoHasta(Date.now() + segundos * 1000);
      }
      setEnviando(false);
    }
  };

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={enviar}
        error={error}
        fieldErrors={fieldErrors}
        notice={sesionExpirada ? "Tu sesión expiró. Inicia sesión de nuevo." : null}
        loading={enviando}
        bloqueadoSegundos={bloqueadoSegundos}
        onRegister={() => navigate(RUTAS.registro)}
      />
    </AuthLayout>
  );
}
