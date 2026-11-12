import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi.js";
import { ApiError } from "../api/ApiError.js";
import { session } from "./session.js";
import { normalizarRol } from "./roles.js";
import { ESPERA_REENVIO_SEGUNDOS, VIGENCIA_CODIGO_POR_DEFECTO_SEGUNDOS } from "./mfaConfig.js";

const AuthContext = createContext(null);

/**
 * Estado de autenticación de la app: login en dos pasos (credenciales + MFA), logout y
 * cierre automático cuando el cliente HTTP no logra renovar el token.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => session.getUsuario());
  const [reto, setReto] = useState(() => session.getReto());
  // true cuando la sesión se cerró SOLA (no por "Salir"): el ingreso lo avisa.
  const [sesionExpirada, setSesionExpirada] = useState(false);

  // Si el refresh falla, el cliente HTTP expira la sesión y la UI vuelve al ingreso.
  useEffect(
    () =>
      session.onExpirada(() => {
        setUsuario(null);
        setReto(null);
        setSesionExpirada(true);
      }),
    []
  );

  const guardarReto = useCallback((nuevo) => {
    session.setReto(nuevo);
    setReto(nuevo);
  }, []);

  /** Paso 1. Guarda el reto MFA y lo devuelve (`{ mfaToken, canal, expiraEn }` del contrato). */
  const iniciarSesion = useCallback(
    async ({ correo, contrasena }) => {
      const respuesta = await authApi.iniciarSesion({ correo, contrasena });
      const ahora = Date.now();
      const vigenciaSegundos = respuesta.expiraEn ?? VIGENCIA_CODIGO_POR_DEFECTO_SEGUNDOS;
      guardarReto({
        mfaToken: respuesta.mfaToken,
        canal: respuesta.canal,
        vigenciaSegundos,
        venceEn: ahora + vigenciaSegundos * 1000,
        reenvioDisponibleEn: ahora + ESPERA_REENVIO_SEGUNDOS * 1000,
      });
      setSesionExpirada(false);
      return respuesta;
    },
    [guardarReto]
  );

  /** Paso 2. Emite los tokens y deja la sesión iniciada. Devuelve el usuario. */
  const verificarMfa = useCallback(
    async (codigo) => {
      const actual = session.getReto();
      if (!actual) throw new ApiError({ status: 410, codigo: "MFA_EXPIRADO" });

      const respuesta = await authApi.verificarMfa({ mfaToken: actual.mfaToken, codigo });
      const sesionUsuario = { ...respuesta.usuario, rol: normalizarRol(respuesta.usuario?.rol) };
      session.setTokens(respuesta);
      session.setUsuario(sesionUsuario);
      guardarReto(null);
      setUsuario(sesionUsuario);
      return sesionUsuario;
    },
    [guardarReto]
  );

  /** Pide un código nuevo. Reinicia la vigencia y la espera de reenvío. */
  const reenviarMfa = useCallback(async () => {
    const actual = session.getReto();
    if (!actual) throw new ApiError({ status: 410, codigo: "MFA_EXPIRADO" });

    await authApi.reenviarMfa({ mfaToken: actual.mfaToken });
    const ahora = Date.now();
    guardarReto({
      ...actual,
      venceEn: ahora + actual.vigenciaSegundos * 1000,
      reenvioDisponibleEn: ahora + ESPERA_REENVIO_SEGUNDOS * 1000,
    });
  }, [guardarReto]);

  /** Ajusta campos del reto en curso (p. ej. marcarlo vencido o posponer el reenvío). */
  const actualizarReto = useCallback(
    (cambios) => {
      const actual = session.getReto();
      if (actual) guardarReto({ ...actual, ...cambios });
    },
    [guardarReto]
  );

  /** Abandona el reto en curso (volver a las credenciales). */
  const descartarReto = useCallback(() => guardarReto(null), [guardarReto]);

  /** Actualiza únicamente el nombre devuelto por /perfil, manteniendo identidad y rol. */
  const actualizarNombre = useCallback((nombre) => {
    setUsuario((prev) => {
      if (!prev || prev.nombre === nombre) return prev;
      const actualizado = { ...prev, nombre };
      session.setUsuario(actualizado);
      return actualizado;
    });
  }, []);

  /** Cierra la sesión: invalida el token en el backend y limpia el estado local. */
  const cerrarSesion = useCallback(async () => {
    try {
      await authApi.cerrarSesion();
    } catch {
      /* aunque el backend falle, la sesión local se cierra */
    } finally {
      session.clear();
      setUsuario(null);
      setReto(null);
      setSesionExpirada(false);
    }
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      rol: usuario?.rol ?? null,
      autenticado: Boolean(usuario),
      reto,
      sesionExpirada,
      iniciarSesion,
      verificarMfa,
      reenviarMfa,
      actualizarReto,
      descartarReto,
      actualizarNombre,
      cerrarSesion,
    }),
    [
      usuario,
      reto,
      sesionExpirada,
      iniciarSesion,
      verificarMfa,
      reenviarMfa,
      actualizarReto,
      descartarReto,
      actualizarNombre,
      cerrarSesion,
    ]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return contexto;
}
