import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carga genérica de un recurso con reintento y refresco silencioso opcional.
 * `cargar` recibe `{ signal }`. Guarda el último `ApiError` (para distinguir 403, 404 y red).
 *
 * @template T
 * @param {(opciones:{signal:AbortSignal}) => Promise<T>} cargar  Debe ser estable (useCallback).
 * @param {{intervaloMs?:number, activo?:boolean}} [opciones]
 */
export function useCarga(cargar, { intervaloMs = 0, activo = true } = {}) {
  const [estado, setEstado] = useState({ datos: null, cargando: activo, error: null });
  const ciclo = useRef(0);

  const ejecutar = useCallback(
    async ({ silencioso = false } = {}) => {
      const mio = (ciclo.current += 1);
      const controlador = new AbortController();
      if (!silencioso) setEstado((previo) => ({ ...previo, cargando: true, error: null }));
      try {
        const datos = await cargar({ signal: controlador.signal });
        if (ciclo.current === mio) setEstado({ datos, cargando: false, error: null });
      } catch (e) {
        if (ciclo.current !== mio || e?.name === "AbortError" || silencioso) return;
        setEstado((previo) => ({ ...previo, cargando: false, error: e }));
      }
    },
    [cargar]
  );

  useEffect(() => {
    if (!activo) return undefined;
    ejecutar();
    const id = intervaloMs ? setInterval(() => ejecutar({ silencioso: true }), intervaloMs) : null;
    return () => {
      if (id) clearInterval(id);
      ciclo.current += 1;
    };
  }, [ejecutar, intervaloMs, activo]);

  const setDatos = useCallback((datos) => setEstado({ datos, cargando: false, error: null }), []);
  const recargar = useCallback(() => ejecutar(), [ejecutar]);
  const refrescar = useCallback(() => ejecutar({ silencioso: true }), [ejecutar]);
  return { ...estado, setDatos, recargar, refrescar };
}
