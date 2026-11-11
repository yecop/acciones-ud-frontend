/**
 * Formatea segundos como `mm:ss` (p. ej. 272 → "04:32").
 * @param {number} segundos
 */
export function formatearTiempo(segundos) {
  const total = Math.max(0, Math.floor(segundos));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
