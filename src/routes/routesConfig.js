import { ROLES } from "../auth/roles.js";

/** Rutas públicas. */
export const RUTAS = {
  ingreso: "/ingreso",
  verificacion: "/verificacion",
  registro: "/registro",
  sinAcceso: "/sin-acceso",
};

/**
 * Rutas protegidas y roles que pueden verlas. Fuente única para el router y la navegación:
 * el menú de cada rol se arma filtrando esta lista.
 * `pendiente` indica la tarea del backlog que construirá la pantalla real.
 */
export const RUTAS_PROTEGIDAS = [
  { id: "panel", path: "/panel", titulo: "Panel", roles: [ROLES.INV] },
  {
    id: "operar",
    path: "/operar",
    titulo: "Operar",
    roles: [ROLES.INV, ROLES.COM],
    pendiente: "Órdenes",
  },
  {
    id: "portafolio",
    path: "/portafolio",
    titulo: "Portafolio y órdenes",
    roles: [ROLES.INV],
  },
  {
    id: "perfil",
    path: "/perfil",
    titulo: "Perfil",
    roles: [ROLES.INV, ROLES.COM],
  },
  {
    id: "comisionista",
    path: "/comisionista",
    titulo: "Mis clientes",
    roles: [ROLES.COM],
    pendiente: "Comisionista",
  },
  {
    id: "admin",
    path: "/admin",
    titulo: "Administración",
    roles: [ROLES.ADM],
    pendiente: "Administración",
  },
  {
    id: "auditoria",
    path: "/auditoria",
    titulo: "Auditoría",
    roles: [ROLES.LEG],
    pendiente: "Auditoría",
  },
  {
    id: "reportes",
    path: "/reportes",
    titulo: "Reportes",
    roles: [ROLES.INV, ROLES.COM, ROLES.JD],
    pendiente: "Reportes",
  },
];

/** Pantalla a la que va cada rol después de iniciar sesión. */
export const RUTA_INICIAL_POR_ROL = {
  [ROLES.INV]: "/panel",
  [ROLES.COM]: "/comisionista",
  [ROLES.ADM]: "/admin",
  [ROLES.LEG]: "/auditoria",
  [ROLES.JD]: "/reportes",
};

export function rutaDeNavegacion(id) {
  return RUTAS_PROTEGIDAS.find((r) => r.id === id)?.path ?? "/";
}

export function rutasDelRol(rol) {
  return RUTAS_PROTEGIDAS.filter((r) => r.roles.includes(rol));
}
