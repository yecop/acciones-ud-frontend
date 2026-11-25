import { useState } from "react";
import styles from "./FiltrosOrdenes.module.css";
import { FILTROS_VACIOS, hayFiltros, validarRango } from "./filtrosOrdenes.js";
import { OPCIONES_ESTADO } from "./estadosOrden.js";

/**
 * Formulario de filtros del historial. Se aplican con «Aplicar» (no en cada tecla) y se limpian
 * con «Limpiar». Valida que el rango de fechas tenga sentido antes de pedir nada.
 *
 * @param {object} props
 * @param {object} props.valores   Filtros aplicados (estado, ticker, lado, desde, hasta).
 * @param {(filtros:object)=>void} props.onAplicar
 */
export default function FiltrosOrdenes({ valores, onAplicar }) {
  const [borrador, setBorrador] = useState(valores);
  const [error, setError] = useState(null);

  const cambiar = (campo) => (e) => setBorrador((p) => ({ ...p, [campo]: e.target.value }));

  const aplicar = (e) => {
    e.preventDefault();
    const problema = validarRango(borrador);
    setError(problema);
    if (!problema) onAplicar({ ...borrador, ticker: borrador.ticker.trim().toUpperCase() });
  };

  const limpiar = () => {
    setBorrador(FILTROS_VACIOS);
    setError(null);
    onAplicar(FILTROS_VACIOS);
  };

  return (
    <form className={styles.form} onSubmit={aplicar} aria-label="Filtros de órdenes" noValidate>
      <label className={styles.campo}>
        <span>Estado</span>
        <select value={borrador.estado} onChange={cambiar("estado")}>
          <option value="">Todos</option>
          {OPCIONES_ESTADO.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.campo}>
        <span>Operación</span>
        <select value={borrador.lado} onChange={cambiar("lado")}>
          <option value="">Compra y venta</option>
          <option value="COMPRA">Compra</option>
          <option value="VENTA">Venta</option>
        </select>
      </label>

      <label className={styles.campo}>
        <span>Acción (ticker)</span>
        <input
          value={borrador.ticker}
          maxLength={10}
          placeholder="AAPL"
          autoCapitalize="characters"
          onChange={cambiar("ticker")}
        />
      </label>

      <label className={styles.campo}>
        <span>Desde</span>
        <input type="date" value={borrador.desde} onChange={cambiar("desde")} />
      </label>

      <label className={styles.campo}>
        <span>Hasta</span>
        <input type="date" value={borrador.hasta} onChange={cambiar("hasta")} />
      </label>

      <div className={styles.botones}>
        <button type="submit" className={styles.primario}>
          Aplicar
        </button>
        <button
          type="button"
          className={styles.secundario}
          onClick={limpiar}
          disabled={!hayFiltros(borrador) && !hayFiltros(valores)}
        >
          Limpiar
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
