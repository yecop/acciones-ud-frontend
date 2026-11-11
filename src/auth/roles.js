/** Roles del contrato (§1.3). Las pantallas y rutas se protegen con estas abreviaturas. */
export const ROLES = {
  INV: "INV", // Inversionista
  COM: "COM", // Comisionista
  ADM: "ADM", // Administrador de la plataforma
  LEG: "LEG", // Responsable legal / cumplimiento
  JD: "JD", // Junta directiva
};

export const ETIQUETA_ROL = {
  INV: "Inversionista",
  COM: "Comisionista",
  ADM: "Administrador",
  LEG: "Legal y auditoría",
  JD: "Junta directiva",
};

/**
 * El backend devuelve el rol como texto (el contrato muestra "INVERSIONISTA"). Se acepta
 * tanto la abreviatura como el nombre completo y se normaliza a la abreviatura.
 * Asunto abierto: confirmar con backend los valores exactos de los demás roles.
 */
const ALIAS = {
  INV: ROLES.INV,
  INVERSIONISTA: ROLES.INV,
  COM: ROLES.COM,
  COMISIONISTA: ROLES.COM,
  ADM: ROLES.ADM,
  ADMIN: ROLES.ADM,
  ADMINISTRADOR: ROLES.ADM,
  LEG: ROLES.LEG,
  LEGAL: ROLES.LEG,
  AUDITORIA: ROLES.LEG,
  JD: ROLES.JD,
  JUNTA: ROLES.JD,
  JUNTA_DIRECTIVA: ROLES.JD,
};

/** @returns {string|null} abreviatura del rol o null si no se reconoce. */
export function normalizarRol(rol) {
  if (!rol) return null;
  const clave = String(rol)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
  return ALIAS[clave] ?? null;
}
