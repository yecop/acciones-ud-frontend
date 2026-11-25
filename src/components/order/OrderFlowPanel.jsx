import { useState } from "react";
import styles from "./OrderFlowPanel.module.css";
import { AlertIcon } from "../ui/Icons.jsx";
import { formatCurrency } from "./orderUtils.js";
import { etiquetaEstado } from "./estadosOrden.js";

const fechaLarga = (iso) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );

/**
 * Lo que sigue después de pulsar «Ejecutar/Encolar»: confirmar el encolamiento, pedir el código
 * de doble autorización, mostrar el error (con reintento) o confirmar que la orden se creó.
 *
 * @param {object} props
 * @param {object} props.envio     Estado de `useCrearOrden` (`fase`, `orden`, `error`, ...).
 * @param {object} props.acciones  Acciones de `useCrearOrden`.
 * @param {function} props.onNueva Limpia el formulario para crear otra orden.
 */
export default function OrderFlowPanel({ envio, acciones, onNueva }) {
  const [codigo, setCodigo] = useState("");

  if (envio.fase === "confirmar") {
    return (
      <div
        className={`${styles.panel} ${styles.aviso}`}
        role="alertdialog"
        aria-label="Confirmar encolamiento"
      >
        <p className={styles.titulo}>
          <AlertIcon /> Confirma que quieres encolar la orden
        </p>
        <p className={styles.texto}>
          {envio.aviso ?? "El mercado está cerrado."} La orden quedará <strong>pendiente</strong> y
          se enviará cuando abra
          {envio.proximaApertura ? ` (${fechaLarga(envio.proximaApertura)})` : ""}. Mientras tanto
          podrás cancelarla.
        </p>
        <div className={styles.botones}>
          <button
            type="button"
            className={styles.primario}
            onClick={acciones.confirmarEncolamiento}
          >
            Confirmar y encolar
          </button>
          <button type="button" className={styles.secundario} onClick={acciones.reiniciar}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (envio.fase === "autorizacion") {
    return (
      <form
        className={`${styles.panel} ${styles.aviso}`}
        aria-label="Autorización adicional"
        onSubmit={(e) => {
          e.preventDefault();
          acciones.autorizar(codigo);
        }}
      >
        <p className={styles.titulo}>
          <AlertIcon /> Esta orden requiere una autorización adicional
        </p>
        <p className={styles.texto}>
          Supera el umbral de orden grande que configuraste. Escribe tu código de autorización para
          enviarla.
        </p>
        <label className={styles.campo}>
          <span>Código de autorización</span>
          <input
            className={styles.input}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            disabled={envio.enviando}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        </label>
        {envio.error && (
          <p className={styles.error} role="alert">
            {envio.error}
          </p>
        )}
        <div className={styles.botones}>
          <button type="submit" className={styles.primario} disabled={envio.enviando}>
            {envio.enviando ? "Enviando…" : "Autorizar y enviar"}
          </button>
          <button
            type="button"
            className={styles.secundario}
            disabled={envio.enviando}
            onClick={acciones.reiniciar}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  if (envio.fase === "error") {
    return (
      <div className={`${styles.panel} ${styles.fallo}`} role="alert">
        <p className={styles.titulo}>
          <AlertIcon /> No se pudo crear la orden
        </p>
        <p className={styles.texto}>{envio.error}</p>
        {envio.reintentable && (
          <p className={styles.texto}>
            Si reintentas no se duplicará: usamos el mismo identificador de envío.
          </p>
        )}
        <div className={styles.botones}>
          {envio.reintentable && (
            <button type="button" className={styles.primario} onClick={acciones.reintentar}>
              Reintentar
            </button>
          )}
          <button type="button" className={styles.secundario} onClick={acciones.reiniciar}>
            Editar orden
          </button>
        </div>
      </div>
    );
  }

  if (envio.fase === "exito") {
    const { orden } = envio;
    const estado = etiquetaEstado({ ...orden, cantidad: envio.resumen?.quantity });
    return (
      <div className={`${styles.panel} ${styles.exito}`} role="status">
        <p className={styles.titulo}>
          {orden.encolada ? "Orden encolada" : "Orden creada"} · {estado.etiqueta}
        </p>
        <p className={styles.texto}>
          {orden.encolada
            ? "Se enviará cuando abra el mercado. Puedes cancelarla mientras esté pendiente. "
            : "Los fondos quedaron reservados mientras se ejecuta. "}
          Total{" "}
          {orden.estado === "PENDIENTE" || envio.resumen?.side === "buy"
            ? "descontado"
            : "a recibir"}
          : <strong>{formatCurrency(Number(orden.totalDescontado))}</strong>.
        </p>
        <p className={styles.id}>Referencia: {orden.id}</p>
        <div className={styles.botones}>
          <button type="button" className={styles.primario} onClick={onNueva}>
            Crear otra orden
          </button>
        </div>
      </div>
    );
  }

  return null;
}
