import { http as rest, HttpResponse } from "msw";
import { nuevoUuid } from "../api/httpClient.js";
import { monto } from "./mercadosData.js";
import { saldoDe, vistaSaldo } from "./ordenes.js";

export function crearHandlersFondos({ raiz, db, protegido, error, leerCuerpo, pagina }) {
  const ruta = `${raiz}/cuenta`;
  const inversor = ["INVERSIONISTA"];
  const movimientosDe = (usuario) => (usuario.movimientosFondos ??= []);
  const falloCampo = (request, campo, problema) =>
    error(request, 400, "VALIDACION_FALLIDA", problema, { detalles: [{ campo, problema }] });

  const operar = (tipo) =>
    protegido(inversor, async ({ request, usuario }) => {
      const datos = await leerCuerpo(request);
      const importe = Number(datos.monto);
      if (
        !["number", "string"].includes(typeof datos.monto) ||
        !/^[0-9]+(\.[0-9]{1,2})?$/.test(datos.monto) ||
        importe <= 0 ||
        importe > 1_000_000
      ) {
        return falloCampo(
          request,
          "monto",
          "Indica un monto de hasta USD 1.000.000 con máximo dos decimales."
        );
      }

      const historial = movimientosDe(usuario);
      const clave = request.headers.get("Idempotency-Key")?.trim();
      if (!clave || clave.length > 60) {
        return falloCampo(request, "Idempotency-Key", "Envía una clave de 1 a 60 caracteres.");
      }
      const fondosInsuficientes = () =>
        error(request, 422, "FONDOS_INSUFICIENTES", "El monto supera el saldo disponible.");
      const anterior = historial.find((item) => item.clave === clave);
      if (anterior) {
        if (anterior.movimiento.tipo !== tipo || anterior.movimiento.monto !== monto(importe)) {
          return error(
            request,
            409,
            "CONFLICTO_IDEMPOTENCIA",
            "La clave ya se usó con otros datos."
          );
        }
        if (anterior.movimiento.estado === "FALLIDO") return fondosInsuficientes();
        return HttpResponse.json(
          { movimiento: anterior.movimiento, saldo: vistaSaldo(db.trading, usuario) },
          { headers: { "Idempotent-Replayed": "true" } }
        );
      }

      const saldo = saldoDe(db.trading, usuario);
      const fallido = tipo === "RETIRO" && importe > saldo.disponible;

      const instante = new Date().toISOString();
      const traceId = request.headers.get("X-Trace-Id") ?? nuevoUuid();
      const movimiento = {
        id: nuevoUuid(),
        tipo,
        estado: fallido ? "FALLIDO" : "COMPLETADO",
        monto: monto(importe),
        moneda: "USD",
        creadoEn: instante,
        completadoEn: fallido ? null : instante,
        traceId,
      };
      historial.unshift({ clave, movimiento });
      if (fallido) return fondosInsuficientes();

      const diferencia = tipo === "DEPOSITO" ? importe : -importe;
      db.trading.saldos[usuario.id] = {
        ...saldo,
        disponible: Number(monto(saldo.disponible + diferencia)),
      };
      return HttpResponse.json(
        { movimiento, saldo: vistaSaldo(db.trading, usuario) },
        { status: 201, headers: { "X-Trace-Id": traceId } }
      );
    });

  return [
    rest.post(`${ruta}/depositos`, operar("DEPOSITO")),
    rest.post(`${ruta}/retiros`, operar("RETIRO")),
    rest.get(
      `${ruta}/movimientos`,
      protegido([...inversor, "COMISIONISTA"], ({ request, usuario }) => {
        const url = new URL(request.url);
        const tipo = url.searchParams.get("tipo");
        if (
          tipo &&
          !["DEPOSITO", "RETIRO", "RESERVA", "LIBERACION", "LIQUIDACION"].includes(tipo)
        ) {
          return falloCampo(request, "tipo", "Selecciona un tipo de movimiento válido.");
        }
        const numero = Number(url.searchParams.get("pagina") ?? 0);
        const tamano = Number(url.searchParams.get("tamano") ?? 20);
        if (!Number.isInteger(numero) || numero < 0) {
          return falloCampo(request, "pagina", "Indica una página válida.");
        }
        if (!Number.isInteger(tamano) || tamano < 1 || tamano > 100) {
          return falloCampo(request, "tamano", "Indica un tamaño de 1 a 100.");
        }
        const titular = url.searchParams.get("inversionistaId");
        if (usuario.rol === "COMISIONISTA" && !titular) {
          return falloCampo(request, "inversionistaId", "Indica el inversionista.");
        }
        const cuenta =
          usuario.rol === "COMISIONISTA"
            ? db.usuarios.find(
                (item) => item.id === titular && item.comisionista?.id === usuario.id
              )
            : titular && titular !== usuario.id
              ? undefined
              : usuario;
        if (!cuenta) {
          return error(request, 403, "ACCESO_DENEGADO", "Solo puedes consultar tu propia cuenta.");
        }
        const lista = movimientosDe(cuenta).map(({ movimiento }) => movimiento);
        return HttpResponse.json(
          pagina(
            lista.filter((item) => !tipo || item.tipo === tipo),
            url
          )
        );
      })
    ),
  ];
}
