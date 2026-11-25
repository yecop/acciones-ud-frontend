import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerHistorialOrden, obtenerOrden } from "../api/ordenesApi.js";

/**
 * Detalle de una orden (`GET /ordenes/{id}`) y su historial (`/historial`). Cada llamada falla por
 * separado: si no llega el historial, el resumen se sigue mostrando. Un 404 se marca como
 * `noEncontrada` (la orden no existe o es de otro usuario). Se refresca sola cada `intervaloMs`.
 *
 * @param {string} id
 * @param {{intervaloMs?:number}} [opciones] `intervaloMs: 0` desactiva el refresco automático.
 */
export function useOrdenDetalle(id, { intervaloMs = 10_000 } = {}) {
  const [estado, setEstado] = useState({
    orden: null,
    historial: null,
    cargando: true,
    noEncontrada: false,
    errorOrden: null,
    errorHistorial: null,
  });
  const ciclo = useRef(0);

  const cargar = useCallback(
    async ({ silencioso = false } = {}) => {
      const mio = (ciclo.current += 1);
      if (!silencioso) {
        setEstado((p) => ({ ...p, cargando: true, errorOrden: null, errorHistorial: null }));
      }
      const [ordenR, historialR] = await Promise.allSettled([
        obtenerOrden(id),
        obtenerHistorialOrden(id),
      ]);
      if (ciclo.current !== mio) return;
      if (silencioso && ordenR.status === "rejected") return;

      const noEncontrada = ordenR.status === "rejected" && ordenR.reason?.status === 404;
      setEstado((p) => ({
        orden: ordenR.status === "fulfilled" ? ordenR.value : null,
        historial: historialR.status === "fulfilled" ? historialR.value.estados : p.historial,
        cargando: false,
        noEncontrada,
        errorOrden:
          ordenR.status === "rejected" && !noEncontrada
            ? (ordenR.reason?.mensajeUsuario ?? "No pudimos cargar la orden.")
            : null,
        errorHistorial:
          historialR.status === "rejected" && !noEncontrada
            ? (historialR.reason?.mensajeUsuario ?? "No pudimos cargar el historial.")
            : null,
      }));
    },
    [id]
  );

  useEffect(() => {
    cargar();
    if (!intervaloMs) return undefined;
    const intervalo = setInterval(() => cargar({ silencioso: true }), intervaloMs);
    return () => {
      clearInterval(intervalo);
      ciclo.current += 1;
    };
  }, [cargar, intervaloMs]);

  const recargar = useCallback(() => cargar(), [cargar]);
  const refrescar = useCallback(() => cargar({ silencioso: true }), [cargar]);
  return { ...estado, recargar, refrescar };
}
