import { mensajePara } from "./errorMessages.js";

/**
 * Error normalizado de la API. Refleja el cuerpo de error del contrato
 * (`status`, `codigo`, `mensaje`, `traceId`, `detalles`, `datos`).
 */
export class ApiError extends Error {
  /**
   * @param {object} p
   * @param {number} p.status          HTTP (0 = sin respuesta / red).
   * @param {string} [p.codigo]        Código de negocio estable.
   * @param {string} [p.mensajeServidor] `mensaje` informativo del backend (no se muestra).
   * @param {string} [p.traceId]
   * @param {Array<{campo:string,problema:string}>} [p.detalles]
   * @param {object} [p.datos]
   * @param {number} [p.retryAfter]    Segundos indicados por `Retry-After`.
   */
  constructor({ status, codigo, mensajeServidor, traceId, detalles, datos, retryAfter }) {
    super(mensajePara(codigo, status));
    this.name = "ApiError";
    this.status = status;
    this.codigo = codigo;
    this.mensajeServidor = mensajeServidor;
    this.traceId = traceId;
    this.detalles = detalles ?? [];
    this.datos = datos;
    this.retryAfter = retryAfter;
  }

  /** Falla inesperada (5xx o sin respuesta): conviene mostrar el `traceId` a soporte. */
  get esInesperado() {
    return this.status === 0 || this.status >= 500;
  }

  /** Mensaje listo para la interfaz; en fallas inesperadas añade el `traceId`. */
  get mensajeUsuario() {
    if (this.esInesperado && this.traceId) {
      return `${this.message} Código de soporte: ${this.traceId}`;
    }
    return this.message;
  }

  /** Problema de un campo concreto (errores de validación 400). */
  problemaDeCampo(campo) {
    return this.detalles.find((d) => d.campo === campo)?.problema;
  }
}
