/**
 * Parámetros del segundo factor. El contrato deja pendientes los valores definitivos
 * (asuntos abiertos: duración del código, intentos permitidos y límite de solicitudes);
 * al acordarlos con backend se ajustan aquí.
 */

/** Dígitos del código de verificación. */
export const LONGITUD_CODIGO = 6;

/** Espera, en segundos, antes de poder pedir otro código. */
export const ESPERA_REENVIO_SEGUNDOS = 30;

/** Bloqueo por defecto cuando un 429 no trae `Retry-After`. */
export const ESPERA_BLOQUEO_POR_DEFECTO_SEGUNDOS = 60;

/** Vigencia del código si el backend no informa `expiraEn`. */
export const VIGENCIA_CODIGO_POR_DEFECTO_SEGUNDOS = 300;
