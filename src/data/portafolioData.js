/**
 * Datos de ejemplo para la vista de saldo y portafolio (SCRUM-25).
 *
 * La forma coincide con la respuesta del backend (montos como texto con 2
 * decimales), por lo que la respuesta REST puede reemplazar estos objetos
 * directamente. Se usan como estado inicial / respaldo visual.
 */

/** Respuesta de ejemplo de GET /api/v1/cuenta/saldo. */
export const saldoEjemplo = {
  disponible: "100000.00",
  reservado: "0.00",
  total: "100000.00",
};

/** Respuesta de ejemplo de GET /api/v1/portafolio. */
export const resumenEjemplo = {
  valorTotal: "0.00",
  costoTotal: "0.00",
  gananciaPerdidaTotal: "0.00",
  porcentajeGananciaPerdidaTotal: "0.00",
  numeroPosiciones: 0,
};

/** Respuesta de ejemplo de GET /api/v1/portafolio/posiciones (usuario nuevo). */
export const posicionesEjemplo = [];
