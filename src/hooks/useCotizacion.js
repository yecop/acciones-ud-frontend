import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerCotizacion } from "../api/cotizacionesApi.js";

/**
 * Consulta la cotización de un ticker y la refresca cada `intervaloMs` (5 s, el mismo ciclo
 * con el que el backend actualiza su caché). Las lecturas nunca llegan a Alpaca.
 *
 * Si el backend responde 502 `PROVEEDOR_NO_DISPONIBLE` (nunca hubo dato), se expone en
 * `error` y se conserva la última cotización recibida, si la hubo.
 *
 * @param {string|null} ticker
 * @param {{intervaloMs?:number}} [opciones]
 */
export function useCotizacion(ticker, { intervaloMs = 5_000 } = {}) {
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(Boolean(ticker));
  const [error, setError] = useState(null);
  const controladorRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!ticker) return;
    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;
    try {
      const datos = await obtenerCotizacion(ticker, { signal: controlador.signal });
      if (!controlador.signal.aborted) {
        setCotizacion(datos);
        setError(null);
      }
    } catch (e) {
      if (e?.name !== "AbortError" && !controlador.signal.aborted) setError(e);
    } finally {
      if (!controlador.signal.aborted) setCargando(false);
    }
  }, [ticker]);

  useEffect(() => {
    setCotizacion(null);
    setError(null);
    setCargando(Boolean(ticker));
    if (!ticker) return undefined;
    cargar();
    const id = intervaloMs ? setInterval(cargar, intervaloMs) : null;
    return () => {
      if (id) clearInterval(id);
      controladorRef.current?.abort();
    };
  }, [ticker, cargar, intervaloMs]);

  return { cotizacion, cargando, error, recargar: cargar };
}
