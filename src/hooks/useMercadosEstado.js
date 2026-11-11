import { useCallback, useEffect, useRef, useState } from "react";
import { listarMercados, obtenerEstadoMercado } from "../api/mercadosApi";

/**
 * Hook que carga la lista de mercados y el estado de cada uno, con refresco
 * periódico (polling) para mantener la información actualizada en tiempo real.
 *
 * @param {object} [opciones]
 * @param {number} [opciones.intervaloMs=60000] intervalo de refresco en ms.
 * @returns {{mercados:Array, cargando:boolean, error:string|null, refrescar:Function}}
 */
export function useMercadosEstado({ intervaloMs = 60000 } = {}) {
  const [mercados, setMercados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const montadoRef = useRef(true);

  const cargar = useCallback(async (signal) => {
    try {
      setError(null);
      const lista = await listarMercados(signal);
      const estados = await Promise.all(
        lista.map(async (mercado) => {
          const estado = await obtenerEstadoMercado(mercado.codigo, signal);
          return { ...mercado, ...estado };
        })
      );
      if (montadoRef.current) {
        setMercados(estados);
      }
    } catch (e) {
      if (e.name !== "AbortError" && montadoRef.current) {
        setError(e.message ?? "No fue posible consultar los mercados");
      }
    } finally {
      if (montadoRef.current) {
        setCargando(false);
      }
    }
  }, []);

  const refrescar = useCallback(() => {
    const controlador = new AbortController();
    setCargando(true);
    cargar(controlador.signal);
    return () => controlador.abort();
  }, [cargar]);

  useEffect(() => {
    montadoRef.current = true;
    const controlador = new AbortController();
    cargar(controlador.signal);

    const id = setInterval(() => {
      cargar(controlador.signal);
    }, intervaloMs);

    return () => {
      montadoRef.current = false;
      controlador.abort();
      clearInterval(id);
    };
  }, [cargar, intervaloMs]);

  return { mercados, cargando, error, refrescar };
}
