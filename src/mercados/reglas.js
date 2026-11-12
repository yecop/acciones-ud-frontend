/**
 * Reglas de presentación del dashboard de mercados (SCRUM-30). Funciones puras, sin red ni
 * reloj propio, para poder probarlas con facilidad.
 */

/** Mercados cuya cotización es el cierre diario y cuya ejecución es simulada. */
export const MERCADOS_CIERRE_DIARIO = ["LSE", "TSE", "ASX"];

/**
 * Un dato de mercado abierto se considera antiguo pasado este tiempo.
 * - Mercados con cotización en vivo: 1 minuto.
 * - Mercados de cierre diario: el último cierre tiene hasta ~24 h con el mercado abierto;
 *   se da holgura hasta 30 h.
 * Con el mercado cerrado no se advierte: el último precio es, por definición, el del cierre.
 */
export const UMBRAL_ANTIGUO_EN_VIVO_SEGUNDOS = 60;
export const UMBRAL_ANTIGUO_CIERRE_DIARIO_SEGUNDOS = 30 * 3600;

export const esCierreDiario = (codigoMercado) => MERCADOS_CIERRE_DIARIO.includes(codigoMercado);

export const umbralAntiguoSegundos = (codigoMercado) =>
  esCierreDiario(codigoMercado)
    ? UMBRAL_ANTIGUO_CIERRE_DIARIO_SEGUNDOS
    : UMBRAL_ANTIGUO_EN_VIVO_SEGUNDOS;

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

/**
 * Frescura de una cotización.
 * @returns {{edadSegundos:number|null, texto:string, antiguo:boolean, ultimoCierre:boolean}}
 *   `antiguo` es true solo con el mercado abierto y la edad por encima del umbral, o sin hora
 *   de actualización (no se puede garantizar que sea reciente). `ultimoCierre` indica que el
 *   mercado está cerrado y el precio es el del último cierre.
 */
export function evaluarFrescura({ codigoMercado, abierto, actualizadoEn, ahora = Date.now() }) {
  const edadSegundos = edadEnSegundos(actualizadoEn, ahora);
  const texto = formatearEdad(edadSegundos);
  if (abierto === false) return { edadSegundos, texto, antiguo: false, ultimoCierre: true };
  const antiguo = edadSegundos === null || edadSegundos > umbralAntiguoSegundos(codigoMercado);
  return { edadSegundos, texto, antiguo, ultimoCierre: false };
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
