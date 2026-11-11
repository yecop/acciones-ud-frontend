/**
 * Traducción de los códigos de negocio del contrato (catálogo de errores, §3.2)
 * a mensajes para la persona usuaria. El frontend decide por `codigo`, nunca por
 * el texto `mensaje` del servidor.
 */
export const MENSAJES_ERROR = {
  // 400
  VALIDACION_FALLIDA: "Revisa los datos ingresados e inténtalo de nuevo.",
  // 401
  NO_AUTENTICADO: "Debes iniciar sesión para continuar.",
  TOKEN_EXPIRADO: "Tu sesión venció. Estamos renovándola.",
  CREDENCIALES_INVALIDAS: "Correo o contraseña incorrectos.",
  MFA_INVALIDO: "El código de verificación es incorrecto.",
  // 402
  PAGO_RECHAZADO: "El pago fue rechazado. Revisa tu medio de pago e inténtalo de nuevo.",
  // 403
  ACCESO_DENEGADO: "No tienes permiso para realizar esta acción.",
  USUARIO_RESTRINGIDO: "Tu cuenta tiene operaciones restringidas. Contacta a soporte.",
  FUNCION_PREMIUM: "Esta función requiere una suscripción Premium activa.",
  DOBLE_AUTORIZACION_REQUERIDA:
    "Esta orden supera el umbral configurado y requiere un código de autorización adicional.",
  // 404
  NO_ENCONTRADO: "No encontramos lo que buscas.",
  // 409
  MERCADO_CERRADO: "El mercado está cerrado. Puedes encolar la orden para la próxima apertura.",
  ORDEN_NO_CANCELABLE: "La orden ya no se puede cancelar porque el mercado ya la procesó.",
  TRANSICION_INVALIDA: "El estado actual no permite esta acción.",
  CONFLICTO_IDEMPOTENCIA: "Esta solicitud ya se envió con datos distintos. Vuelve a intentarlo.",
  CORREO_DUPLICADO: "Ya existe una cuenta con este correo.",
  // 410
  MFA_EXPIRADO: "El código de verificación venció. Solicita uno nuevo.",
  // 422
  FONDOS_INSUFICIENTES: "Tu saldo no cubre el total de la orden más la comisión.",
  ACCIONES_INSUFICIENTES: "No tienes suficientes acciones para vender esa cantidad.",
  LIMITE_DIARIO_EXCEDIDO: "Alcanzaste el máximo de operaciones diarias de tu perfil.",
  // 429
  DEMASIADAS_SOLICITUDES: "Hiciste demasiadas solicitudes. Espera un momento e inténtalo otra vez.",
  // 5xx
  ERROR_INTERNO: "Ocurrió un error inesperado de nuestro lado.",
  PROVEEDOR_NO_DISPONIBLE:
    "Un proveedor externo no responde en este momento. Tus fondos reservados se liberan; inténtalo de nuevo.",
  TIEMPO_AGOTADO: "El proveedor tardó demasiado en responder. Inténtalo de nuevo.",

  // Códigos propios del cliente (no vienen del backend)
  RED_NO_DISPONIBLE: "No pudimos conectarnos al servidor. Revisa tu conexión.",
  SESION_EXPIRADA: "Tu sesión expiró. Inicia sesión de nuevo.",
};

/** Mensaje de respaldo por código HTTP cuando el backend no envía un `codigo` conocido. */
const MENSAJE_POR_STATUS = {
  400: MENSAJES_ERROR.VALIDACION_FALLIDA,
  401: MENSAJES_ERROR.NO_AUTENTICADO,
  402: MENSAJES_ERROR.PAGO_RECHAZADO,
  403: MENSAJES_ERROR.ACCESO_DENEGADO,
  404: MENSAJES_ERROR.NO_ENCONTRADO,
  429: MENSAJES_ERROR.DEMASIADAS_SOLICITUDES,
  502: MENSAJES_ERROR.PROVEEDOR_NO_DISPONIBLE,
  504: MENSAJES_ERROR.TIEMPO_AGOTADO,
};

const MENSAJE_GENERICO = "Algo salió mal. Inténtalo de nuevo.";

/**
 * @param {string|undefined} codigo Código de negocio (`codigo` del cuerpo de error).
 * @param {number} [status] Código HTTP, usado como respaldo.
 * @returns {string}
 */
export function mensajePara(codigo, status) {
  if (codigo && MENSAJES_ERROR[codigo]) return MENSAJES_ERROR[codigo];
  if (status && MENSAJE_POR_STATUS[status]) return MENSAJE_POR_STATUS[status];
  if (status >= 500) return MENSAJES_ERROR.ERROR_INTERNO;
  return MENSAJE_GENERICO;
}
