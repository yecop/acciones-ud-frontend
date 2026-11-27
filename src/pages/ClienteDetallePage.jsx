import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "../components/comisionista/comisionista.module.css";
import EstadoCarga from "../components/comisionista/EstadoCarga.jsx";
import { textoDeError } from "../components/comisionista/errores.js";
import OrdenesLista from "../components/order/OrdenesLista.jsx";
import { formatCurrency } from "../components/order/orderUtils.js";
import { obtenerCliente, ordenesDeCliente, posicionesDeCliente } from "../api/comisionistaApi.js";
import { useCarga } from "../hooks/useCarga.js";

const dinero = (v) => formatCurrency(Number(v));

/**
 * Detalle de un cliente asignado: saldo, posiciones y órdenes (solo lectura).
 * Si el cliente no existe o es de otro comisionista el backend responde 404 (o 403): aquí se
 * muestra el mismo mensaje, sin revelar cuál de los dos fue.
 */
export default function ClienteDetallePage() {
  const { id } = useParams();
  const volver = (
    <Link className={styles.volver} to="/comisionista">
      ← Volver a mis clientes
    </Link>
  );
  const cargarCliente = useCallback(({ signal }) => obtenerCliente(id, { signal }), [id]);
  const cliente = useCarga(cargarCliente);
  const ok = Boolean(cliente.datos);
  const cargarPosiciones = useCallback(({ signal }) => posicionesDeCliente(id, { signal }), [id]);
  const posiciones = useCarga(cargarPosiciones, { activo: ok });
  const cargarOrdenes = useCallback(
    ({ signal }) => ordenesDeCliente(id, { tamano: 10 }, { signal }),
    [id]
  );
  const ordenes = useCarga(cargarOrdenes, { activo: ok });

  if (!cliente.datos) {
    return (
      <div className={styles.main}>
        {volver}
        <EstadoCarga {...cliente} onReintentar={cliente.recargar} recurso="este cliente" />
      </div>
    );
  }
  const c = cliente.datos;

  return (
    <div className={styles.main}>
      {volver}
      <header className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>{c.nombre}</h1>
          <p className={styles.texto}>
            {c.correo} · Experiencia {String(c.nivelExperiencia ?? "—").toLowerCase()} ·{" "}
            {c.operaEnNombre ? "Autorizó operar a su nombre" : "No autorizó operar a su nombre"}
          </p>
        </div>
        <Link className={styles.botonPrimario} to={`/propuestas/nueva?clienteId=${c.id}`}>
          Nueva propuesta para {c.nombre}
        </Link>
      </header>

      <section className={styles.card} aria-labelledby="titulo-saldo">
        <h2 id="titulo-saldo" className={styles.subtitulo}>
          Saldo
        </h2>
        <dl className={styles.datos}>
          <div>
            <dt>Disponible</dt>
            <dd>{dinero(c.saldo.disponible)}</dd>
          </div>
          <div>
            <dt>Reservado en órdenes</dt>
            <dd>{dinero(c.saldo.reservado)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{dinero(c.saldo.total)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="titulo-posiciones">
        <h2 id="titulo-posiciones" className={styles.subtitulo}>
          Posiciones
        </h2>
        <EstadoCarga {...posiciones} onReintentar={posiciones.recargar} recurso="sus posiciones" />
        {posiciones.datos?.length === 0 && <p className={styles.texto}>Sin posiciones todavía.</p>}
        {posiciones.datos?.length > 0 && (
          <div
            className={styles.scroll}
            role="region"
            aria-label="Tabla de posiciones"
            tabIndex={0}
          >
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th scope="col">Acción</th>
                  <th scope="col" className={styles.num}>
                    Cantidad
                  </th>
                  <th scope="col" className={styles.num}>
                    Precio actual
                  </th>
                  <th scope="col" className={styles.num}>
                    Valor
                  </th>
                  <th scope="col" className={styles.num}>
                    Ganancia / pérdida
                  </th>
                </tr>
              </thead>
              <tbody>
                {posiciones.datos.map((p) => (
                  <tr key={p.activo}>
                    <td>{p.activo}</td>
                    <td className={styles.num}>{p.cantidad}</td>
                    <td className={styles.num}>{dinero(p.precioActual)}</td>
                    <td className={styles.num}>{dinero(p.valorActual)}</td>
                    <td className={styles.num}>{dinero(p.gananciaPerdida)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Órdenes del cliente">
        <OrdenesLista
          pagina={ordenes.datos}
          cargando={ordenes.cargando}
          error={ordenes.error ? textoDeError(ordenes.error, "sus órdenes") : null}
          onReintentar={ordenes.recargar}
          soloLectura
          mostrarNota={false}
          titulo="Órdenes del cliente"
          vacio="Este cliente todavía no tiene órdenes."
        />
      </section>
    </div>
  );
}
