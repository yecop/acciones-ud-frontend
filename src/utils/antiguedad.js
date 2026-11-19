/**
 * Reglas de antigüedad de cotizaciones (SCRUM-24).
 *
 * El backend sirve los datos desde caché y los refresca cada 5 s. Si `actualizadoEn` tiene
 * más de 15 s de retraso respecto a la hora local, la interfaz debe destacarlo.
 */

/** Umbral de antigüedad en milisegundos (15 s). */
export const UMBRAL_ANTIGUEDAD_MS = 15_000;

/**
 * Segundos transcurridos desde `actualizadoEn` hasta `ahora` (nunca negativo).
 * @param {string|Date|undefined|null} actualizadoEn
 * @param {number|Date} [ahora=Date.now()]
 * @returns {number|null} `null` si la fecha no es válida.
 */
export function segundosDesde(actualizadoEn, ahora = Date.now()) {
  if (!actualizadoEn) return null;
  const instante = new Date(actualizadoEn).getTime();
  if (Number.isNaN(instante)) return null;
  const referencia = ahora instanceof Date ? ahora.getTime() : ahora;
  return Math.max(0, Math.floor((referencia - instante) / 1000));
}

/**
 * Umbral (ms) aplicable a la cotización: el que envía el backend para su mercado o 15 s.
 * @param {{umbralAntiguedadSegundos?:number}|undefined|null} cotizacion
 */
export function umbralDe(cotizacion) {
  const segundos = Number(cotizacion?.umbralAntiguedadSegundos);
  return Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : UMBRAL_ANTIGUEDAD_MS;
}

/**
 * ¿La fecha supera el umbral respecto a la hora local?
 * @param {string|Date|undefined|null} actualizadoEn
 * @param {number|Date} [ahora=Date.now()]
 * @param {number} [umbralMs=UMBRAL_ANTIGUEDAD_MS]
 */
export function superaUmbral(actualizadoEn, ahora = Date.now(), umbralMs = UMBRAL_ANTIGUEDAD_MS) {
  if (!actualizadoEn) return false;
  const instante = new Date(actualizadoEn).getTime();
  if (Number.isNaN(instante)) return false;
  const referencia = ahora instanceof Date ? ahora.getTime() : ahora;
  return referencia - instante > umbralMs;
}

/**
 * Estado visual de antigüedad de una cotización.
 *
 * - `proveedor`: el backend indica que el proveedor no responde (se muestra el último dato).
 * - `desactualizada`: el dato supera el umbral de su mercado respecto a la hora local
 *   (15 s en EE. UU.; el backend envía `umbralAntiguedadSegundos`), o el backend así lo marca.
 * - `al-dia`: dato vigente.
 * - `sin-dato`: no hay cotización.
 *
 * @param {import("../api/cotizacionesApi.js").Cotizacion|undefined|null} cotizacion
 * @param {number|Date} [ahora=Date.now()]
 * @returns {{estado:"al-dia"|"desactualizada"|"proveedor"|"sin-dato", segundos:number|null, mensaje:string}}
 */
export function evaluarAntiguedad(cotizacion, ahora = Date.now()) {
  if (!cotizacion?.actualizadoEn) {
    return { estado: "sin-dato", segundos: null, mensaje: "Sin cotización disponible." };
  }
  const umbralMs = umbralDe(cotizacion);
  const segundos = segundosDesde(cotizacion.actualizadoEn, ahora);
  if (cotizacion.advertencia?.codigo === "PROVEEDOR_NO_DISPONIBLE") {
    return {
      estado: "proveedor",
      segundos,
      mensaje: `El proveedor de datos no responde. Último dato de hace ${formatearAntiguedad(segundos)}.`,
    };
  }
  if (superaUmbral(cotizacion.actualizadoEn, ahora, umbralMs) || cotizacion.desactualizada) {
    return {
      estado: "desactualizada",
      segundos,
      mensaje: `Dato con ${formatearAntiguedad(segundos)} de antigüedad (más de ${formatearAntiguedad(
        umbralMs / 1000
      )}).`,
    };
  }
  return {
    estado: "al-dia",
    segundos,
    mensaje: `Actualizado hace ${formatearAntiguedad(segundos)}.`,
  };
}

/**
 * "8 s", "2 min 5 s", "1 h 3 min".
 * @param {number|null} segundos
 */
export function formatearAntiguedad(segundos) {
  if (segundos === null || segundos === undefined) return "—";
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos} min ${segundos % 60} s`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}
