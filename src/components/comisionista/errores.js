/**
 * Clasifica un error de API para mostrarlo con el texto adecuado:
 * - `permiso` (403): el rol no puede hacerlo.
 * - `ajeno` (404): no existe o no es tuyo (el backend no distingue a propósito).
 * - `red`: sin conexión / sin respuesta.
 * - `vencida` (409 PROPUESTA_VENCIDA) y `otro`.
 */
export function clasificarError(e) {
  if (e?.codigo === "RED_NO_DISPONIBLE" || e?.status === 0) return "red";
  if (e?.status === 403) return "permiso";
  if (e?.status === 404) return "ajeno";
  if (e?.codigo === "PROPUESTA_VENCIDA") return "vencida";
  return "otro";
}

/** Texto para la persona; `recurso` completa el 404 («esta propuesta», «este cliente»…). */
export function textoDeError(e, recurso = "este recurso") {
  switch (clasificarError(e)) {
    case "permiso":
      return "Tu rol no permite esta acción o no tienes acceso a esta sección.";
    case "ajeno":
      return `No encontramos ${recurso}, o no está asignado a tu cuenta.`;
    case "red":
      return "No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.";
    case "vencida":
      return "La propuesta venció y ya no admite cambios.";
    default:
      return e?.mensajeUsuario ?? "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
}
