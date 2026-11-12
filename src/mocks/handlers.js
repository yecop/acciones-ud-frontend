import { delay, http as rest, HttpResponse } from "msw";
import { nuevoUuid } from "../api/httpClient.js";
import {
  BLOQUEO_LOGIN_SEGUNDOS,
  CODIGO_MFA_EXPIRADO,
  CODIGO_MFA_VALIDO,
  COMISIONISTAS,
  db,
  MAX_FALLOS_LOGIN,
} from "./db.js";
import { ACCIONES, cotizacionDe, estadoDeMercado, MERCADOS, monto } from "./mercadosData.js";

/**
 * Endpoints simulados del contrato `/api/v1` (los de esta semana: autenticación, perfil,
 * mercados, acciones, saldo y portafolio). Respetan la forma de éxito y de error del
 * contrato: cuerpo de error con `codigo`, `traceId` y cabecera `X-Trace-Id`.
 */

const RAIZ = "*/api/v1";
const LATENCIA_MS = import.meta.env?.MODE === "test" ? 0 : 150;

// ---------------------------------------------------------------- utilidades

function error(request, status, codigo, mensaje, { detalles, datos, headers } = {}) {
  const traceId = request.headers.get("X-Trace-Id") ?? nuevoUuid();
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(),
      status,
      codigo,
      mensaje,
      traceId,
      ruta: new URL(request.url).pathname,
      ...(detalles ? { detalles } : {}),
      ...(datos ? { datos } : {}),
    },
    { status, headers: { "X-Trace-Id": traceId, ...headers } }
  );
}

const sinContenido = () => new HttpResponse(null, { status: 204 });

async function leerCuerpo(request) {
  try {
    return (await request.json()) ?? {};
  } catch {
    return {};
  }
}

/** Valida la sesión y el rol. Devuelve `{ usuario }` o `{ respuesta }` con el error. */
function autenticar(request, roles) {
  const cabecera = request.headers.get("Authorization");
  if (!cabecera?.startsWith("Bearer ")) {
    return { respuesta: error(request, 401, "NO_AUTENTICADO", "Falta el token de acceso.") };
  }
  const registro = db.tokensAcceso.get(cabecera.slice(7));
  if (!registro) {
    return { respuesta: error(request, 401, "NO_AUTENTICADO", "Token inválido.") };
  }
  if (registro.expiraEn <= Date.now()) {
    return { respuesta: error(request, 401, "TOKEN_EXPIRADO", "El access token venció.") };
  }
  const usuario = db.usuarios.find((u) => u.id === registro.usuarioId);
  if (!usuario) {
    return { respuesta: error(request, 401, "NO_AUTENTICADO", "Usuario inexistente.") };
  }
  if (roles && !roles.includes(usuario.rol)) {
    return {
      respuesta: error(request, 403, "ACCESO_DENEGADO", "Tu rol no permite esta acción."),
    };
  }
  return { usuario };
}

/** Envuelve un resolver: latencia simulada + autenticación + roles permitidos. */
function protegido(roles, resolver) {
  return async (contexto) => {
    await delay(LATENCIA_MS);
    const { usuario, respuesta } = autenticar(contexto.request, roles);
    if (respuesta) return respuesta;
    return resolver({ ...contexto, usuario });
  };
}

/** Resolver de endpoint público (con latencia simulada). */
function publico(resolver) {
  return async (contexto) => {
    await delay(LATENCIA_MS);
    return resolver(contexto);
  };
}

const INV = ["INVERSIONISTA"];

function pagina(lista, url) {
  const numero = Math.max(0, Number(url.searchParams.get("pagina") ?? 0));
  const tamano = Math.min(100, Math.max(1, Number(url.searchParams.get("tamano") ?? 20)));
  return {
    contenido: lista.slice(numero * tamano, numero * tamano + tamano),
    pagina: numero,
    tamano,
    totalElementos: lista.length,
    totalPaginas: Math.ceil(lista.length / tamano),
  };
}

function vistaPerfil(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    celular: usuario.celular,
    rol: usuario.rol,
    nivelExperiencia: usuario.nivelExperiencia,
    intereses: usuario.intereses,
    comisionista: usuario.comisionista,
    suscripcion: { plan: "BASICO" },
  };
}

// ----------------------------------------------------------------- portafolio

const POSICIONES = [
  { activo: "AAPL", cantidad: 10, precioCompra: 170.0 },
  { activo: "MSFT", cantidad: 5, precioCompra: 320.0 },
  { activo: "NVDA", cantidad: 12, precioCompra: 105.5 },
  { activo: "XOM", cantidad: 8, precioCompra: 108.0 },
  { activo: "TSLA", cantidad: 3, precioCompra: 265.0 },
];

function posicionesValoradas() {
  return POSICIONES.map((p) => {
    const precioActual = ACCIONES.find((a) => a.ticker === p.activo).precio;
    const costo = p.cantidad * p.precioCompra;
    const valor = p.cantidad * precioActual;
    return {
      activo: p.activo,
      cantidad: String(p.cantidad),
      precioCompra: monto(p.precioCompra),
      precioActual: monto(precioActual),
      valorActual: monto(valor),
      gananciaPerdida: monto(valor - costo),
      porcentajeGananciaPerdida: monto(((valor - costo) / costo) * 100),
      _costo: costo,
      _valor: valor,
    };
  });
}

function resumenPortafolio() {
  const posiciones = posicionesValoradas();
  const costo = posiciones.reduce((s, p) => s + p._costo, 0);
  const valor = posiciones.reduce((s, p) => s + p._valor, 0);
  return {
    valorTotal: monto(valor),
    costoTotal: monto(costo),
    gananciaPerdidaTotal: monto(valor - costo),
    porcentajeGananciaPerdidaTotal: monto(((valor - costo) / costo) * 100),
    numeroPosiciones: posiciones.length,
  };
}

// ------------------------------------------------------------------ handlers

export const handlers = [
  // ---- Autenticación y seguridad -------------------------------------------
  rest.post(
    `${RAIZ}/auth/registro`,
    publico(async ({ request }) => {
      const {
        correo,
        contrasena,
        nombre,
        celular,
        nivelExperiencia,
        intereses,
        perfilRiesgo,
        objetivos,
      } = await leerCuerpo(request);
      const detalles = [];
      if (!correo || !/^\S+@\S+\.\S+$/.test(correo))
        detalles.push({ campo: "correo", problema: "Correo inválido" });
      if (!contrasena || contrasena.length < 8)
        detalles.push({ campo: "contrasena", problema: "Mínimo 8 caracteres" });
      if (!nombre?.trim()) detalles.push({ campo: "nombre", problema: "Es obligatorio" });
      if (!/^\+?\d{7,15}$/.test(celular ?? ""))
        detalles.push({ campo: "celular", problema: "Ingresa entre 7 y 15 dígitos" });
      if (!["PRINCIPIANTE", "EXPERIMENTADO"].includes(nivelExperiencia))
        detalles.push({ campo: "nivelExperiencia", problema: "Selecciona un nivel válido" });
      if (!["CONSERVADOR", "MODERADO", "AGRESIVO"].includes(perfilRiesgo))
        detalles.push({ campo: "perfilRiesgo", problema: "Selecciona un perfil de riesgo válido" });
      const catalogos = {
        mercados: ["NYSE", "NASDAQ", "LSE", "TSE", "ASX"],
        sectores: ["TECNOLOGIA", "SALUD", "CONSUMO", "ENERGIA", "FINANZAS"],
      };
      Object.entries(catalogos).forEach(([campo, permitidos]) => {
        const valores = intereses?.[campo];
        if (
          !Array.isArray(valores) ||
          !valores.length ||
          valores.some((valor) => !permitidos.includes(valor))
        )
          detalles.push({
            campo: `intereses.${campo}`,
            problema: "Selecciona al menos una opción válida",
          });
      });
      if (
        !Array.isArray(objetivos) ||
        !objetivos.length ||
        objetivos.some((valor) => !["AHORRO", "CRECIMIENTO", "INGRESOS"].includes(valor))
      )
        detalles.push({ campo: "objetivos", problema: "Selecciona al menos un objetivo válido" });
      if (detalles.length) {
        return error(request, 400, "VALIDACION_FALLIDA", "Datos inválidos.", { detalles });
      }
      if (db.usuarios.some((u) => u.correo === correo.toLowerCase())) {
        return error(request, 409, "CORREO_DUPLICADO", "El correo ya está registrado.");
      }
      const usuario = {
        ...db.usuarios[0],
        id: nuevoUuid(),
        correo: correo.toLowerCase(),
        nombre: nombre.trim(),
        contrasena,
        celular,
        nivelExperiencia,
        intereses,
        perfilRiesgo,
        objetivos,
        estado: "PENDIENTE_ALTA",
        rol: "INVERSIONISTA",
        comisionista: null,
      };
      db.usuarios.push(usuario);
      return HttpResponse.json(
        { id: usuario.id, correo: usuario.correo, nombre: usuario.nombre, estado: usuario.estado },
        { status: 201 }
      );
    })
  ),

  rest.post(
    `${RAIZ}/auth/login`,
    publico(async ({ request }) => {
      const { correo, contrasena } = await leerCuerpo(request);
      const detalles = [];
      if (!correo) detalles.push({ campo: "correo", problema: "Es obligatorio" });
      if (!contrasena) detalles.push({ campo: "contrasena", problema: "Es obligatoria" });
      if (detalles.length) {
        return error(request, 400, "VALIDACION_FALLIDA", "Datos inválidos.", { detalles });
      }
      const clave = String(correo).toLowerCase();
      const intentos = db.intentosLogin.get(clave) ?? { fallos: 0, bloqueadoHasta: 0 };
      if (intentos.bloqueadoHasta > Date.now()) {
        const espera = Math.ceil((intentos.bloqueadoHasta - Date.now()) / 1000);
        return error(request, 429, "DEMASIADAS_SOLICITUDES", "Demasiados intentos de ingreso.", {
          headers: { "Retry-After": String(espera) },
        });
      }
      const usuario = db.usuarios.find((u) => u.correo === clave && u.contrasena === contrasena);
      if (!usuario) {
        intentos.fallos += 1;
        if (intentos.fallos >= MAX_FALLOS_LOGIN) {
          intentos.fallos = 0;
          intentos.bloqueadoHasta = Date.now() + BLOQUEO_LOGIN_SEGUNDOS * 1000;
        }
        db.intentosLogin.set(clave, intentos);
        return error(request, 401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.");
      }
      db.intentosLogin.delete(clave);
      if (usuario.estado === "PENDIENTE_ALTA") {
        return error(request, 403, "USUARIO_RESTRINGIDO", "Cuenta pendiente de alta.", {
          datos: { estado: "PENDIENTE_ALTA" },
        });
      }
      const mfaToken = nuevoUuid();
      db.retosMfa.set(mfaToken, { usuarioId: usuario.id, intentos: 0, reenvios: 0 });
      return HttpResponse.json({ mfaToken, canal: "EMAIL", expiraEn: 300 });
    })
  ),

  rest.post(
    `${RAIZ}/auth/mfa/verificar`,
    publico(async ({ request }) => {
      const { mfaToken, codigo } = await leerCuerpo(request);
      const reto = db.retosMfa.get(mfaToken);
      if (!reto) return error(request, 410, "MFA_EXPIRADO", "El reto de verificación venció.");
      if (reto.intentos >= 5) {
        return error(request, 429, "DEMASIADAS_SOLICITUDES", "Demasiados intentos.", {
          headers: { "Retry-After": "30" },
        });
      }
      if (codigo === CODIGO_MFA_EXPIRADO) {
        return error(request, 410, "MFA_EXPIRADO", "El código venció.");
      }
      if (codigo !== CODIGO_MFA_VALIDO) {
        reto.intentos += 1;
        return error(request, 401, "MFA_INVALIDO", "Código incorrecto.");
      }
      db.retosMfa.delete(mfaToken);
      const usuario = db.usuarios.find((u) => u.id === reto.usuarioId);
      return HttpResponse.json({
        ...db.emitirTokens(usuario.id),
        usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      });
    })
  ),

  rest.post(
    `${RAIZ}/auth/mfa/reenviar`,
    publico(async ({ request }) => {
      const { mfaToken } = await leerCuerpo(request);
      const reto = db.retosMfa.get(mfaToken);
      if (!reto) return error(request, 410, "MFA_EXPIRADO", "El reto de verificación venció.");
      reto.reenvios += 1;
      if (reto.reenvios > 3) {
        return error(request, 429, "DEMASIADAS_SOLICITUDES", "Demasiados reenvíos.", {
          headers: { "Retry-After": "30" },
        });
      }
      return sinContenido();
    })
  ),

  rest.post(
    `${RAIZ}/auth/refresh`,
    publico(async ({ request }) => {
      const { refreshToken } = await leerCuerpo(request);
      const usuarioId = db.tokensRefresh.get(refreshToken);
      if (!usuarioId) {
        return error(request, 401, "NO_AUTENTICADO", "Refresh token inválido.");
      }
      db.contadores.refresh += 1;
      db.tokensRefresh.delete(refreshToken); // rotación: el refresh token se usa una vez
      return HttpResponse.json(db.emitirTokens(usuarioId));
    })
  ),

  rest.post(
    `${RAIZ}/auth/logout`,
    protegido(null, ({ request }) => {
      db.tokensAcceso.delete(request.headers.get("Authorization").slice(7));
      return sinContenido();
    })
  ),

  // ---- Perfil y comisionista asociado --------------------------------------
  rest.get(
    `${RAIZ}/perfil`,
    protegido(null, ({ usuario }) => HttpResponse.json(vistaPerfil(usuario)))
  ),

  rest.patch(
    `${RAIZ}/perfil`,
    protegido(null, async ({ request, usuario }) => {
      const cambios = await leerCuerpo(request);
      if (cambios.nombre !== undefined && !String(cambios.nombre).trim()) {
        return error(request, 400, "VALIDACION_FALLIDA", "Datos inválidos.", {
          detalles: [{ campo: "nombre", problema: "No puede estar vacío" }],
        });
      }
      if (cambios.celular !== undefined && !/^\+?\d{7,15}$/.test(cambios.celular)) {
        return error(request, 400, "VALIDACION_FALLIDA", "Datos inválidos.", {
          detalles: [{ campo: "celular", problema: "Ingresa entre 7 y 15 dígitos" }],
        });
      }
      ["nombre", "celular", "intereses"].forEach((campo) => {
        if (cambios[campo] !== undefined) usuario[campo] = cambios[campo];
      });
      db.persistir();
      return HttpResponse.json(vistaPerfil(usuario));
    })
  ),

  rest.get(
    `${RAIZ}/perfil/preferencias`,
    protegido(INV, ({ usuario }) => HttpResponse.json(usuario.preferencias))
  ),

  rest.put(
    `${RAIZ}/perfil/preferencias`,
    protegido(INV, async ({ request, usuario }) => {
      const preferencias = await leerCuerpo(request);
      if (!Array.isArray(preferencias.notificaciones?.canales)) {
        return error(request, 400, "VALIDACION_FALLIDA", "Datos inválidos.", {
          detalles: [{ campo: "notificaciones.canales", problema: "Debe ser una lista" }],
        });
      }
      const detalles = [];
      const op = preferencias.operaciones ?? {};
      const montoValido = (n) => /^\d{1,12}(\.\d{1,2})?$/.test(String(n)) && Number(n) > 0;
      if (
        !preferencias.notificaciones.canales.length ||
        preferencias.notificaciones.canales.some((c) => !["EMAIL", "SMS", "WHATSAPP"].includes(c))
      )
        detalles.push({
          campo: "notificaciones.canales",
          problema: "Selecciona al menos un canal válido",
        });
      if (
        op.tipoOrdenPorDefecto !== undefined &&
        !["MARKET", "LIMIT", "STOP_LOSS", "TAKE_PROFIT"].includes(op.tipoOrdenPorDefecto)
      )
        detalles.push({
          campo: "operaciones.tipoOrdenPorDefecto",
          problema: "El tipo de orden no está disponible",
        });
      if (op.limiteDiario !== undefined && !montoValido(op.limiteDiario))
        detalles.push({
          campo: "operaciones.limiteDiario",
          problema: "El límite debe ser un monto positivo con hasta dos decimales",
        });
      if (op.dobleAutorizacion && !montoValido(op.umbralOrdenGrande))
        detalles.push({
          campo: "operaciones.umbralOrdenGrande",
          problema: "Define un umbral positivo para la doble autorización",
        });
      if (
        preferencias.visualizacion?.portafolio !== undefined &&
        !["TABLA", "TARJETAS"].includes(preferencias.visualizacion.portafolio)
      )
        detalles.push({
          campo: "visualizacion.portafolio",
          problema: "La vista no está disponible",
        });
      if (detalles.length)
        return error(request, 400, "VALIDACION_FALLIDA", "Datos inválidos.", { detalles });
      usuario.preferencias = preferencias;
      db.persistir();
      return HttpResponse.json(usuario.preferencias);
    })
  ),

  rest.get(
    `${RAIZ}/comisionistas`,
    protegido(INV, () => HttpResponse.json(COMISIONISTAS))
  ),

  rest.put(
    `${RAIZ}/perfil/comisionista`,
    protegido(INV, async ({ request, usuario }) => {
      const { comisionistaId, operaEnNombre = false } = await leerCuerpo(request);
      const comisionista = COMISIONISTAS.find((c) => c.id === comisionistaId);
      if (!comisionista) return error(request, 404, "NO_ENCONTRADO", "Comisionista inexistente.");
      usuario.comisionista = { id: comisionista.id, nombre: comisionista.nombre, operaEnNombre };
      return HttpResponse.json(vistaPerfil(usuario));
    })
  ),

  rest.delete(
    `${RAIZ}/perfil/comisionista`,
    protegido(INV, ({ usuario }) => {
      usuario.comisionista = null;
      return sinContenido();
    })
  ),

  // ---- Mercados y datos de mercado -----------------------------------------
  rest.get(
    `${RAIZ}/mercados`,
    protegido(null, () => HttpResponse.json(MERCADOS))
  ),

  rest.get(
    `${RAIZ}/mercados/:codigo/estado`,
    protegido(null, ({ request, params }) => {
      const mercado = MERCADOS.find((m) => m.codigo === params.codigo);
      if (!mercado) return error(request, 404, "NO_ENCONTRADO", "Mercado inexistente.");
      const estado = estadoDeMercado(mercado);
      const forzado = db.simulacion.mercadoAbierto[mercado.codigo];
      if (forzado === undefined) return HttpResponse.json(estado);
      return HttpResponse.json({
        ...estado,
        abierto: forzado,
        estado: forzado ? "ABIERTO" : "CERRADO",
        proximoCierre: forzado ? (estado.proximoCierre ?? estado.proximaApertura) : null,
        proximaApertura: forzado ? null : (estado.proximaApertura ?? estado.proximoCierre),
      });
    })
  ),

  rest.get(
    `${RAIZ}/acciones`,
    protegido(null, ({ request }) => {
      const url = new URL(request.url);
      const mercado = url.searchParams.get("mercado");
      const sector = url.searchParams.get("sector");
      const q = url.searchParams.get("q")?.toLowerCase();
      const filtradas = ACCIONES.filter(
        (a) =>
          (!mercado || a.mercado === mercado) &&
          (!sector || a.sector === sector) &&
          (!q || a.ticker.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q))
      ).map(({ variacion: _variacion, precio: _precio, ...accion }) => accion);
      return HttpResponse.json(pagina(filtradas, url));
    })
  ),

  rest.get(
    `${RAIZ}/acciones/:ticker`,
    protegido(null, ({ request, params }) => {
      const accion = ACCIONES.find((a) => a.ticker === params.ticker);
      if (!accion) return error(request, 404, "NO_ENCONTRADO", "Acción inexistente.");
      const { variacion: _variacion, precio: _precio, ...detalle } = accion;
      return HttpResponse.json(detalle);
    })
  ),

  rest.get(
    `${RAIZ}/acciones/:ticker/cotizacion`,
    protegido(null, ({ request, params }) => {
      const accion = ACCIONES.find((a) => a.ticker === params.ticker);
      if (!accion) return error(request, 404, "NO_ENCONTRADO", "Acción inexistente.");
      if (db.simulacion.proveedorCaido)
        return error(
          request,
          502,
          "PROVEEDOR_NO_DISPONIBLE",
          "El proveedor de datos de mercado no responde."
        );
      return HttpResponse.json(
        cotizacionDe(accion, { edadForzadaSegundos: db.simulacion.edades[accion.ticker] })
      );
    })
  ),

  rest.get(
    `${RAIZ}/dashboard`,
    protegido(INV, () =>
      HttpResponse.json({
        accionesInteres: ACCIONES.slice(0, 5).map((a) => ({
          ticker: a.ticker,
          nombre: a.nombre,
          mercado: a.mercado,
          precio: monto(a.precio),
          variacionPorcentaje: monto(a.variacion),
        })),
        portafolio: {
          valorTotal: resumenPortafolio().valorTotal,
          numeroPosiciones: POSICIONES.length,
          gananciaPerdidaDia: "96.30",
        },
        alertas: [],
      })
    )
  ),

  // ---- Cuenta y portafolio -------------------------------------------------
  rest.get(
    `${RAIZ}/cuenta/saldo`,
    protegido(INV, () =>
      HttpResponse.json({ disponible: "4250.00", reservado: "351.20", total: "4601.20" })
    )
  ),

  rest.get(
    `${RAIZ}/portafolio`,
    protegido(INV, () => HttpResponse.json(resumenPortafolio()))
  ),

  rest.get(
    `${RAIZ}/portafolio/posiciones`,
    protegido(INV, () =>
      HttpResponse.json(posicionesValoradas().map(({ _costo, _valor, ...p }) => p))
    )
  ),
];
