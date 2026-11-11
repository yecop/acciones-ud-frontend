import { useEffect, useState } from "react";

/**
 * Cuenta regresiva hacia un instante absoluto.
 *
 * Se calcula contra `Date.now()` (no acumulando ticks), así que sigue siendo exacta si la
 * pestaña estuvo en segundo plano y el navegador frenó los temporizadores.
 *
 * @param {number|null|undefined} hastaMs Instante de fin (ms desde epoch). Sin valor = 0 s.
 * @returns {number} Segundos que faltan (0 cuando ya pasó o no hay cuenta).
 */
export function useCuentaRegresiva(hastaMs) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    setAhora(Date.now());
    if (!hastaMs || hastaMs <= Date.now()) return undefined;

    const id = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= hastaMs) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [hastaMs]);

  if (!hastaMs) return 0;
  return Math.max(0, Math.ceil((hastaMs - ahora) / 1000));
}
