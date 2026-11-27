import { HttpResponse, http as rest } from "msw";
import { nuevoUuid } from "../api/httpClient.js";
import { COMISIONISTAS } from "./db.js";
import { USUARIO_DE_COMISIONISTA } from "./comisionistaDatos.js";
import { crearOrdenFirmada, validarItemDeOrden, vistaOrden, vistaSaldo } from "./ordenes.js";

/**
 * Mock de comisionista (SCRUM-35, parte 3): clientes asignados, estrategias y propuestas.
 * TODO es [Propuesta] (backend aún no define estos endpoints: SCRUM-51/52/53); está documentado
 * en docs/trading-mock.md y puede cambiar.
 *
 * Reglas: el comisionista crea la propuesta, el cliente la aprueba o rechaza y el comisionista
 * la firma (al firmar se crean las órdenes del cliente). Lo ajeno responde 404 (como las órdenes);
 * el rol equivocado, 403 ACCESO_DENEGADO.
 */

const RAIZ = "*/api/v1";
const DIA = 24 * 60 * 60_000;

export const ESTADOS_PROPUESTA = [
  "PENDIENTE_APROBACION",
  "APROBADA",
  "FIRMADA",
  "RECHAZADA",
  "VENCIDA",
];
const VIGENTES = new Set(["PENDIENTE_APROBACION", "APROBADA"]);
export const PERFILES_RIESGO = ["CONSERVADOR", "MODERADO", "AGRESIVO"];
const MAX_ORDENES = 10;
const MAX_VIGENCIA_DIAS = 30;

/** Catálogo id del comisionista que maneja este usuario COM (o `undefined`). */
export const comisionistaDeUsuario = (usuario) =>
  Object.entries(USUARIO_DE_COMISIONISTA).find(([, uid]) => uid === usuario.id)?.[0];

export function crearHandlersComisionista({
  db,
  error,
  protegido,
  leerCuerpo,
  pagina,
  conSimulacion,
  posicionesValoradas,
}) {
  const estado = () => db.trading.comisionista;
  const ruta = (roles, resolver) => protegido(roles, (ctx) => conSimulacion(resolver)(ctx));
  const COM = ["COMISIONISTA"];
  const INV = ["INVERSIONISTA"];
  const AMBOS = ["INVERSIONISTA", "COMISIONISTA"];

  const nombreDeComisionista = (id) => COMISIONISTAS.find((c) => c.id === id)?.nombre ?? "—";
  const usuarioPorId = (id) => db.usuarios.find((u) => u.id === id);
  const clientesDe = (usuarioCom) => {
    const mio = comisionistaDeUsuario(usuarioCom);
    return db.usuarios.filter((u) => mio && u.comisionista?.id === mio);
  };
  const clienteDe = (usuarioCom, id) => clientesDe(usuarioCom).find((c) => c.id === id);

  const noCliente = (request) =>
    error(request, 404, "NO_ENCONTRADO", "El cliente no existe o no está asignado a ti.");
  const noPropuesta = (request) =>
    error(request, 404, "NO_ENCONTRADO", "La propuesta no existe o no es tuya.");

  /** Las propuestas vigentes cuya fecha de vencimiento ya pasó se marcan VENCIDA. */
  function vencerPropuestas() {
    const ahora = Date.now();
    for (const p of estado().propuestas) {
      if (VIGENTES.has(p.estado) && Date.parse(p.venceEn) <= ahora) {
        p.estado = "VENCIDA";
        p.actualizadaEn = new Date(ahora).toISOString();
        p.historial.push({
          estado: "VENCIDA",
          fecha: p.actualizadaEn,
          actor: { tipo: "SISTEMA", id: null },
          motivo: "Venció sin respuesta",
        });
      }
    }
  }

  function vistaPropuesta(p, { conHistorial = false } = {}) {
    const estrategia = p.estrategiaId
      ? estado().estrategias.find((e) => e.id === p.estrategiaId)
      : null;
    const vista = {
      id: p.id,
      titulo: p.titulo,
      nota: p.nota,
      estado: p.estado,
      clienteId: p.clienteId,
      clienteNombre: usuarioPorId(p.clienteId)?.nombre ?? "—",
      comisionistaId: p.comisionistaId,
      comisionistaNombre: nombreDeComisionista(p.comisionistaId),
      estrategia: estrategia ? { id: estrategia.id, nombre: estrategia.nombre } : null,
      ordenes: p.ordenes,
      motivoRechazo: p.motivoRechazo,
      ordenesIds: p.ordenesIds,
      creadaEn: p.creadaEn,
      venceEn: p.venceEn,
      actualizadaEn: p.actualizadaEn,
    };
    return conHistorial ? { ...vista, historial: p.historial } : vista;
  }

  /** Propuesta visible para el usuario (cliente o comisionista dueño); si no, `undefined`. */
  function propuestaDe(usuario, id) {
    const p = estado().propuestas.find((x) => x.id === id);
    if (!p) return undefined;
    if (usuario.rol === "INVERSIONISTA") return p.clienteId === usuario.id ? p : undefined;
    return p.comisionistaId === comisionistaDeUsuario(usuario) ? p : undefined;
  }

  function registrarEstado(p, nuevo, actor, motivo) {
    p.estado = nuevo;
    p.actualizadaEn = new Date().toISOString();
    p.historial.push({ estado: nuevo, fecha: p.actualizadaEn, actor, motivo });
  }

  /** 409 cuando la propuesta no está en el estado que exige la acción. */
  function transicionInvalida(request, p) {
    if (p.estado === "VENCIDA") {
      return error(request, 409, "PROPUESTA_VENCIDA", "La propuesta venció.", {
        datos: { venceEn: p.venceEn },
      });
    }
    return error(
      request,
      409,
      "TRANSICION_INVALIDA",
      `La propuesta está en estado ${p.estado} y no permite esta acción.`,
      { datos: { estado: p.estado } }
    );
  }

  function validarPropuesta(cuerpo) {
    const detalles = [];
    const titulo = String(cuerpo.titulo ?? "").trim();
    if (titulo.length < 3 || titulo.length > 80)
      detalles.push({ campo: "titulo", problema: "Debe tener entre 3 y 80 caracteres." });
    if (cuerpo.nota != null && String(cuerpo.nota).length > 500)
      detalles.push({ campo: "nota", problema: "Máximo 500 caracteres." });
    if (!Array.isArray(cuerpo.ordenes) || cuerpo.ordenes.length < 1)
      detalles.push({ campo: "ordenes", problema: "Agrega al menos una orden." });
    else if (cuerpo.ordenes.length > MAX_ORDENES)
      detalles.push({ campo: "ordenes", problema: `Máximo ${MAX_ORDENES} órdenes.` });
    else {
      cuerpo.ordenes.forEach((o, i) => {
        for (const d of validarItemDeOrden(o ?? {}).detalles)
          detalles.push({ campo: `ordenes[${i}].${d.campo}`, problema: d.mensaje });
      });
    }
    const vence = Date.parse(cuerpo.venceEn);
    if (!Number.isFinite(vence) || vence <= Date.now())
      detalles.push({ campo: "venceEn", problema: "Debe ser una fecha futura (ISO 8601)." });
    else if (vence > Date.now() + MAX_VIGENCIA_DIAS * DIA)
      detalles.push({ campo: "venceEn", problema: `Máximo ${MAX_VIGENCIA_DIAS} días.` });
    return detalles;
  }

  const vistaEstrategia = ({ comisionistaId: _c, ...e }) => e;

  return [
    // ---- Clientes asignados (COM) ------------------------------------------
    rest.get(
      `${RAIZ}/clientes`,
      ruta(COM, ({ request, usuario }) => {
        const url = new URL(request.url);
        const lista = clientesDe(usuario).map((c) => ({
          id: c.id,
          nombre: c.nombre,
          correo: c.correo,
          nivelExperiencia: c.nivelExperiencia,
          operaEnNombre: Boolean(c.comisionista?.operaEnNombre),
          propuestasActivas: estado().propuestas.filter(
            (p) => p.clienteId === c.id && VIGENTES.has(p.estado)
          ).length,
        }));
        return HttpResponse.json(pagina(lista, url));
      })
    ),

    rest.get(
      `${RAIZ}/clientes/:id`,
      ruta(COM, ({ request, usuario, params }) => {
        const c = clienteDe(usuario, params.id);
        if (!c) return noCliente(request);
        return HttpResponse.json({
          id: c.id,
          nombre: c.nombre,
          correo: c.correo,
          celular: c.celular,
          nivelExperiencia: c.nivelExperiencia,
          intereses: c.intereses,
          operaEnNombre: Boolean(c.comisionista?.operaEnNombre),
          saldo: vistaSaldo(db.trading, c),
        });
      })
    ),

    rest.get(
      `${RAIZ}/clientes/:id/portafolio/posiciones`,
      ruta(COM, ({ request, usuario, params }) => {
        const c = clienteDe(usuario, params.id);
        if (!c) return noCliente(request);
        return HttpResponse.json(posicionesValoradas(c).map(({ _costo, _valor, ...p }) => p));
      })
    ),

    rest.get(
      `${RAIZ}/clientes/:id/ordenes`,
      ruta(COM, ({ request, usuario, params }) => {
        const c = clienteDe(usuario, params.id);
        if (!c) return noCliente(request);
        const url = new URL(request.url);
        const lista = db.trading.ordenes
          .filter((o) => o.usuarioId === c.id)
          .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn))
          .map(vistaOrden);
        return HttpResponse.json(pagina(lista, url));
      })
    ),

    // ---- Estrategias (COM) -------------------------------------------------
    rest.get(
      `${RAIZ}/estrategias`,
      ruta(COM, ({ request, usuario }) => {
        const url = new URL(request.url);
        const e = url.searchParams.get("estado");
        const mio = comisionistaDeUsuario(usuario);
        const lista = estado()
          .estrategias.filter((x) => x.comisionistaId === mio && (!e || x.estado === e))
          .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn))
          .map(vistaEstrategia);
        return HttpResponse.json(pagina(lista, url));
      })
    ),

    rest.post(
      `${RAIZ}/estrategias`,
      ruta(COM, async ({ request, usuario }) => {
        const cuerpo = await leerCuerpo(request);
        const detalles = validarEstrategia(cuerpo, { completa: true });
        if (detalles.length)
          return error(request, 400, "VALIDACION_FALLIDA", "Revisa los datos de la estrategia.", {
            detalles,
          });
        const ahora = new Date().toISOString();
        const nueva = {
          id: nuevoUuid(),
          comisionistaId: comisionistaDeUsuario(usuario),
          nombre: cuerpo.nombre.trim(),
          descripcion: String(cuerpo.descripcion ?? "").trim(),
          perfilRiesgo: cuerpo.perfilRiesgo,
          estado: "ACTIVA",
          creadaEn: ahora,
          actualizadaEn: ahora,
        };
        estado().estrategias.unshift(nueva);
        return HttpResponse.json(vistaEstrategia(nueva), { status: 201 });
      })
    ),

    rest.patch(
      `${RAIZ}/estrategias/:id`,
      ruta(COM, async ({ request, usuario, params }) => {
        const e = estado().estrategias.find(
          (x) => x.id === params.id && x.comisionistaId === comisionistaDeUsuario(usuario)
        );
        if (!e) return error(request, 404, "NO_ENCONTRADO", "La estrategia no existe.");
        const cuerpo = await leerCuerpo(request);
        const detalles = validarEstrategia(cuerpo, { completa: false });
        if (detalles.length)
          return error(request, 400, "VALIDACION_FALLIDA", "Revisa los datos de la estrategia.", {
            detalles,
          });
        if (cuerpo.nombre !== undefined) e.nombre = cuerpo.nombre.trim();
        if (cuerpo.descripcion !== undefined) e.descripcion = String(cuerpo.descripcion).trim();
        if (cuerpo.perfilRiesgo !== undefined) e.perfilRiesgo = cuerpo.perfilRiesgo;
        if (cuerpo.estado !== undefined) e.estado = cuerpo.estado;
        e.actualizadaEn = new Date().toISOString();
        return HttpResponse.json(vistaEstrategia(e));
      })
    ),

    // ---- Propuestas ----------------------------------------------------------
    rest.get(
      `${RAIZ}/propuestas`,
      ruta(AMBOS, ({ request, usuario }) => {
        vencerPropuestas();
        const url = new URL(request.url);
        const q = (n) => url.searchParams.get(n);
        if (q("estado") && !ESTADOS_PROPUESTA.includes(q("estado")))
          return error(request, 400, "VALIDACION_FALLIDA", "Filtro inválido.", {
            detalles: [
              { campo: "estado", problema: `Debe ser uno de: ${ESTADOS_PROPUESTA.join(", ")}.` },
            ],
          });
        const mio = comisionistaDeUsuario(usuario);
        const lista = estado()
          .propuestas.filter((p) =>
            usuario.rol === "INVERSIONISTA" ? p.clienteId === usuario.id : p.comisionistaId === mio
          )
          .filter((p) => !q("estado") || p.estado === q("estado"))
          .filter((p) => !q("clienteId") || p.clienteId === q("clienteId"))
          .sort((a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn))
          .map((p) => vistaPropuesta(p));
        return HttpResponse.json(pagina(lista, url));
      })
    ),

    rest.get(
      `${RAIZ}/propuestas/:id`,
      ruta(AMBOS, ({ request, usuario, params }) => {
        vencerPropuestas();
        const p = propuestaDe(usuario, params.id);
        if (!p) return noPropuesta(request);
        return HttpResponse.json(vistaPropuesta(p, { conHistorial: true }));
      })
    ),

    rest.post(
      `${RAIZ}/propuestas`,
      ruta(COM, async ({ request, usuario }) => {
        const cuerpo = await leerCuerpo(request);
        const cliente = clienteDe(usuario, cuerpo.clienteId);
        if (!cliente) return noCliente(request);
        const detalles = validarPropuesta(cuerpo);
        const mio = comisionistaDeUsuario(usuario);
        if (cuerpo.estrategiaId) {
          const e = estado().estrategias.find(
            (x) => x.id === cuerpo.estrategiaId && x.comisionistaId === mio && x.estado === "ACTIVA"
          );
          if (!e)
            detalles.push({
              campo: "estrategiaId",
              problema: "La estrategia no existe o está archivada.",
            });
        }
        if (detalles.length)
          return error(request, 400, "VALIDACION_FALLIDA", "Revisa los datos de la propuesta.", {
            detalles,
          });
        const ahora = new Date().toISOString();
        const nueva = {
          id: nuevoUuid(),
          comisionistaId: mio,
          clienteId: cliente.id,
          estrategiaId: cuerpo.estrategiaId ?? null,
          titulo: cuerpo.titulo.trim(),
          nota: cuerpo.nota ? String(cuerpo.nota).trim() : null,
          estado: "PENDIENTE_APROBACION",
          ordenes: cuerpo.ordenes.map((o) => ({
            ticker: String(o.ticker).toUpperCase(),
            lado: o.lado,
            tipo: o.tipo,
            cantidad: o.cantidad,
            precioLimite: o.tipo === "LIMIT" ? Number(o.precioLimite).toFixed(2) : null,
            precioStop: ["STOP_LOSS", "TAKE_PROFIT"].includes(o.tipo)
              ? Number(o.precioStop).toFixed(2)
              : null,
          })),
          motivoRechazo: null,
          ordenesIds: [],
          creadaEn: ahora,
          venceEn: new Date(cuerpo.venceEn).toISOString(),
          actualizadaEn: ahora,
          historial: [
            {
              estado: "PENDIENTE_APROBACION",
              fecha: ahora,
              actor: { tipo: "COMISIONISTA", id: usuario.id },
              motivo: "Propuesta creada",
            },
          ],
        };
        estado().propuestas.unshift(nueva);
        return HttpResponse.json(vistaPropuesta(nueva, { conHistorial: true }), { status: 201 });
      })
    ),

    rest.post(
      `${RAIZ}/propuestas/:id/aprobar`,
      ruta(INV, ({ request, usuario, params }) => {
        vencerPropuestas();
        const p = propuestaDe(usuario, params.id);
        if (!p) return noPropuesta(request);
        if (p.estado !== "PENDIENTE_APROBACION") return transicionInvalida(request, p);
        registrarEstado(
          p,
          "APROBADA",
          { tipo: "USUARIO", id: usuario.id },
          "Aprobada por el cliente"
        );
        return HttpResponse.json(vistaPropuesta(p, { conHistorial: true }));
      })
    ),

    rest.post(
      `${RAIZ}/propuestas/:id/rechazar`,
      ruta(INV, async ({ request, usuario, params }) => {
        vencerPropuestas();
        const p = propuestaDe(usuario, params.id);
        if (!p) return noPropuesta(request);
        const { motivo } = await leerCuerpo(request);
        const texto = String(motivo ?? "").trim();
        if (texto.length < 3 || texto.length > 300)
          return error(request, 400, "VALIDACION_FALLIDA", "Indica el motivo del rechazo.", {
            detalles: [{ campo: "motivo", problema: "Debe tener entre 3 y 300 caracteres." }],
          });
        if (p.estado !== "PENDIENTE_APROBACION") return transicionInvalida(request, p);
        p.motivoRechazo = texto;
        registrarEstado(p, "RECHAZADA", { tipo: "USUARIO", id: usuario.id }, texto);
        return HttpResponse.json(vistaPropuesta(p, { conHistorial: true }));
      })
    ),

    rest.post(
      `${RAIZ}/propuestas/:id/firmar`,
      ruta(COM, ({ request, usuario, params }) => {
        vencerPropuestas();
        const p = propuestaDe(usuario, params.id);
        if (!p) return noPropuesta(request);
        if (p.estado !== "APROBADA") return transicionInvalida(request, p);
        const cliente = clienteDe(usuario, p.clienteId);
        if (!cliente)
          return error(
            request,
            409,
            "TRANSICION_INVALIDA",
            "El cliente ya no está asignado a ti; no puedes firmar esta propuesta."
          );
        p.ordenesIds = p.ordenes.map((o) => crearOrdenFirmada(db.trading, cliente, usuario, o).id);
        registrarEstado(
          p,
          "FIRMADA",
          { tipo: "COMISIONISTA", id: usuario.id },
          "Firmada por el comisionista"
        );
        return HttpResponse.json(vistaPropuesta(p, { conHistorial: true }));
      })
    ),
  ];
}

function validarEstrategia(cuerpo, { completa }) {
  const detalles = [];
  const falta = (c) => completa || cuerpo[c] !== undefined;
  if (falta("nombre")) {
    const n = String(cuerpo.nombre ?? "").trim();
    if (n.length < 3 || n.length > 60)
      detalles.push({ campo: "nombre", problema: "Debe tener entre 3 y 60 caracteres." });
  }
  if (cuerpo.descripcion !== undefined && String(cuerpo.descripcion).length > 500)
    detalles.push({ campo: "descripcion", problema: "Máximo 500 caracteres." });
  if (falta("perfilRiesgo") && !PERFILES_RIESGO.includes(cuerpo.perfilRiesgo))
    detalles.push({
      campo: "perfilRiesgo",
      problema: `Debe ser uno de: ${PERFILES_RIESGO.join(", ")}.`,
    });
  if (cuerpo.estado !== undefined && !["ACTIVA", "ARCHIVADA"].includes(cuerpo.estado))
    detalles.push({ campo: "estado", problema: "Debe ser ACTIVA o ARCHIVADA." });
  return detalles;
}

/** Utilidades de consola `window.__mock.comisionista` (y para pruebas). */
export function utilidadesComisionista(db) {
  return {
    /** Hace que una propuesta venza ya (la próxima consulta la marca VENCIDA). */
    vencer: (id) => {
      const p = db.trading.comisionista.propuestas.find((x) => x.id === id);
      if (p) p.venceEn = new Date(Date.now() - 1000).toISOString();
      return p ?? null;
    },
    propuestas: () => db.trading.comisionista.propuestas,
    estrategias: () => db.trading.comisionista.estrategias,
  };
}
