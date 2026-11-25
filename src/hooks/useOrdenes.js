import { useCallback, useEffect, useRef, useState } from "react";
import { listarOrdenes } from "../api/ordenesApi.js";

/**
 * Lista de órdenes del usuario (`GET /ordenes`), con filtros y paginación. Se refresca sola cada
 * `intervaloMs` (las órdenes cambian de estado en el mercado) sin mostrar «cargando» de nuevo.
 *
 * @param {{estado?:string, ticker?:string, lado?:string, desde?:string, hasta?:string, pagina?:number, tamano?:number}} [filtros]
 * @param {{intervaloMs?:number}} [opciones] `intervaloMs: 0` desactiva el refresco automático.
 */
export function useOrdenes(filtros = {}, { intervaloMs = 10_000 } = {}) {
  const [estado, setEstado] = useState({ pagina: null, cargando: true, error: null });
  const claveFiltros = JSON.stringify(filtros);
  const ciclo = useRef(0);

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      const mio = (ciclo.current += 1);
      if (!silencioso) setEstado((previo) => ({ ...previo, cargando: true, error: null }));
      try {
        const pagina = await listarOrdenes(JSON.parse(claveFiltros));
        if (ciclo.current === mio) setEstado({ pagina, cargando: false, error: null });
      } catch (e) {
        if (ciclo.current !== mio) return;
        // En un refresco silencioso se conserva la lista anterior y no se molesta con el error.
        if (silencioso) return;
        setEstado((previo) => ({
          ...previo,
          cargando: false,
          error: e?.mensajeUsuario ?? e?.message ?? "No pudimos cargar tus órdenes.",
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
      ciclo.current += 1; // invalida respuestas en vuelo tras desmontar o cambiar de filtros
    };
  }, [cargar, intervaloMs]);

  const recargar = useCallback(() => cargar(), [cargar]);
  const refrescar = useCallback(() => cargar({ silencioso: true }), [cargar]);

  return { ...estado, recargar, refrescar };
}
