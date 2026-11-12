import { describe, expect, it } from "vitest";
import { mensajePara, MENSAJES_ERROR } from "./errorMessages.js";

/** Catálogo de errores del contrato (§3.2). Si el backend agrega uno, se agrega aquí y al mapa. */
const CODIGOS_DEL_CONTRATO = [
  "VALIDACION_FALLIDA",
  "NO_AUTENTICADO",
  "TOKEN_EXPIRADO",
  "CREDENCIALES_INVALIDAS",
  "MFA_INVALIDO",
  "MFA_EXPIRADO",
  "PAGO_RECHAZADO",
  "ACCESO_DENEGADO",
  "USUARIO_RESTRINGIDO",
  "FUNCION_PREMIUM",
  "DOBLE_AUTORIZACION_REQUERIDA",
  "NO_ENCONTRADO",
  "MERCADO_CERRADO",
  "ORDEN_NO_CANCELABLE",
  "TRANSICION_INVALIDA",
  "CONFLICTO_IDEMPOTENCIA",
  "CORREO_DUPLICADO",
  "FONDOS_INSUFICIENTES",
  "ACCIONES_INSUFICIENTES",
  "LIMITE_DIARIO_EXCEDIDO",
  "DEMASIADAS_SOLICITUDES",
  "ERROR_INTERNO",
  "PROVEEDOR_NO_DISPONIBLE",
  "TIEMPO_AGOTADO",
];

describe("errorMessages", () => {
  it.each(CODIGOS_DEL_CONTRATO)("traduce %s a un mensaje en español", (codigo) => {
    expect(MENSAJES_ERROR[codigo]).toBeTruthy();
    expect(mensajePara(codigo)).toBe(MENSAJES_ERROR[codigo]);
  });

  it("no deja códigos sin traducir respecto al contrato", () => {
    const sinMensaje = CODIGOS_DEL_CONTRATO.filter((c) => !MENSAJES_ERROR[c]);
    expect(sinMensaje).toEqual([]);
  });

  it("cae al mensaje del código HTTP cuando el código de negocio es desconocido", () => {
    expect(mensajePara("CODIGO_NUEVO", 403)).toBe(MENSAJES_ERROR.ACCESO_DENEGADO);
    expect(mensajePara(undefined, 503)).toBe(MENSAJES_ERROR.ERROR_INTERNO);
  });

  it("usa un mensaje genérico si no hay nada que traducir", () => {
    expect(mensajePara(undefined, 418)).toMatch(/algo salió mal/i);
  });
});
