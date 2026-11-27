import { http as rest, HttpResponse } from "msw";
import { nuevoUuid } from "../api/httpClient.js";
import { ACCIONES } from "./mercadosData.js";

const planes = [
  { id: "MENSUAL", nombre: "Premium mensual", precio: "12.00", moneda: "USD", periodo: "mes" },
  { id: "ANUAL", nombre: "Premium anual", precio: "120.00", moneda: "USD", periodo: "año" },
];

export function estadoPremium(usuario) {
  return (usuario.premium ??= { suscripcion: { estado: "BASICA" }, watchlist: [], alertas: [] });
}

export function crearHandlersPremium({ raiz, proteger, error, leerCuerpo, persistir }) {
  const guardar = (resultado, status = 200) => {
    persistir();
    return HttpResponse.json(resultado, { status });
  };
  const protegidoPremium = (resolver) =>
    proteger((contexto) => {
      const estado = estadoPremium(contexto.usuario);
      if (estado.suscripcion.estado !== "ACTIVA") {
        return error(contexto.request, 403, "FUNCION_PREMIUM", "Activa Premium para continuar.");
      }
      return resolver(contexto, estado);
    });
  const errorValidacion = (request, campo, problema) =>
    error(request, 400, "VALIDACION_FALLIDA", problema, { detalles: [{ campo, problema }] });

  const seguimiento = (recurso) => {
    const ruta = `${raiz}/${recurso}`;
    const cambiar = (activa) =>
      protegidoPremium(({ request, params }, estado) => {
        const elemento = estado[recurso].find(({ id }) => id === params.id);
        if (!elemento) return error(request, 404, "NO_ENCONTRADO", "Elemento no encontrado.");
        elemento.activa = activa;
        return guardar(elemento);
      });
    return [
      rest.get(
        ruta,
        protegidoPremium((_, estado) => HttpResponse.json(estado[recurso]))
      ),
      rest.post(
        ruta,
        protegidoPremium(async ({ request }, estado) => {
          const datos = await leerCuerpo(request);
          const ticker = typeof datos.ticker === "string" ? datos.ticker.trim().toUpperCase() : "";
          const accion = ACCIONES.find((item) => item.ticker === ticker);
          if (!accion) return errorValidacion(request, "ticker", "Escribe un ticker del catálogo.");

          const regla = {};
          if (recurso === "alertas") {
            if (!["SUBE_A", "BAJA_A"].includes(datos.condicion)) {
              return errorValidacion(request, "condicion", "Elige una condición de precio.");
            }
            if (
              !/^\d{1,12}(\.\d{1,2})?$/.test(datos.precioObjetivo) ||
              Number(datos.precioObjetivo) <= 0
            ) {
              return errorValidacion(
                request,
                "precioObjetivo",
                "Escribe un precio positivo con hasta dos decimales."
              );
            }
            regla.condicion = datos.condicion;
            regla.precioObjetivo = Number(datos.precioObjetivo).toFixed(2);
          }
          const existente = estado[recurso].find(
            (item) =>
              item.ticker === ticker &&
              item.condicion === regla.condicion &&
              item.precioObjetivo === regla.precioObjetivo
          );
          if (existente) {
            return errorValidacion(
              request,
              "ticker",
              existente.activa
                ? "Este elemento ya está activo."
                : "Este elemento está eliminado. Puedes reactivarlo desde la lista."
            );
          }
          const elemento = {
            id: nuevoUuid(),
            ticker,
            moneda: accion.moneda,
            activa: true,
            ...regla,
          };
          estado[recurso].push(elemento);
          return guardar(elemento, 201);
        })
      ),
      rest.delete(`${ruta}/:id`, cambiar(false)),
      rest.patch(`${ruta}/:id`, cambiar(true)),
    ];
  };

  return [
    rest.get(
      `${raiz}/suscripciones/planes`,
      proteger(() => HttpResponse.json(planes))
    ),
    rest.get(
      `${raiz}/suscripciones/actual`,
      proteger(({ usuario }) => HttpResponse.json(estadoPremium(usuario).suscripcion))
    ),
    rest.post(
      `${raiz}/suscripciones/checkout`,
      proteger(async ({ usuario, request }) => {
        const { planId, escenarioPrueba } = await leerCuerpo(request);
        const plan = planes.find(({ id }) => id === planId);
        if (!plan) return errorValidacion(request, "planId", "Selecciona un plan disponible.");
        if (escenarioPrueba !== "APROBADO") {
          return error(request, 402, "PAGO_RECHAZADO", "La tarjeta de prueba fue rechazada.");
        }
        const estado = estadoPremium(usuario);
        if (estado.suscripcion.estado !== "ACTIVA") {
          estado.suscripcion = { estado: "ACTIVA", planId: plan.id };
        }
        return guardar({ suscripcion: estado.suscripcion });
      })
    ),
    rest.delete(
      `${raiz}/suscripciones/actual`,
      proteger(({ usuario }) => {
        const estado = estadoPremium(usuario);
        if (estado.suscripcion.estado === "ACTIVA") {
          estado.suscripcion = { ...estado.suscripcion, estado: "CANCELADA" };
        }
        return guardar(estado.suscripcion);
      })
    ),
    ...seguimiento("watchlist"),
    ...seguimiento("alertas"),
  ];
}
