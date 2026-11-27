import { http as rest, HttpResponse } from "msw";
import { nuevoUuid } from "../api/httpClient.js";
import { MERCADOS, monto } from "./mercadosData.js";

const ADM = "ADMINISTRADOR";
const LEG = "LEGAL";
const JD = "JUNTA_DIRECTIVA";
const INV = "INVERSIONISTA";
const COM = "COMISIONISTA";
const ROLES = [ADM, LEG, JD, INV, COM];
const HORA = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(fecha) {
  return (
    FECHA.test(fecha) &&
    Number.isFinite(Date.parse(fecha)) &&
    new Date(fecha).toISOString().startsWith(fecha)
  );
}

function filtrarPeriodo(datos, { desde, hasta }) {
  return datos.filter(({ fecha }) => {
    const dia = fecha.slice(0, 10);
    return (!desde || dia >= desde) && (!hasta || dia <= hasta);
  });
}

export function crearHandlersGestion({ raiz, db, protegido, error, leerCuerpo, pagina }) {
  const estado = () =>
    (db.gestion ??= {
      mercados: MERCADOS.map((mercado) => ({ ...mercado, feriados: [] })),
      usuarios: db.usuarios.map(({ id, nombre, rol }) => ({
        id,
        nombre,
        rol,
        certificado: rol === COM,
      })),
      parametros: { porcentajePlataforma: 60, porcentajeComisionista: 40 },
      restricciones: [],
      eventos: [],
    });
  const invalidar = (request, campo, problema) =>
    error(request, 400, "VALIDACION_FALLIDA", problema, { detalles: [{ campo, problema }] });
  const noEncontrado = (request) => error(request, 404, "NO_ENCONTRADO", "Registro no encontrado.");

  const registrar = ({ request, usuario }, tipo, referenciaId) => {
    estado().eventos.unshift({
      id: nuevoUuid(),
      tipo,
      actorId: usuario.id,
      referenciaId,
      fecha: new Date().toISOString(),
      traceId: request.headers.get("X-Trace-Id") ?? nuevoUuid(),
    });
  };

  const periodo = (url) => ({
    desde: url.searchParams.get("desde"),
    hasta: url.searchParams.get("hasta"),
  });
  const filtrar = (request, consultar) => {
    const fechas = periodo(new URL(request.url));
    for (const [campo, fecha] of Object.entries(fechas)) {
      if (fecha && !fechaValida(fecha)) return invalidar(request, campo, "Usa una fecha válida.");
    }
    if (fechas.desde && fechas.hasta && fechas.desde > fechas.hasta) {
      return invalidar(request, "hasta", "La fecha final debe ser igual o posterior a la inicial.");
    }
    return consultar(fechas);
  };

  return [
    rest.get(
      `${raiz}/admin/mercados`,
      protegido([ADM], () => HttpResponse.json(estado().mercados))
    ),
    rest.patch(
      `${raiz}/admin/mercados/:codigo`,
      protegido([ADM], async (ctx) => {
        const { request, params } = ctx;
        const mercado = estado().mercados.find(({ codigo }) => codigo === params.codigo);
        if (!mercado) return noEncontrado(request);
        const datos = await leerCuerpo(request);
        const { horaApertura, horaCierre, feriados } = { ...mercado, ...datos };
        if (!HORA.test(horaApertura))
          return invalidar(request, "horaApertura", "Indica una hora válida.");
        if (!HORA.test(horaCierre) || horaCierre <= horaApertura) {
          return invalidar(request, "horaCierre", "El cierre debe ser posterior a la apertura.");
        }
        if (!Array.isArray(feriados) || !feriados.every(fechaValida)) {
          return invalidar(request, "feriados", "Indica fechas válidas para los feriados.");
        }
        Object.assign(mercado, { horaApertura, horaCierre, feriados: [...new Set(feriados)] });
        registrar(ctx, "HORARIO_ACTUALIZADO", mercado.codigo);
        return HttpResponse.json(mercado);
      })
    ),
    rest.get(
      `${raiz}/admin/usuarios`,
      protegido([ADM], () => HttpResponse.json(estado().usuarios))
    ),
    rest.patch(
      `${raiz}/admin/usuarios/:id`,
      protegido([ADM], async (ctx) => {
        const { request, params } = ctx;
        const usuario = estado().usuarios.find(({ id }) => id === params.id);
        if (!usuario) return noEncontrado(request);
        const datos = await leerCuerpo(request);
        const rol = datos.rol ?? usuario.rol;
        const certificado = datos.certificado ?? (rol === COM && usuario.certificado);
        if (!ROLES.includes(rol)) return invalidar(request, "rol", "Selecciona un rol válido.");
        if (typeof certificado !== "boolean" || (certificado && rol !== COM)) {
          return invalidar(request, "certificado", "Solo se pueden certificar comisionistas.");
        }
        Object.assign(usuario, { rol, certificado });
        registrar(ctx, "USUARIO_ACTUALIZADO", usuario.id);
        return HttpResponse.json(usuario);
      })
    ),
    rest.get(
      `${raiz}/admin/parametros`,
      protegido([ADM], () => HttpResponse.json(estado().parametros))
    ),
    rest.put(
      `${raiz}/admin/parametros`,
      protegido([ADM], async (ctx) => {
        const { porcentajePlataforma, porcentajeComisionista } = await leerCuerpo(ctx.request);
        if (
          ![porcentajePlataforma, porcentajeComisionista].every(
            (n) => Number.isFinite(n) && n >= 0 && n <= 100
          ) ||
          Math.abs(porcentajePlataforma + porcentajeComisionista - 100) > 1e-9
        ) {
          return invalidar(ctx.request, "porcentajePlataforma", "El reparto debe sumar 100 %.");
        }
        estado().parametros = { porcentajePlataforma, porcentajeComisionista };
        registrar(ctx, "PARAMETROS_ACTUALIZADOS", "COMISION");
        return HttpResponse.json(estado().parametros);
      })
    ),
    rest.get(
      `${raiz}/auditoria/eventos`,
      protegido([LEG], ({ request }) =>
        filtrar(request, (fechas) => {
          const url = new URL(request.url);
          const tipo = url.searchParams.get("tipo");
          const referencia = url.searchParams.get("referenciaId");
          const eventos = filtrarPeriodo(estado().eventos, fechas).filter(
            (evento) =>
              (!tipo || evento.tipo === tipo) && (!referencia || evento.referenciaId === referencia)
          );
          return HttpResponse.json(pagina(eventos, url));
        })
      )
    ),
    rest.get(
      `${raiz}/auditoria/ordenes/:id/historial`,
      protegido([LEG], ({ params, request }) => {
        const orden = db.trading.ordenes.find(({ id }) => id === params.id);
        return orden
          ? HttpResponse.json({ ordenId: orden.id, estados: orden.historial })
          : noEncontrado(request);
      })
    ),
    rest.get(
      `${raiz}/restricciones`,
      protegido([ADM, LEG], () => HttpResponse.json(estado().restricciones))
    ),
    rest.post(
      `${raiz}/restricciones`,
      protegido([ADM, LEG], async (ctx) => {
        const { request } = ctx;
        const datos = await leerCuerpo(request);
        if (!MERCADOS.some(({ codigo }) => codigo === datos.mercado)) {
          return invalidar(request, "mercado", "Selecciona un mercado válido.");
        }
        for (const campo of ["motivo", "referenciaCaso"]) {
          if (typeof datos[campo] !== "string" || !datos[campo].trim()) {
            return invalidar(request, campo, "Completa este campo.");
          }
        }
        const restriccion = {
          id: nuevoUuid(),
          mercado: datos.mercado,
          motivo: datos.motivo.trim(),
          referenciaCaso: datos.referenciaCaso.trim(),
          activa: true,
        };
        estado().restricciones.unshift(restriccion);
        registrar(ctx, "RESTRICCION_CREADA", restriccion.id);
        return HttpResponse.json(restriccion, { status: 201 });
      })
    ),
    rest.patch(
      `${raiz}/restricciones/:id`,
      protegido([ADM, LEG], async (ctx) => {
        const restriccion = estado().restricciones.find(({ id }) => id === ctx.params.id);
        if (!restriccion) return noEncontrado(ctx.request);
        const { motivo, referenciaCaso } = await leerCuerpo(ctx.request);
        if (typeof motivo !== "string" || !motivo.trim()) {
          return invalidar(ctx.request, "motivo", "Indica el motivo para levantar la restricción.");
        }
        if (typeof referenciaCaso !== "string" || !referenciaCaso.trim()) {
          return invalidar(ctx.request, "referenciaCaso", "Indica la referencia del caso.");
        }
        if (restriccion.activa) {
          Object.assign(restriccion, { activa: false, motivoLevantamiento: motivo.trim() });
          registrar(ctx, "RESTRICCION_LEVANTADA", restriccion.id);
        }
        return HttpResponse.json(restriccion);
      })
    ),
    rest.get(
      `${raiz}/reportes`,
      protegido([INV, COM, JD, LEG], ({ usuario, request }) =>
        filtrar(request, (fechas) => {
          const fecha = new Date().toISOString().slice(0, 10);
          const titulo = {
            [INV]: "Resumen de inversiones",
            [COM]: "Resumen de comisiones",
            [JD]: "Informe empresarial",
            [LEG]: "Registro de auditoría",
          }[usuario.rol];
          const reportes = [{ id: usuario.rol, titulo, fecha, moneda: "USD", total: "125.00" }];
          return HttpResponse.json(filtrarPeriodo(reportes, fechas));
        })
      )
    ),
    rest.get(
      `${raiz}/reportes/dashboard`,
      protegido([JD], ({ request }) =>
        filtrar(request, (fechas) => {
          const fecha = new Date().toISOString().slice(0, 10);
          const ingresos = filtrarPeriodo(
            [
              { fecha, mercado: "NYSE", fuente: "COMISIONES", monto: "75.00" },
              { fecha, mercado: "NASDAQ", fuente: "COMISIONES", monto: "50.00" },
            ],
            fechas
          );
          const total = ingresos.reduce((suma, item) => suma + Number(item.monto), 0);
          return HttpResponse.json({ ingresos, total: monto(total), moneda: "USD" });
        })
      )
    ),
  ];
}
