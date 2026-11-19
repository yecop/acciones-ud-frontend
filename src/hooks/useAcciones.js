import { useCallback, useEffect, useRef, useState } from "react";
import { listarAcciones } from "../api/cotizacionesApi.js";

/**
 * Carga el listado paginado de acciones según los filtros y lo refresca periódicamente.
 *
 * @param {{mercado?:string, sector?:string, q?:string, pagina?:number, tamano?:number}} filtros
 * @param {{intervaloMs?:number}} [opciones] 0 desactiva el refresco.
 */
export function useAcciones(filtros, { intervaloMs = 15_000 } = {}) {
  const [pagina, setPagina] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const controladorRef = useRef(null);

  const { mercado, sector, q, pagina: numero, tamano } = filtros;

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      controladorRef.current?.abort();
      const controlador = new AbortController();
      controladorRef.current = controlador;
      if (!silencioso) setCargando(true);
      try {
        const datos = await listarAcciones(
          { mercado, sector, q, pagina: numero, tamano },
          { signal: controlador.signal }
        );
        if (!controlador.signal.aborted) {
          setPagina(datos);
          setError(null);
        }
      } catch (e) {
        if (e?.name !== "AbortError" && !controlador.signal.aborted) {
          setError(e?.message ?? "No fue posible consultar las acciones.");
        }
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    },
    [mercado, sector, q, numero, tamano]
  );

  useEffect(() => {
    cargar();
    if (!intervaloMs) return () => controladorRef.current?.abort();
    const id = setInterval(() => cargar({ silencioso: true }), intervaloMs);
    return () => {
      clearInterval(id);
      controladorRef.current?.abort();
    };
  }, [cargar, intervaloMs]);

  return { pagina, cargando, error, recargar: cargar };
}
