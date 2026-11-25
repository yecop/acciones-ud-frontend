import { useCallback, useRef, useState } from "react";
import { nuevoUuid } from "../api/httpClient.js";
import { autorizarOrden, crearOrden } from "../api/ordenesApi.js";

/**
 * Flujo de creación de una orden.
 *
 * Fases: `idle` → `enviando` → `exito`, con desvíos:
 *  - `confirmar`: el mercado está cerrado; hay que confirmar el encolamiento (el backend exige
 *    `confirmarEncolamiento: true`, 409 `MERCADO_CERRADO` si falta).
 *  - `autorizacion`: la orden supera el umbral y pide doble autorización (202 con
 *    `autorizacionId`); se confirma con el código en `POST /ordenes/autorizar`.
 *  - `error`: falló; `reintentable` indica si tiene sentido volver a intentar el mismo envío.
 *
 * Idempotencia: cada cuerpo distinto lleva su propia `Idempotency-Key`. Si el envío falla de forma
 * ambigua (sin respuesta, 5xx), un reintento reutiliza la MISMA clave para no duplicar la orden.
 * Si falla de forma definitiva (4xx) o termina bien, la clave se descarta.
 *
 * @param {{onCreada?:(orden:object)=>void}} [opciones]
 */
export function useCrearOrden({ onCreada } = {}) {
  const [estado, setEstado] = useState({ fase: "idle" });
  const claves = useRef(new Map());
  const ultima = useRef(null);

  const claveDe = (cuerpo) => {
    const huella = JSON.stringify(cuerpo);
    if (!claves.current.has(huella)) claves.current.set(huella, nuevoUuid());
    return { huella, clave: claves.current.get(huella) };
  };

  const terminar = useCallback(
    (orden) => {
      claves.current.clear();
      setEstado({ fase: "exito", orden });
      onCreada?.(orden);
    },
    [onCreada]
  );

  const enviarAhora = useCallback(
    async (cuerpo, resumen) => {
      ultima.current = { cuerpo, resumen };
      const { huella, clave } = claveDe(cuerpo);
      setEstado({ fase: "enviando", resumen });
      try {
        const respuesta = await crearOrden(cuerpo, { idempotencyKey: clave });
        if (respuesta?.requiereAutorizacion) {
          setEstado({
            fase: "autorizacion",
            autorizacionId: respuesta.autorizacionId,
            resumen,
            error: null,
          });
          return;
        }
        terminar(respuesta);
      } catch (e) {
        const ambiguo = !e?.status || e.status >= 500;
        if (!ambiguo) claves.current.delete(huella);
        if (e?.codigo === "MERCADO_CERRADO") {
          setEstado({
            fase: "confirmar",
            resumen,
            proximaApertura: e.datos?.proximaApertura ?? null,
            aviso: e.mensajeUsuario,
          });
          return;
        }
        setEstado({
          fase: "error",
          resumen,
          error: e?.mensajeUsuario ?? "No pudimos enviar la orden. Inténtalo de nuevo.",
          reintentable: ambiguo,
        });
      }
    },
    [terminar]
  );

  /** Envía la orden; con el mercado cerrado pide antes la confirmación del encolamiento. */
  const enviar = useCallback(
    (solicitud, { encolada = false, resumen } = {}) => {
      if (encolada) {
        ultima.current = { cuerpo: solicitud, resumen };
        setEstado({ fase: "confirmar", resumen, proximaApertura: null, aviso: null });
        return Promise.resolve();
      }
      return enviarAhora(solicitud, resumen);
    },
    [enviarAhora]
  );

  const confirmarEncolamiento = useCallback(() => {
    const { cuerpo, resumen } = ultima.current ?? {};
    if (!cuerpo) return Promise.resolve();
    return enviarAhora({ ...cuerpo, confirmarEncolamiento: true }, resumen);
  }, [enviarAhora]);

  const reintentar = useCallback(() => {
    const { cuerpo, resumen } = ultima.current ?? {};
    if (!cuerpo) return Promise.resolve();
    return enviarAhora(cuerpo, resumen);
  }, [enviarAhora]);

  const autorizar = useCallback(
    async (codigoAutorizacion) => {
      const actual = estado;
      if (actual.fase !== "autorizacion") return;
      if (!String(codigoAutorizacion ?? "").trim()) {
        setEstado({ ...actual, error: "Escribe el código de autorización." });
        return;
      }
      setEstado({ ...actual, enviando: true, error: null });
      try {
        const orden = await autorizarOrden({
          autorizacionId: actual.autorizacionId,
          codigoAutorizacion: String(codigoAutorizacion).trim(),
        });
        terminar(orden);
      } catch (e) {
        setEstado({
          ...actual,
          enviando: false,
          error: e?.mensajeUsuario ?? "No pudimos validar el código.",
        });
      }
    },
    [estado, terminar]
  );

  const reiniciar = useCallback(() => {
    ultima.current = null;
    claves.current.clear();
    setEstado({ fase: "idle" });
  }, []);

  return {
    estado,
    acciones: { enviar, confirmarEncolamiento, reintentar, autorizar, reiniciar },
  };
}
