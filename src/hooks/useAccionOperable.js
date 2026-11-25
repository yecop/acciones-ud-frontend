import { useEffect, useState } from "react";
import { obtenerAccion, obtenerCotizacion } from "../api/cotizacionesApi.js";
import { obtenerEstadoMercado } from "../api/mercadosApi.js";

/**
 * Datos para operar una acción: detalle, cotización y estado de su mercado. Cada llamada falla por
 * separado: sin cotización no hay precio para el formulario, pero sí se explica por qué; sin
 * estado de mercado el formulario asume abierto y el backend confirma al enviar.
 *
 * @param {string|null} ticker
 * @returns {{cargando:boolean, error:string|null, accion:object|null, cotizacion:object|null, mercadoAbierto:boolean|null}}
 */
export function useAccionOperable(ticker) {
  const [estado, setEstado] = useState({
    cargando: Boolean(ticker),
    error: null,
    accion: null,
    cotizacion: null,
    mercadoAbierto: null,
  });

  useEffect(() => {
    if (!ticker) {
      setEstado({
        cargando: false,
        error: null,
        accion: null,
        cotizacion: null,
        mercadoAbierto: null,
      });
      return undefined;
    }
    const controlador = new AbortController();
    const opciones = { signal: controlador.signal };
    setEstado({
      cargando: true,
      error: null,
      accion: null,
      cotizacion: null,
      mercadoAbierto: null,
    });

    (async () => {
      const [accionR, cotizacionR] = await Promise.allSettled([
        obtenerAccion(ticker, opciones),
        obtenerCotizacion(ticker, opciones),
      ]);
      if (controlador.signal.aborted) return;
      if (accionR.status === "rejected") {
        setEstado({
          cargando: false,
          error: accionR.reason?.mensajeUsuario ?? "No pudimos cargar la acción.",
          accion: null,
          cotizacion: null,
          mercadoAbierto: null,
        });
        return;
      }
      const accion = accionR.value;
      let mercadoAbierto = null;
      try {
        mercadoAbierto = (await obtenerEstadoMercado(accion.mercado, controlador.signal)).abierto;
      } catch {
        /* sin estado: se asume abierto y el backend confirma al enviar */
      }
      if (controlador.signal.aborted) return;
      setEstado({
        cargando: false,
        error:
          cotizacionR.status === "rejected"
            ? "No hay cotización disponible por ahora; no se puede calcular el precio."
            : null,
        accion,
        cotizacion: cotizacionR.status === "fulfilled" ? cotizacionR.value : null,
        mercadoAbierto,
      });
    })();

    return () => controlador.abort();
  }, [ticker]);

  return estado;
}
