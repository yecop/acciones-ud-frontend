/**
 * Reglas de presentación del dashboard de mercados (SCRUM-30). Funciones puras, sin red ni
 * reloj propio, para poder probarlas con facilidad.
 */

/**
 * Mercados cuya cotización es el cierre diario y cuya ejecución es simulada.
 *
 * La antigüedad de una cotización NO se decide aquí: la fija el backend en cada cotización
 * (`umbralAntiguedadSegundos`, `desactualizada`, `advertencia`) y se evalúa con
 * `utils/antiguedad.js`, igual que en la pantalla de acciones.
 */
export const MERCADOS_CIERRE_DIARIO = ["LSE", "TSE", "ASX"];

export const esCierreDiario = (codigoMercado) => MERCADOS_CIERRE_DIARIO.includes(codigoMercado);

/** Segundos transcurridos desde `actualizadoEn` (ISO). `null` si falta o no es válida. */
export function edadEnSegundos(actualizadoEn, ahora = Date.now()) {
  if (!actualizadoEn) return null;
  const instante = new Date(actualizadoEn).getTime();
  if (Number.isNaN(instante)) return null;
  // Un reloj local atrasado no debe producir edades negativas.
  return Math.max(0, Math.floor((ahora - instante) / 1000));
}

/** "hace 5 s", "hace 3 min", "hace 2 h", "hace 4 d". */
export function formatearEdad(segundos) {
  if (segundos === null || segundos === undefined) return "sin hora de actualización";
  if (segundos < 5) return "ahora mismo";
  if (segundos < 60) return `hace ${segundos} s`;
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;
  return `hace ${Math.floor(segundos / 86400)} d`;
}

/** ¿La acción es de interés? Coincide su sector con los intereses del perfil. */
export function esDeInteres(accion, intereses) {
  const sectores = intereses?.sectores ?? [];
  return sectores.includes(accion.sector);
}

/** Acciones de interés primero; dentro de cada grupo se conserva el orden original. */
export function ordenarAcciones(acciones, intereses) {
  const interes = acciones.filter((a) => esDeInteres(a, intereses));
  const resto = acciones.filter((a) => !esDeInteres(a, intereses));
  return [...interes, ...resto];
}

/** Mercados de interés primero (los del perfil), luego el resto en su orden original. */
export function ordenarMercados(mercados, intereses) {
  const preferidos = intereses?.mercados ?? [];
  const interes = mercados.filter((m) => preferidos.includes(m.codigo));
  const resto = mercados.filter((m) => !preferidos.includes(m.codigo));
  return [...interes, ...resto];
}
