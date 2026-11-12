/**
 * Cliente REST para el módulo de mercados (SCRUM-23).
 *
 * La URL base del backend es configurable mediante la variable de entorno
 * VITE_API_BASE_URL (por defecto apunta al backend local en el puerto 8080).
 */
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8080";

async function obtenerJson(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
    headers: { Accept: "application/json" },
    ...opciones,
  });

  if (!respuesta.ok) {
    let detalle = `Error ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      detalle = cuerpo?.mensaje ?? detalle;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(detalle);
  }

  return respuesta.json();
}

/**
 * GET /api/v1/mercados
 * @returns {Promise<Array<{codigo:string,nombre:string,zonaHoraria:string,horaApertura:string,horaCierre:string,diasHabiles:string}>>}
 */
export function listarMercados(signal) {
  return obtenerJson("/api/v1/mercados", { signal });
}

/**
 * GET /api/v1/mercados/{codigo}/estado
 * @param {string} codigo
 * @returns {Promise<object>} estado del mercado
 */
export function obtenerEstadoMercado(codigo, signal) {
  return obtenerJson(`/api/v1/mercados/${encodeURIComponent(codigo)}/estado`, { signal });
}

export { API_BASE_URL };
