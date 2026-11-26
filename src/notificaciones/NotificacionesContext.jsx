import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { listarNotificaciones } from "../api/notificacionesApi.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ROLES } from "../auth/roles.js";

const INTERVALO_MS = 30_000;
const ROLES_CON_NOTIFICACIONES = [ROLES.INV, ROLES.COM];

const Contexto = createContext({ disponible: false, noLeidas: 0, refrescar: () => {} });

/**
 * Cuenta de notificaciones sin leer para la campana. Consulta `GET /notificaciones?leida=false`
 * (⚠ el filtro `leida` no está en el contrato; ver docs/trading-mock.md) y usa `totalElementos`.
 * Se refresca sola cada 30 s y cuando una pantalla marca algo como leído (`refrescar`).
 * Si la consulta falla se conserva el último número: la campana nunca debe romper la pantalla.
 */
export function NotificacionesProvider({ children, intervaloMs = INTERVALO_MS }) {
  const { autenticado, rol } = useAuth();
  const activo = autenticado && ROLES_CON_NOTIFICACIONES.includes(rol);
  const [noLeidas, setNoLeidas] = useState(0);
  const ciclo = useRef(0);

  const refrescar = useCallback(async () => {
    if (!activo) return;
    const mio = (ciclo.current += 1);
    try {
      const respuesta = await listarNotificaciones({ leida: false, tamano: 1 });
      if (ciclo.current === mio) setNoLeidas(respuesta.totalElementos ?? 0);
    } catch {
      /* se conserva el último valor conocido */
    }
  }, [activo]);

  useEffect(() => {
    if (!activo) {
      ciclo.current += 1;
      setNoLeidas(0);
      return undefined;
    }
    refrescar();
    const id = setInterval(refrescar, intervaloMs);
    return () => {
      clearInterval(id);
      ciclo.current += 1;
    };
  }, [activo, refrescar, intervaloMs]);

  const valor = useMemo(
    () => ({ disponible: activo, noLeidas, refrescar }),
    [activo, noLeidas, refrescar]
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useNoLeidas = () => useContext(Contexto);
