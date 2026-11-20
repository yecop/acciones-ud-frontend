import { useEffect, useState } from "react";

/**
 * Hora local que se actualiza cada `intervaloMs`. Permite que la advertencia de antigüedad
 * aparezca en cuanto el dato cumple 15 s, sin esperar a la siguiente consulta al backend.
 *
 * @param {number} [intervaloMs=1000]
 * @returns {number} `Date.now()` del último tic.
 */
export function useAhora(intervaloMs = 1000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
