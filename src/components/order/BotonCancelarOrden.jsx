import { useState } from "react";
import styles from "./BotonCancelarOrden.module.css";
import { cancelarOrden } from "../../api/ordenesApi.js";
import { etiquetaLado, puedeCancelar } from "./estadosOrden.js";
import { formatCurrency } from "./orderUtils.js";

/**
 * «Cancelar» con confirmación en línea. Solo aparece si la orden se puede cancelar.
 * Avisa el resultado con `onResultado({tipo: "ok" | "error", texto})` y siempre `onTerminado()`
 * después, para que quien lo usa refresque la lista, el detalle y el saldo.
 */
export default function BotonCancelarOrden({ orden, onResultado, onTerminado }) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  if (!puedeCancelar(orden)) return null;

  const cancelar = async () => {
    setCancelando(true);
    try {
      const r = await cancelarOrden(orden.id);
      const liberado = Number(r.saldoLiberado);
      onResultado?.({
        tipo: "ok",
        texto: liberado
          ? `Orden cancelada. Se liberaron ${formatCurrency(liberado)}.`
          : "Orden cancelada.",
      });
    } catch (e) {
      onResultado?.({
        tipo: "error",
        texto: e?.mensajeUsuario ?? "No pudimos cancelar la orden. Inténtalo de nuevo.",
      });
    } finally {
      setCancelando(false);
      setConfirmando(false);
      onTerminado?.();
    }
  };

  if (!confirmando) {
    return (
      <button
        type="button"
        className={styles.enlace}
        aria-label={`Cancelar orden de ${orden.ticker}`}
        onClick={() => setConfirmando(true)}
      >
        Cancelar
      </button>
    );
  }

  return (
    <span className={styles.confirmar}>
      <span>
        ¿Cancelar {etiquetaLado(orden.lado).toLowerCase()} de {orden.cantidad} {orden.ticker}?
      </span>
      <button type="button" className={styles.peligro} disabled={cancelando} onClick={cancelar}>
        {cancelando ? "Cancelando…" : "Sí, cancelar"}
      </button>
      <button
        type="button"
        className={styles.enlace}
        disabled={cancelando}
        onClick={() => setConfirmando(false)}
      >
        No
      </button>
    </span>
  );
}
