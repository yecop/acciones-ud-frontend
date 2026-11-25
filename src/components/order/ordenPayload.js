/**
 * Conversión entre el formulario de órdenes (ids internos en inglés) y el contrato de la API.
 * Funciones puras para probarlas sin interfaz.
 */

const LADO = { buy: "COMPRA", sell: "VENTA" };
const TIPO = { market: "MARKET", limit: "LIMIT", stop: "STOP_LOSS", take: "TAKE_PROFIT" };

const dosDecimales = (n) => Number(n).toFixed(2);

/**
 * Borrador del formulario → cuerpo de `POST /ordenes` y `POST /ordenes/simulacion`.
 * Los precios viajan como texto con 2 decimales, como el resto de montos del contrato.
 *
 * @param {{symbol:string, side:"buy"|"sell", type:"market"|"limit"|"stop"|"take", quantity:number, price?:number}} borrador
 */
export function construirSolicitud({ symbol, side, type, quantity, price }) {
  const solicitud = {
    ticker: symbol,
    lado: LADO[side],
    tipo: TIPO[type],
    cantidad: quantity,
  };
  if (type === "limit") solicitud.precioLimite = dosDecimales(price);
  if (type === "stop" || type === "take") solicitud.precioStop = dosDecimales(price);
  return solicitud;
}

/** ¿El borrador tiene lo mínimo para simular o enviar? */
export function borradorValido(borrador) {
  if (!borrador?.symbol) return false;
  if (!Number.isInteger(borrador.quantity) || borrador.quantity < 1) return false;
  if (borrador.type !== "market" && !(Number(borrador.price) > 0)) return false;
  return true;
}
