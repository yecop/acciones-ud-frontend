import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./ApiError.js";
import { createHttpClient } from "./httpClient.js";

/** Respuesta JSON mínima compatible con lo que lee el cliente. */
function respuesta(status, cuerpo, cabeceras = {}) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...cabeceras },
  });
}

const tokenExpirado = () =>
  respuesta(401, { status: 401, codigo: "TOKEN_EXPIRADO", mensaje: "venció", traceId: "t-1" });

function crear({ fetchImpl, refresh, getRefreshToken, onSessionExpired } = {}) {
  let access = "access-viejo";
  const refrescar =
    refresh ??
    vi.fn(async () => {
      access = "access-nuevo";
    });
  const cliente = createHttpClient({
    baseUrl: "http://api.test/api/v1",
    getAccessToken: () => access,
    getRefreshToken,
    refresh: refrescar,
    onSessionExpired,
    fetchImpl,
    esperar: async () => {},
  });
  return { cliente, refrescar, getAccess: () => access, setAccess: (v) => (access = v) };
}

describe("httpClient · solicitud", () => {
  it("envía Authorization y un X-Trace-Id UUID nuevo en cada solicitud", async () => {
    const fetchImpl = vi.fn(async () => respuesta(200, { ok: true }));
    const { cliente } = crear({ fetchImpl });

    await cliente.get("/perfil");
    await cliente.get("/perfil");

    const [url, init1] = fetchImpl.mock.calls[0];
    const init2 = fetchImpl.mock.calls[1][1];
    expect(url).toBe("http://api.test/api/v1/perfil");
    expect(init1.headers.Authorization).toBe("Bearer access-viejo");
    expect(init1.headers["X-Trace-Id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(init2.headers["X-Trace-Id"]).not.toBe(init1.headers["X-Trace-Id"]);
  });

  it("no envía Authorization en endpoints públicos (auth: false)", async () => {
    const fetchImpl = vi.fn(async () => respuesta(200, {}));
    const { cliente } = crear({ fetchImpl });

    await cliente.post("/auth/login", { correo: "a@b.co" }, { auth: false });

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("serializa el cuerpo y los parámetros de consulta, omitiendo los vacíos", async () => {
    const fetchImpl = vi.fn(async () => respuesta(200, {}));
    const { cliente } = crear({ fetchImpl });

    await cliente.get("/acciones", { query: { mercado: "NYSE", q: "", pagina: 0 } });
    await cliente.post("/ordenes", { ticker: "AAPL" });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      "http://api.test/api/v1/acciones?mercado=NYSE&pagina=0"
    );
    expect(fetchImpl.mock.calls[1][1].body).toBe('{"ticker":"AAPL"}');
    expect(fetchImpl.mock.calls[1][1].headers["Content-Type"]).toBe("application/json");
  });

  it("devuelve null en respuestas 204", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const { cliente } = crear({ fetchImpl });

    await expect(cliente.delete("/perfil/comisionista")).resolves.toBeNull();
  });
});

describe("httpClient · renovación automática ante TOKEN_EXPIRADO", () => {
  let fetchImpl;

  beforeEach(() => {
    fetchImpl = vi.fn();
  });

  it("renueva una vez y repite la solicitud con el token nuevo, sin que falle", async () => {
    fetchImpl
      .mockResolvedValueOnce(tokenExpirado())
      .mockResolvedValueOnce(respuesta(200, { nombre: "Laura" }));
    const { cliente, refrescar } = crear({ fetchImpl });

    await expect(cliente.get("/perfil")).resolves.toEqual({ nombre: "Laura" });

    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer access-viejo");
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe("Bearer access-nuevo");
  });

  it("reutiliza el mismo X-Trace-Id en el reintento para correlacionar ambos intentos", async () => {
    fetchImpl.mockResolvedValueOnce(tokenExpirado()).mockResolvedValueOnce(respuesta(200, {}));
    const { cliente } = crear({ fetchImpl });

    await cliente.get("/perfil");

    expect(fetchImpl.mock.calls[1][1].headers["X-Trace-Id"]).toBe(
      fetchImpl.mock.calls[0][1].headers["X-Trace-Id"]
    );
  });

  it("reintenta UNA sola vez: si vuelve a vencer, falla sin entrar en bucle", async () => {
    fetchImpl.mockImplementation(async () => tokenExpirado());
    const { cliente, refrescar } = crear({ fetchImpl });

    await expect(cliente.get("/perfil")).rejects.toMatchObject({ codigo: "TOKEN_EXPIRADO" });

    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("varias solicitudes simultáneas con 401 comparten una sola renovación", async () => {
    let vencido = true;
    fetchImpl.mockImplementation(async (_url, init) =>
      vencido && init.headers.Authorization === "Bearer access-viejo"
        ? tokenExpirado()
        : respuesta(200, { ok: true })
    );
    let liberar;
    const pausa = new Promise((resolve) => {
      liberar = resolve;
    });
    const { cliente, refrescar, setAccess } = crear({
      fetchImpl,
      refresh: vi.fn(async () => {
        await pausa;
        setAccess("access-nuevo");
        vencido = false;
      }),
    });

    const llamadas = Promise.all([cliente.get("/a"), cliente.get("/b"), cliente.get("/c")]);
    await vi.waitFor(() => expect(refrescar).toHaveBeenCalledTimes(1));
    liberar();

    await expect(llamadas).resolves.toHaveLength(3);
    expect(refrescar).toHaveBeenCalledTimes(1);
  });

  it("si la renovación falla, cierra la sesión y lanza SESION_EXPIRADA", async () => {
    fetchImpl.mockResolvedValue(tokenExpirado());
    const onSessionExpired = vi.fn();
    const { cliente } = crear({
      fetchImpl,
      refresh: vi.fn(async () => {
        throw new Error("refresh rechazado");
      }),
      onSessionExpired,
    });

    await expect(cliente.get("/perfil")).rejects.toMatchObject({
      status: 401,
      codigo: "SESION_EXPIRADA",
    });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("no intenta renovar ante otros 401 (p. ej. NO_AUTENTICADO)", async () => {
    fetchImpl.mockResolvedValue(respuesta(401, { status: 401, codigo: "NO_AUTENTICADO" }));
    const { cliente, refrescar } = crear({ fetchImpl });

    await expect(cliente.get("/perfil")).rejects.toMatchObject({ codigo: "NO_AUTENTICADO" });
    expect(refrescar).not.toHaveBeenCalled();
  });

  it("al recargar la pestaña (hay refresh token pero no access token) renueva antes de pedir", async () => {
    fetchImpl.mockResolvedValue(respuesta(200, { ok: true }));
    const { cliente, refrescar, setAccess } = crear({
      fetchImpl,
      getRefreshToken: () => "refresh-guardado",
      refresh: vi.fn(async () => setAccess("access-nuevo")),
    });
    setAccess(null);

    await cliente.get("/perfil");

    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer access-nuevo");
  });
});

describe("httpClient · errores", () => {
  it("convierte el cuerpo de error del contrato en ApiError con mensaje traducido", async () => {
    const fetchImpl = vi.fn(async () =>
      respuesta(
        422,
        {
          status: 422,
          codigo: "FONDOS_INSUFICIENTES",
          mensaje: "El saldo disponible no cubre el total...",
          traceId: "9f1c2a7e",
          detalles: [{ campo: "cantidad", problema: "Excede los fondos disponibles" }],
          datos: { requerido: "2550.00", disponible: "2500.00" },
        },
        { "X-Trace-Id": "9f1c2a7e" }
      )
    );
    const { cliente } = crear({ fetchImpl });

    const error = await cliente.post("/ordenes", {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.codigo).toBe("FONDOS_INSUFICIENTES");
    expect(error.message).toBe("Tu saldo no cubre el total de la orden más la comisión.");
    expect(error.problemaDeCampo("cantidad")).toBe("Excede los fondos disponibles");
    expect(error.datos.requerido).toBe("2550.00");
    expect(error.esInesperado).toBe(false);
  });

  it("en errores inesperados el mensaje incluye el traceId para soporte", async () => {
    const fetchImpl = vi.fn(async () =>
      respuesta(500, { status: 500, codigo: "ERROR_INTERNO", traceId: "abc-123" })
    );
    const { cliente } = crear({ fetchImpl });

    const error = await cliente.get("/perfil").catch((e) => e);

    expect(error.esInesperado).toBe(true);
    expect(error.mensajeUsuario).toContain("abc-123");
  });

  it("usa un mensaje por código HTTP si el cuerpo no trae `codigo` conocido ni es JSON", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 }));
    const { cliente } = crear({ fetchImpl });

    const error = await cliente.get("/perfil").catch((e) => e);

    expect(error.status).toBe(502);
    expect(error.message).toMatch(/proveedor externo/i);
  });

  it("traduce un fallo de red a RED_NO_DISPONIBLE (status 0)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const { cliente } = crear({ fetchImpl });

    await expect(cliente.get("/perfil")).rejects.toMatchObject({
      status: 0,
      codigo: "RED_NO_DISPONIBLE",
    });
  });

  it("expone Retry-After en los 429", async () => {
    const fetchImpl = vi.fn(async () =>
      respuesta(429, { status: 429, codigo: "DEMASIADAS_SOLICITUDES" }, { "Retry-After": "30" })
    );
    const { cliente } = crear({ fetchImpl });

    await expect(cliente.get("/perfil")).rejects.toMatchObject({ retryAfter: 30 });
  });

  it("no oculta los AbortError", async () => {
    const abortar = Object.assign(new Error("abortado"), { name: "AbortError" });
    const fetchImpl = vi.fn(async () => {
      throw abortar;
    });
    const { cliente } = crear({ fetchImpl });

    await expect(cliente.get("/perfil")).rejects.toBe(abortar);
  });
});

describe("httpClient · Idempotency-Key", () => {
  it("envía la cabecera cuando se indica", async () => {
    const fetchImpl = vi.fn(async () => respuesta(201, { id: "1" }));
    const { cliente } = crear({ fetchImpl });

    await cliente.post("/ordenes", {}, { idempotencyKey: "clave-1" });

    expect(fetchImpl.mock.calls[0][1].headers["Idempotency-Key"]).toBe("clave-1");
  });

  it("ante 502, 504 o fallo de red reintenta con la MISMA clave", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(respuesta(502, { status: 502, codigo: "PROVEEDOR_NO_DISPONIBLE" }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(respuesta(201, { id: "orden-1" }));
    const { cliente } = crear({ fetchImpl });

    await expect(cliente.post("/ordenes", {}, { idempotencyKey: "clave-7" })).resolves.toEqual({
      id: "orden-1",
    });

    const claves = fetchImpl.mock.calls.map(([, init]) => init.headers["Idempotency-Key"]);
    expect(claves).toEqual(["clave-7", "clave-7", "clave-7"]);
  });

  it("sin Idempotency-Key no reintenta nunca solo", async () => {
    const fetchImpl = vi.fn(async () => respuesta(502, { status: 502 }));
    const { cliente } = crear({ fetchImpl });

    await expect(cliente.post("/ordenes", {})).rejects.toMatchObject({ status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("no reintenta errores de negocio (422)", async () => {
    const fetchImpl = vi.fn(async () =>
      respuesta(422, { status: 422, codigo: "FONDOS_INSUFICIENTES" })
    );
    const { cliente } = crear({ fetchImpl });

    await expect(cliente.post("/ordenes", {}, { idempotencyKey: "clave-9" })).rejects.toMatchObject(
      { codigo: "FONDOS_INSUFICIENTES" }
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
