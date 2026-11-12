import { describe, expect, it } from "vitest";
import * as authApi from "../api/authApi.js";
import { http } from "../api/http.js";
import * as perfilApi from "../api/perfilApi.js";
import { session } from "../auth/session.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO, db } from "./db.js";

/** Abre sesión completa (login + MFA) contra el mock, como lo hace la app. */
async function abrirSesion(correo = "laura@correo.com") {
  const reto = await authApi.iniciarSesion({ correo, contrasena: CONTRASENA_DEMO });
  const respuesta = await authApi.verificarMfa({
    mfaToken: reto.mfaToken,
    codigo: CODIGO_MFA_VALIDO,
  });
  session.setTokens(respuesta);
  return respuesta;
}

describe("mock · autenticación", () => {
  it("login + MFA emiten tokens y datos del usuario", async () => {
    const reto = await authApi.iniciarSesion({
      correo: "laura@correo.com",
      contrasena: CONTRASENA_DEMO,
    });
    expect(reto).toMatchObject({ canal: "EMAIL", expiraEn: 300 });

    const sesion = await authApi.verificarMfa({
      mfaToken: reto.mfaToken,
      codigo: CODIGO_MFA_VALIDO,
    });
    expect(sesion).toMatchObject({
      tokenType: "Bearer",
      usuario: { nombre: "Laura", rol: "INVERSIONISTA" },
    });
    expect(sesion.accessToken).toBeTruthy();
    expect(sesion.refreshToken).toBeTruthy();
  });

  it("credenciales incorrectas responden 401 CREDENCIALES_INVALIDAS con traceId", async () => {
    const error = await authApi
      .iniciarSesion({ correo: "laura@correo.com", contrasena: "mala" })
      .catch((e) => e);

    expect(error).toMatchObject({ status: 401, codigo: "CREDENCIALES_INVALIDAS" });
    expect(error.traceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(error.message).toBe("Correo o contraseña incorrectos.");
  });

  it("código MFA incorrecto → 401 MFA_INVALIDO; vencido → 410 MFA_EXPIRADO", async () => {
    const { mfaToken } = await authApi.iniciarSesion({
      correo: "laura@correo.com",
      contrasena: CONTRASENA_DEMO,
    });

    await expect(authApi.verificarMfa({ mfaToken, codigo: "000000" })).rejects.toMatchObject({
      status: 401,
      codigo: "MFA_INVALIDO",
    });
    await expect(authApi.verificarMfa({ mfaToken, codigo: "111111" })).rejects.toMatchObject({
      status: 410,
      codigo: "MFA_EXPIRADO",
    });
  });

  it("limita los intentos de MFA con 429 y Retry-After", async () => {
    const { mfaToken } = await authApi.iniciarSesion({
      correo: "laura@correo.com",
      contrasena: CONTRASENA_DEMO,
    });
    for (let i = 0; i < 5; i += 1) {
      await authApi.verificarMfa({ mfaToken, codigo: "000000" }).catch(() => {});
    }

    await expect(
      authApi.verificarMfa({ mfaToken, codigo: CODIGO_MFA_VALIDO })
    ).rejects.toMatchObject({
      status: 429,
      codigo: "DEMASIADAS_SOLICITUDES",
      retryAfter: 30,
    });
  });

  it("registro valida campos (400 con detalles) y rechaza correos repetidos (409)", async () => {
    const invalido = await http
      .post("/auth/registro", { correo: "x", contrasena: "123", nombre: "" }, { auth: false })
      .catch((e) => e);
    expect(invalido).toMatchObject({ status: 400, codigo: "VALIDACION_FALLIDA" });
    expect(invalido.problemaDeCampo("correo")).toBeTruthy();

    await expect(
      http.post(
        "/auth/registro",
        { correo: "laura@correo.com", contrasena: "Segura123", nombre: "Otra" },
        { auth: false }
      )
    ).rejects.toMatchObject({ status: 409, codigo: "CORREO_DUPLICADO" });
  });
});

describe("mock · renovación de token sin que el usuario lo note", () => {
  it("un 401 TOKEN_EXPIRADO se resuelve solo: la llamada original termina bien", async () => {
    await abrirSesion();
    const tokenAnterior = session.getAccessToken();

    db.expirarAccessTokens(); // simula que pasó el tiempo de vida del access token

    const perfil = await perfilApi.obtenerPerfil();

    expect(perfil.nombre).toBe("Laura");
    expect(db.contadores.refresh).toBe(1);
    expect(session.getAccessToken()).not.toBe(tokenAnterior);
  });

  it("después de renovar, las siguientes llamadas no vuelven a renovar", async () => {
    await abrirSesion();
    db.expirarAccessTokens();

    await perfilApi.obtenerPerfil();
    await perfilApi.obtenerPerfil();
    await http.get("/mercados");

    expect(db.contadores.refresh).toBe(1);
  });

  it("varias llamadas simultáneas con el token vencido provocan una sola renovación", async () => {
    await abrirSesion();
    db.expirarAccessTokens();

    const resultados = await Promise.all([
      perfilApi.obtenerPerfil(),
      http.get("/mercados"),
      http.get("/cuenta/saldo"),
    ]);

    expect(resultados).toHaveLength(3);
    expect(db.contadores.refresh).toBe(1);
  });

  it("si el refresh token ya no sirve, la sesión se cierra (SESION_EXPIRADA)", async () => {
    await abrirSesion();
    db.expirarAccessTokens();
    db.tokensRefresh.clear(); // el backend ya no reconoce el refresh token

    let expiradas = 0;
    const cancelar = session.onExpirada(() => {
      expiradas += 1;
    });

    await expect(perfilApi.obtenerPerfil()).rejects.toMatchObject({ codigo: "SESION_EXPIRADA" });
    expect(expiradas).toBe(1);
    expect(session.getAccessToken()).toBeNull();
    cancelar();
  });
});

describe("mock · endpoints de la semana", () => {
  it("rechaza sin token con 401 NO_AUTENTICADO", async () => {
    await expect(http.get("/perfil")).rejects.toMatchObject({
      status: 401,
      codigo: "NO_AUTENTICADO",
    });
  });

  it("respeta los roles: un comisionista no ve el saldo del inversionista (403)", async () => {
    await abrirSesion("carlos@correo.com");

    await expect(http.get("/cuenta/saldo")).rejects.toMatchObject({
      status: 403,
      codigo: "ACCESO_DENEGADO",
    });
  });

  it("perfil: PATCH valida y actualiza; preferencias se reemplazan completas", async () => {
    await abrirSesion();

    await expect(perfilApi.actualizarPerfil({ nombre: "  " })).rejects.toMatchObject({
      status: 400,
    });
    const actualizado = await perfilApi.actualizarPerfil({
      nombre: "Laura M.",
      celular: "3110000000",
    });
    expect(actualizado).toMatchObject({ nombre: "Laura M.", celular: "3110000000" });

    const preferencias = {
      notificaciones: { canales: ["EMAIL", "SMS"] },
      visualizacion: { tema: "neon" },
      operaciones: { confirmarAntesDeEnviar: false },
    };
    await expect(perfilApi.reemplazarPreferencias(preferencias)).resolves.toEqual(preferencias);
    await expect(perfilApi.obtenerPreferencias()).resolves.toEqual(preferencias);
  });

  it("comisionista: se asocia, se desasocia y valida que exista", async () => {
    await abrirSesion();
    const [primero] = await perfilApi.listarComisionistas();

    const perfil = await perfilApi.asociarComisionista({
      comisionistaId: primero.id,
      operaEnNombre: true,
    });
    expect(perfil.comisionista).toMatchObject({ id: primero.id, operaEnNombre: true });

    await expect(perfilApi.desasociarComisionista()).resolves.toBeNull();
    await expect(
      perfilApi.asociarComisionista({ comisionistaId: "no-existe" })
    ).rejects.toMatchObject({ status: 404, codigo: "NO_ENCONTRADO" });
  });

  it("mercados: lista los 5 y calcula el estado con la forma del contrato", async () => {
    await abrirSesion();

    const mercados = await http.get("/mercados");
    expect(mercados.map((m) => m.codigo)).toEqual(["NYSE", "NASDAQ", "LSE", "TSE", "ASX"]);

    const estado = await http.get("/mercados/NYSE/estado");
    expect(estado).toMatchObject({ codigo: "NYSE", zonaHoraria: "America/New_York" });
    expect(["ABIERTO", "CERRADO"]).toContain(estado.estado);
    // Abierto → tiene próximo cierre; cerrado → tiene próxima apertura.
    expect(estado.abierto ? estado.proximoCierre : estado.proximaApertura).toMatch(/Z$/);

    await expect(http.get("/mercados/XXX/estado")).rejects.toMatchObject({ status: 404 });
  });

  it("acciones: filtra, pagina y devuelve cotización con montos como texto", async () => {
    await abrirSesion();

    const lista = await http.get("/acciones", { query: { mercado: "NYSE", tamano: 2 } });
    expect(lista).toMatchObject({ pagina: 0, tamano: 2 });
    expect(lista.contenido).toHaveLength(2);
    expect(lista.totalPaginas).toBeGreaterThan(1);

    const cotizacion = await http.get("/acciones/AAPL/cotizacion");
    expect(cotizacion).toMatchObject({ ticker: "AAPL", precio: "176.50", spread: "0.04" });
    await expect(http.get("/acciones/NOPE")).rejects.toMatchObject({ status: 404 });
  });

  it("saldo y portafolio: montos como texto con dos decimales", async () => {
    await abrirSesion();

    await expect(http.get("/cuenta/saldo")).resolves.toEqual({
      disponible: "4250.00",
      reservado: "351.20",
      total: "4601.20",
    });

    const resumen = await http.get("/portafolio");
    const posiciones = await http.get("/portafolio/posiciones");
    expect(resumen.numeroPosiciones).toBe(posiciones.length);
    expect(resumen.valorTotal).toMatch(/^\d+\.\d{2}$/);
    expect(posiciones[0]).toMatchObject({
      activo: "AAPL",
      cantidad: "10",
      precioCompra: "170.00",
      precioActual: "176.50",
      gananciaPerdida: "65.00",
    });
  });

  it("logout invalida el token", async () => {
    await abrirSesion();
    await authApi.cerrarSesion();

    await expect(http.get("/perfil")).rejects.toMatchObject({ codigo: "NO_AUTENTICADO" });
  });
});
