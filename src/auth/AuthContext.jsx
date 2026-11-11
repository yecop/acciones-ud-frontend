import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi.js";
import { ApiError } from "../api/ApiError.js";
import { session } from "./session.js";
import { normalizarRol } from "./roles.js";

const AuthContext = createContext(null);

/**
 * Estado de autenticación de la app: login en dos pasos (credenciales + MFA), logout y
 * cierre automático cuando el cliente HTTP no logra renovar el token.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => session.getUsuario());

  // Si el refresh falla, el cliente HTTP expira la sesión y la UI vuelve al ingreso.
  useEffect(() => session.onExpirada(() => setUsuario(null)), []);

  /** Paso 1. Guarda el reto MFA y devuelve `{ mfaToken, canal, expiraEn }`. */
  const iniciarSesion = useCallback(async ({ correo, contrasena }) => {
    const reto = await authApi.iniciarSesion({ correo, contrasena });
    session.setMfaToken(reto.mfaToken);
    return reto;
  }, []);

  /** Paso 2. Emite los tokens y deja la sesión iniciada. Devuelve el usuario. */
  const verificarMfa = useCallback(async (codigo) => {
    const mfaToken = session.getMfaToken();
    if (!mfaToken) throw new ApiError({ status: 410, codigo: "MFA_EXPIRADO" });

    const respuesta = await authApi.verificarMfa({ mfaToken, codigo });
    const sesionUsuario = { ...respuesta.usuario, rol: normalizarRol(respuesta.usuario?.rol) };
    session.setTokens(respuesta);
    session.setUsuario(sesionUsuario);
    session.setMfaToken(null);
    setUsuario(sesionUsuario);
    return sesionUsuario;
  }, []);

  const reenviarMfa = useCallback(async () => {
    const mfaToken = session.getMfaToken();
    if (!mfaToken) throw new ApiError({ status: 410, codigo: "MFA_EXPIRADO" });
    await authApi.reenviarMfa({ mfaToken });
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await authApi.cerrarSesion();
    } catch {
      /* aunque el backend falle, la sesión local se cierra */
    } finally {
      session.clear();
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      rol: usuario?.rol ?? null,
      autenticado: Boolean(usuario),
      iniciarSesion,
      verificarMfa,
      reenviarMfa,
      cerrarSesion,
    }),
    [usuario, iniciarSesion, verificarMfa, reenviarMfa, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return contexto;
}
