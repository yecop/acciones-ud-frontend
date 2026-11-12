import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import VerificationForm from "../components/verification/VerificationForm.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { ESPERA_BLOQUEO_POR_DEFECTO_SEGUNDOS, LONGITUD_CODIGO } from "../auth/mfaConfig.js";
import { useCuentaRegresiva } from "../hooks/useCuentaRegresiva.js";
import { RUTA_INICIAL_POR_ROL, RUTAS } from "../routes/routesConfig.js";

const DESTINO_POR_CANAL = {
  EMAIL: "tu correo electrónico",
  SMS: "tu celular por SMS",
};

/**
 * Verificación del segundo factor. Cubre los casos del código:
 *  - **inválido** (401 MFA_INVALIDO): mensaje, se limpia el campo y vuelve el foco.
 *  - **vencido** (410 MFA_EXPIRADO, o la vigencia llegó a cero): se bloquea la verificación y se
 *    permite pedir otro código sin esperar.
 *  - **intentos excedidos** (429): se bloquea con cuenta regresiva (`Retry-After`).
 *  - **reenvío**: con espera entre solicitudes; si el reto ya no existe en el backend, se
 *    invita a volver a iniciar sesión.
 */
export default function MfaPage() {
  const { autenticado, reto, verificarMfa, reenviarMfa, actualizarReto, descartarReto } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();

  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [bloqueoHasta, setBloqueoHasta] = useState(null);
  const [retoPerdido, setRetoPerdido] = useState(false);

  const venceEnSegundos = useCuentaRegresiva(reto?.venceEn);
  const esperaReenvio = useCuentaRegresiva(reto?.reenvioDisponibleEn);
  const bloqueadoSegundos = useCuentaRegresiva(bloqueoHasta);

  if (autenticado) return <Navigate to="/" replace />;
  if (!reto) return <Navigate to={RUTAS.ingreso} replace />;

  const expirado = venceEnSegundos === 0;
  // Con el código vencido no tiene sentido esperar para pedir otro.
  const esperaEfectiva = expirado ? 0 : esperaReenvio;

  const verificar = async ({ code }) => {
    setError(null);
    setInfo(null);
    setCargando(true);
    try {
      const usuario = await verificarMfa(code);
      navigate(ubicacion.state?.desde ?? RUTA_INICIAL_POR_ROL[usuario.rol] ?? "/", {
        replace: true,
      });
    } catch (e) {
      setError(e.mensajeUsuario ?? "No fue posible verificar el código.");
      if (e.codigo === "MFA_INVALIDO") {
        setResetKey((k) => k + 1);
      } else if (e.codigo === "MFA_EXPIRADO") {
        actualizarReto({ venceEn: Date.now(), reenvioDisponibleEn: Date.now() });
      } else if (e.status === 429) {
        const segundos = e.retryAfter ?? ESPERA_BLOQUEO_POR_DEFECTO_SEGUNDOS;
        setBloqueoHasta(Date.now() + segundos * 1000);
      }
      setCargando(false);
    }
  };

  const reenviar = async () => {
    setError(null);
    setInfo(null);
    setReenviando(true);
    try {
      await reenviarMfa();
      setBloqueoHasta(null);
      setResetKey((k) => k + 1);
      setInfo("Te enviamos un código nuevo.");
    } catch (e) {
      setError(e.mensajeUsuario ?? "No fue posible reenviar el código.");
      if (e.codigo === "MFA_EXPIRADO") {
        // El backend ya no conoce este reto: hay que empezar de nuevo.
        setRetoPerdido(true);
      } else if (e.status === 429) {
        const segundos = e.retryAfter ?? ESPERA_BLOQUEO_POR_DEFECTO_SEGUNDOS;
        actualizarReto({ reenvioDisponibleEn: Date.now() + segundos * 1000 });
      }
    } finally {
      setReenviando(false);
    }
  };

  const volver = () => {
    descartarReto();
    navigate(RUTAS.ingreso, { state: ubicacion.state });
  };

  return (
    <AuthLayout>
      <VerificationForm
        codeLength={LONGITUD_CODIGO}
        destino={DESTINO_POR_CANAL[reto.canal] ?? "tu medio de verificación"}
        venceEnSegundos={venceEnSegundos}
        expirado={expirado}
        esperaReenvioSegundos={esperaEfectiva}
        bloqueadoSegundos={bloqueadoSegundos}
        error={error}
        info={info}
        loading={cargando}
        reenviando={reenviando}
        sinReto={retoPerdido}
        resetKey={resetKey}
        onVerify={verificar}
        onResend={reenviar}
        onBack={volver}
        onEdit={() => {
          if (bloqueadoSegundos === 0 && !expirado) setError(null);
          setInfo(null);
        }}
      />
    </AuthLayout>
  );
}
