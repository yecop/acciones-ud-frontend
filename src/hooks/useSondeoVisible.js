import { useEffect, useRef } from "react";

/**
 * Ejecuta `tick` cada `intervaloMs` solo mientras la pestaña está visible.
 * Con la pestaña oculta (`document.visibilityState === "hidden"`) el intervalo se detiene; al
 * volver se ejecuta `tick` una vez de inmediato y el intervalo se reanuda.
 *
 * @param {() => void} tick
 * @param {number} intervaloMs `0` desactiva el sondeo.
 * @param {boolean} [activo=true]
 */
export function useSondeoVisible(tick, intervaloMs, activo = true) {
  const ref = useRef(tick);
  useEffect(() => {
    ref.current = tick;
  });

  useEffect(() => {
    if (!activo || !intervaloMs) return undefined;
    let id = null;
    const iniciar = () => {
      if (id === null) id = setInterval(() => ref.current(), intervaloMs);
    };
    const detener = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const alCambiar = () => {
      if (document.visibilityState === "hidden") {
        detener();
      } else {
        detener();
        iniciar();
        ref.current();
      }
    };
    if (document.visibilityState !== "hidden") iniciar();
    document.addEventListener("visibilitychange", alCambiar);
    return () => {
      detener();
      document.removeEventListener("visibilitychange", alCambiar);
    };
  }, [intervaloMs, activo]);
}
