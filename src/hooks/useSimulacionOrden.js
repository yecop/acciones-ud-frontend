import { useEffect, useState } from "react";
import { simularOrden } from "../api/ordenesApi.js";

/**
 * Simula la orden en el backend (`POST /ordenes/simulacion`) cuando cambia la solicitud, con un
 * pequeño retardo para no llamar en cada tecla. La simulación es la fuente de verdad de la
 * comisión, el total y si hay fondos o acciones suficientes; si falla, el formulario sigue con su
 * cálculo local y el envío real validará igual.
 *
 * @param {object|null} solicitud Cuerpo de la solicitud (null = nada que simular).
 * @param {{retardoMs?:number}} [opciones]
 * @returns {{resultado:object|null, cargando:boolean}}
 */
export function useSimulacionOrden(solicitud, { retardoMs = 350 } = {}) {
  const [estado, setEstado] = useState({ resultado: null, cargando: false });
  const clave = solicitud ? JSON.stringify(solicitud) : null;

  useEffect(() => {
    if (!clave) {
      setEstado({ resultado: null, cargando: false });
      return undefined;
    }
    const controlador = new AbortController();
    setEstado((previo) => ({ ...previo, cargando: true }));
    const temporizador = setTimeout(async () => {
      try {
        const resultado = await simularOrden(JSON.parse(clave), { signal: controlador.signal });
        if (!controlador.signal.aborted) setEstado({ resultado, cargando: false });
      } catch (e) {
        if (!controlador.signal.aborted && e?.name !== "AbortError") {
          setEstado({ resultado: null, cargando: false });
        }
      }
    }, retardoMs);
    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [clave, retardoMs]);

  return estado;
}
