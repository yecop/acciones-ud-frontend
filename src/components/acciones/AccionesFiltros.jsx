import { useEffect, useState } from "react";
import styles from "./AccionesFiltros.module.css";

export const MERCADOS = ["NYSE", "NASDAQ", "LSE", "TSE", "ASX"];

export const SECTORES = [
  { valor: "TECNOLOGIA", etiqueta: "Tecnología" },
  { valor: "FINANZAS", etiqueta: "Finanzas" },
  { valor: "SALUD", etiqueta: "Salud" },
  { valor: "ENERGIA", etiqueta: "Energía" },
  { valor: "CONSUMO", etiqueta: "Consumo" },
  { valor: "MATERIALES", etiqueta: "Materiales" },
];

/**
 * Filtros del listado de acciones: mercado, sector y búsqueda libre (con espera de 300 ms
 * para no consultar en cada tecla).
 *
 * @param {object} props
 * @param {{mercado?:string, sector?:string, q?:string}} props.valores
 * @param {(cambios:object) => void} props.onCambiar
 */
export default function AccionesFiltros({ valores, onCambiar }) {
  const [texto, setTexto] = useState(valores.q ?? "");

  useEffect(() => {
    if (texto === (valores.q ?? "")) return undefined;
    const id = setTimeout(() => onCambiar({ q: texto }), 300);
    return () => clearTimeout(id);
  }, [texto, valores.q, onCambiar]);

  const hayFiltros = Boolean(valores.mercado || valores.sector || valores.q);

  return (
    <form className={styles.filtros} role="search" onSubmit={(e) => e.preventDefault()}>
      <label className={styles.campo}>
        <span>Buscar</span>
        <input
          type="search"
          placeholder="Ticker o empresa"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={50}
        />
      </label>

      <label className={styles.campo}>
        <span>Mercado</span>
        <select
          value={valores.mercado ?? ""}
          onChange={(e) => onCambiar({ mercado: e.target.value })}
        >
          <option value="">Todos</option>
          {MERCADOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.campo}>
        <span>Sector</span>
        <select
          value={valores.sector ?? ""}
          onChange={(e) => onCambiar({ sector: e.target.value })}
        >
          <option value="">Todos</option>
          {SECTORES.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.etiqueta}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={styles.limpiar}
        disabled={!hayFiltros}
        onClick={() => {
          setTexto("");
          onCambiar({ mercado: "", sector: "", q: "" });
        }}
      >
        Limpiar
      </button>
    </form>
  );
}
