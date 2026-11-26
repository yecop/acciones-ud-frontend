import { useCallback, useMemo, useState } from "react";
import OrderForm from "./OrderForm.jsx";
import { borradorValido, construirSolicitud } from "./ordenPayload.js";
import { useCrearOrden } from "../../hooks/useCrearOrden.js";
import { useSimulacionOrden } from "../../hooks/useSimulacionOrden.js";

/**
 * Formulario de orden conectado a la API: simula en el backend mientras se escribe, crea la orden
 * con `Idempotency-Key`, maneja el encolamiento con mercado cerrado y la doble autorización, y
 * traduce los errores del catálogo. La presentación vive en `OrderForm`.
 *
 * @param {object} props
 * @param {object} props.asset            { symbol, name, currentPrice }.
 * @param {number} props.saldoDisponible
 * @param {boolean} [props.isMarketOpen]  Estado conocido del mercado; la simulación lo corrige.
 * @param {{zonaHoraria?:string, proximaApertura?:string|null}|null} [props.mercado] Estado del mercado de la acción.
 * @param {function} [props.onCreada]     Se llama con la orden creada (p. ej. para refrescar saldo y lista).
 */
export default function NuevaOrden({
  asset,
  saldoDisponible,
  isMarketOpen = true,
  mercado = null,
  onCreada,
}) {
  const [borrador, setBorrador] = useState(null);
  const solicitud = useMemo(
    () => (borradorValido(borrador) ? construirSolicitud(borrador) : null),
    [borrador]
  );
  const { resultado: simulacion } = useSimulacionOrden(solicitud);
  const { estado, acciones } = useCrearOrden({ onCreada });

  // El mercado real lo informa la simulación; antes de tenerla se usa lo que sabe la pantalla.
  const mercadoAbierto = simulacion?.mercadoAbierto ?? isMarketOpen;

  const onSubmit = useCallback(
    (payload) =>
      acciones.enviar(construirSolicitud(payload), {
        encolada: !mercadoAbierto,
        resumen: { side: payload.side, quantity: payload.quantity, symbol: payload.symbol },
      }),
    [acciones, mercadoAbierto]
  );

  return (
    <OrderForm
      asset={asset}
      saldoDisponible={saldoDisponible}
      isMarketOpen={mercadoAbierto}
      mercado={mercado}
      simulacion={simulacion}
      envio={estado}
      acciones={acciones}
      onDraftChange={setBorrador}
      onSubmit={onSubmit}
    />
  );
}
