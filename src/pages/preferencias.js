// Extensiones de preferencias a confirmar con el contrato del backend.
export const TIPOS_ORDEN = {
  MARKET: "Mercado",
  LIMIT: "Límite",
  STOP_LOSS: "Stop loss",
  TAKE_PROFIT: "Take profit",
};
export const VISTAS_PORTAFOLIO = { TABLA: "Tabla", TARJETAS: "Tarjetas" };
export const CANALES = { EMAIL: "Correo electrónico", SMS: "SMS", WHATSAPP: "WhatsApp" };
export const TEMAS = {
  esmeralda: "Esmeralda Tradicional",
  neon: "Verde Neón",
  bosque: "Verde Bosque",
};

/** Conserva los campos desconocidos: PUT reemplaza el documento completo. */
export function completarPreferencias(p = {}) {
  return {
    ...p,
    notificaciones: { canales: [], reporteMensual: false, ...p.notificaciones },
    visualizacion: { tema: "esmeralda", portafolio: "TABLA", ...p.visualizacion },
    operaciones: {
      tipoOrdenPorDefecto: "MARKET",
      limiteDiario: "",
      dobleAutorizacion: false,
      umbralOrdenGrande: "",
      ...p.operaciones,
    },
  };
}

export function montoValido(valor) {
  return /^\d{1,12}(\.\d{1,2})?$/.test(String(valor)) && Number(valor) > 0;
}

export function validarDatosBasicos(datos) {
  const e = {};
  if (!datos.nombre.trim()) e.nombre = "Ingresa tu nombre completo.";
  if (datos.nombre.trim().length > 120) e.nombre = "Usa como máximo 120 caracteres.";
  if (!/^\+?\d{7,15}$/.test(datos.celular.replace(/[\s()-]/g, "")))
    e.celular = "Ingresa un celular válido (7 a 15 dígitos).";
  return e;
}

export function validarPreferencias(p) {
  const e = {};
  if (
    !Array.isArray(p.notificaciones.canales) ||
    !p.notificaciones.canales.length ||
    p.notificaciones.canales.some((c) => !CANALES[c])
  )
    e["notificaciones.canales"] = "Selecciona al menos un canal de notificación válido.";
  if (!TEMAS[p.visualizacion.tema]) e["visualizacion.tema"] = "Selecciona un tema disponible.";
  if (!VISTAS_PORTAFOLIO[p.visualizacion.portafolio])
    e["visualizacion.portafolio"] = "Selecciona una vista disponible.";
  if (!TIPOS_ORDEN[p.operaciones.tipoOrdenPorDefecto])
    e["operaciones.tipoOrdenPorDefecto"] =
      "Selecciona un tipo de orden disponible. Trailing stop no está habilitado.";
  if (!montoValido(p.operaciones.limiteDiario))
    e["operaciones.limiteDiario"] =
      "Ingresa un límite mayor que cero, con hasta 12 enteros y 2 decimales.";
  if (p.operaciones.dobleAutorizacion && !montoValido(p.operaciones.umbralOrdenGrande))
    e["operaciones.umbralOrdenGrande"] =
      "Ingresa un umbral mayor que cero, con hasta 12 enteros y 2 decimales.";
  return e;
}

export function erroresDelServidor(error) {
  return error.codigo === "VALIDACION_FALLIDA" && Array.isArray(error.detalles)
    ? Object.fromEntries(
        error.detalles.filter((d) => d.campo && d.problema).map((d) => [d.campo, d.problema])
      )
    : {};
}
