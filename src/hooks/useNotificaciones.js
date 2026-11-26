import { useCallback, useEffect, useRef, useState } from "react";
import { listarNotificaciones, marcarNotificacionLeida } from "../api/notificacionesApi.js";

/**
 * Lista de notificaciones del usuario (`GET /notificaciones`), con filtros y paginación.
 * Se refresca sola cada `intervaloMs` sin mostrar «cargando» otra vez.
 *
 * @param {{tipo?:string, leida?:boolean, pagina?:number, tamano?:number}} [filtros]
 * @param {{intervaloMs?:number}} [opciones] `intervaloMs: 0` desactiva el refresco automático.
 */
export function useNotificaciones(filtros = {}, { intervaloMs = 30_000 } = {}) {
  const [estado, setEstado] = useState({ pagina: null, cargando: true, error: null });
  const claveFiltros = JSON.stringify(filtros);
  const ciclo = useRef(0);

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      const mio = (ciclo.current += 1);
      if (!silencioso) setEstado((previo) => ({ ...previo, cargando: true, error: null }));
      try {
        const pagina = await listarNotificaciones(JSON.parse(claveFiltros));
        if (ciclo.current === mio) setEstado({ pagina, cargando: false, error: null });
      } catch (e) {
        if (ciclo.current !== mio || silencioso) return;
        setEstado((previo) => ({
          ...previo,
          cargando: false,
          error: e?.mensajeUsuario ?? e?.message ?? "No pudimos cargar tus notificaciones.",
        }));
      }
    },
    [claveFiltros]
  );

  useEffect(() => {
    cargar();
    if (!intervaloMs) return undefined;
    const id = setInterval(() => cargar({ silencioso: true }), intervaloMs);
    return () => {
      clearInterval(id);
      ciclo.current += 1;
    };
  }, [cargar, intervaloMs]);

  const recargar = useCallback(() => cargar(), [cargar]);
  const refrescar = useCallback(() => cargar({ silencioso: true }), [cargar]);

  /**
   * Marca como leídas las notificaciones dadas. Devuelve cuántas fallaron (0 = todo bien); no
   * lanza, para que la pantalla muestre un mensaje en vez de romperse.
   */
  const marcarLeidas = useCallback(
    async (ids) => {
      const resultados = await Promise.allSettled(ids.map((id) => marcarNotificacionLeida(id)));
      await cargar({ silencioso: true });
      return resultados.filter((r) => r.status === "rejected").length;
    },
    [cargar]
  );

  return { ...estado, recargar, refrescar, marcarLeidas };
}
