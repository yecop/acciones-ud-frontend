/** Simula que la pestaña pasa a `estado` ("hidden" | "visible") y avisa con `visibilitychange`. */
export function cambiarVisibilidad(estado) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => estado });
  document.dispatchEvent(new Event("visibilitychange"));
}

export function restaurarVisibilidad() {
  delete document.visibilityState;
}
