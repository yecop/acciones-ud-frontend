import { OPCIONES_ESTADO } from "./estadosOrden.js";

/**
 * Filtros del historial de órdenes y su conversión a la URL (para poder compartir o volver atrás)
 * y a los parámetros de `GET /ordenes`. Funciones puras, probadas sin interfaz.
 * En la URL la página va de 1 en adelante; la API cuenta desde 0.
 */

export const FILTROS_VACIOS = { estado: "", ticker: "", lado: "", desde: "", hasta: "" };
export const TAMANO_PAGINA = 10;

const ESTADOS_VALIDOS = new Set(OPCIONES_ESTADO.map((o) => o.valor));
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Lee y sanea los filtros y la página de la URL; lo inválido se descarta. */
export function leerFiltros(params) {
  const estado = params.get("estado") ?? "";
  const lado = params.get("lado") ?? "";
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  const ticker = (params.get("ticker") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, "")
    .slice(0, 10);
  const pagina = Number.parseInt(params.get("pagina") ?? "1", 10);
  return {
    filtros: {
      estado: ESTADOS_VALIDOS.has(estado) ? estado : "",
      lado: lado === "COMPRA" || lado === "VENTA" ? lado : "",
      ticker,
      desde: FECHA.test(desde) ? desde : "",
      hasta: FECHA.test(hasta) ? hasta : "",
    },
    pagina: Number.isInteger(pagina) && pagina >= 1 ? pagina : 1,
  };
}

/** Filtros y página → parámetros de URL (omite lo vacío y la página 1). */
export function escribirParams(filtros, pagina = 1) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) params.set(clave, valor);
  }
  if (pagina > 1) params.set("pagina", String(pagina));
  return params;
}

/** Mensaje de error si el rango de fechas es incoherente; `null` si está bien. */
export function validarRango({ desde, hasta }) {
  if (desde && hasta && desde > hasta) {
    return "La fecha «Desde» no puede ser posterior a «Hasta».";
  }
  return null;
}

/** Filtros de pantalla → parámetros de `GET /ordenes` (fechas como inicio y fin de día locales). */
export function aFiltrosApi(filtros, pagina = 1, tamano = TAMANO_PAGINA) {
  const api = { pagina: pagina - 1, tamano };
  if (filtros.estado) api.estado = filtros.estado;
  if (filtros.ticker) api.ticker = filtros.ticker;
  if (filtros.lado) api.lado = filtros.lado;
  if (filtros.desde) api.desde = new Date(`${filtros.desde}T00:00:00`).toISOString();
  if (filtros.hasta) api.hasta = new Date(`${filtros.hasta}T23:59:59.999`).toISOString();
  return api;
}

/** ¿Hay algún filtro aplicado? */
export const hayFiltros = (filtros) => Object.values(filtros).some(Boolean);
