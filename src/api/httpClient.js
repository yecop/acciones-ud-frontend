import { ApiError } from "./ApiError.js";

/** UUID v4 para `X-Trace-Id` e `Idempotency-Key`. */
export function nuevoUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Respaldo para entornos sin crypto.randomUUID (no criptográfico, solo correlación).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const ESTADOS_REINTENTABLES = new Set([0, 502, 504]);

/**
 * Crea un cliente HTTP para el contrato de la API REST.
 *
 * Interceptores de solicitud:
 *   - `Authorization: Bearer <accessToken>` (salvo `auth: false`).
 *   - `X-Trace-Id` nuevo por solicitud (UUID); se reutiliza en el reintento tras renovar token.
 *   - `Idempotency-Key` cuando la llamada lo pide (`idempotencyKey`).
 *
 * Interceptores de respuesta:
 *   - 401 `TOKEN_EXPIRADO`: renueva el token UNA sola vez (varias solicitudes simultáneas
 *     comparten la misma renovación) y repite la solicitud original una sola vez. Si la
 *     renovación falla, cierra la sesión (`onSessionExpired`).
 *   - Cualquier error se convierte en `ApiError` con el mensaje traducido.
 *   - Con `idempotencyKey`, ante 502/504/fallo de red reintenta con la MISMA clave.
 *
 * @param {object} deps
 * @param {string} deps.baseUrl                       p. ej. "/api/v1" o "https://x.com/api/v1".
 * @param {() => string|null} deps.getAccessToken
 * @param {() => string|null} [deps.getRefreshToken]
 * @param {() => Promise<void>} deps.refresh          Renueva y guarda los tokens; lanza si falla.
 * @param {() => void} [deps.onSessionExpired]
 * @param {typeof fetch} [deps.fetchImpl]
 * @param {number} [deps.maxReintentosIdempotentes=2]
 * @param {(n:number) => Promise<void>} [deps.esperar] Pausa entre reintentos (inyectable en pruebas).
 */
export function createHttpClient({
  baseUrl,
  getAccessToken,
  getRefreshToken = () => null,
  refresh,
  onSessionExpired = () => {},
  fetchImpl,
  maxReintentosIdempotentes = 2,
  esperar = (n) => new Promise((resolve) => setTimeout(resolve, 300 * n)),
}) {
  let renovacionEnCurso = null;

  /** Renovación compartida: N solicitudes con 401 simultáneo provocan un solo `/auth/refresh`. */
  function renovarUnaVez() {
    if (!renovacionEnCurso) {
      renovacionEnCurso = Promise.resolve()
        .then(refresh)
        .finally(() => {
          renovacionEnCurso = null;
        });
    }
    return renovacionEnCurso;
  }

  function construirUrl(ruta, query) {
    const url = `${baseUrl}${ruta}`;
    if (!query) return url;
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
    });
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  async function leerError(respuesta, traceIdEnviado) {
    let cuerpo = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      /* sin cuerpo JSON */
    }
    const retryAfter = Number(respuesta.headers.get("Retry-After"));
    return new ApiError({
      status: respuesta.status,
      codigo: cuerpo?.codigo,
      mensajeServidor: cuerpo?.mensaje,
      traceId: cuerpo?.traceId ?? respuesta.headers.get("X-Trace-Id") ?? traceIdEnviado,
      detalles: cuerpo?.detalles,
      datos: cuerpo?.datos,
      retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    });
  }

  async function leerExito(respuesta) {
    if (respuesta.status === 204) return null;
    const texto = await respuesta.text();
    return texto ? JSON.parse(texto) : null;
  }

  async function enviar(ruta, opciones, estado) {
    const {
      method = "GET",
      body,
      query,
      auth = true,
      idempotencyKey,
      headers = {},
      signal,
    } = opciones;
    const traceId = estado.traceId;
    const fetchFn = fetchImpl ?? globalThis.fetch.bind(globalThis);

    // Recarga de pestaña: hay refresh token pero el access token (en memoria) se perdió.
    if (auth && !getAccessToken() && getRefreshToken()) {
      try {
        await renovarUnaVez();
      } catch {
        onSessionExpired();
        throw new ApiError({ status: 401, codigo: "SESION_EXPIRADA", traceId });
      }
    }

    const cabeceras = {
      Accept: "application/json",
      "X-Trace-Id": traceId,
      ...headers,
    };
    if (body !== undefined) cabeceras["Content-Type"] = "application/json";
    if (idempotencyKey) cabeceras["Idempotency-Key"] = idempotencyKey;
    const token = auth ? getAccessToken() : null;
    if (token) cabeceras.Authorization = `Bearer ${token}`;

    let respuesta;
    try {
      respuesta = await fetchFn(construirUrl(ruta, query), {
        method,
        headers: cabeceras,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      respuesta = null;
    }

    if (respuesta?.ok) return leerExito(respuesta);

    const error = respuesta
      ? await leerError(respuesta, traceId)
      : new ApiError({ status: 0, codigo: "RED_NO_DISPONIBLE", traceId });

    // 401 TOKEN_EXPIRADO: renovar y repetir una sola vez.
    if (auth && error.status === 401 && error.codigo === "TOKEN_EXPIRADO" && !estado.renovado) {
      try {
        await renovarUnaVez();
      } catch {
        onSessionExpired();
        throw new ApiError({ status: 401, codigo: "SESION_EXPIRADA", traceId: error.traceId });
      }
      return enviar(ruta, opciones, { ...estado, renovado: true });
    }

    // Idempotentes: 502 / 504 / red => misma clave, nunca una nueva.
    if (
      idempotencyKey &&
      ESTADOS_REINTENTABLES.has(error.status) &&
      estado.reintentos < maxReintentosIdempotentes
    ) {
      await esperar(estado.reintentos + 1);
      return enviar(ruta, opciones, { ...estado, reintentos: estado.reintentos + 1 });
    }

    throw error;
  }

  /**
   * @param {string} ruta Ruta del contrato SIN prefijo (p. ej. "/perfil").
   * @param {object} [opciones]
   * @param {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} [opciones.method]
   * @param {object} [opciones.body]
   * @param {object} [opciones.query]
   * @param {boolean} [opciones.auth=true]   false en endpoints PUB.
   * @param {string} [opciones.idempotencyKey]
   * @param {string} [opciones.traceId]      Para correlacionar con una acción de la UI.
   * @param {AbortSignal} [opciones.signal]
   */
  function request(ruta, opciones = {}) {
    return enviar(ruta, opciones, {
      traceId: opciones.traceId ?? nuevoUuid(),
      renovado: false,
      reintentos: 0,
    });
  }

  return {
    request,
    get: (ruta, opciones) => request(ruta, { ...opciones, method: "GET" }),
    post: (ruta, body, opciones) => request(ruta, { ...opciones, method: "POST", body }),
    put: (ruta, body, opciones) => request(ruta, { ...opciones, method: "PUT", body }),
    patch: (ruta, body, opciones) => request(ruta, { ...opciones, method: "PATCH", body }),
    delete: (ruta, opciones) => request(ruta, { ...opciones, method: "DELETE" }),
  };
}
