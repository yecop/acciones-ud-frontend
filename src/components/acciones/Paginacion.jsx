import styles from "./Paginacion.module.css";

/**
 * Controles de paginación (página base 0, como el contrato).
 *
 * @param {object} props
 * @param {number} props.pagina
 * @param {number} props.totalPaginas
 * @param {number} props.totalElementos
 * @param {(pagina:number) => void} props.onCambiar
 */
export default function Paginacion({ pagina, totalPaginas, totalElementos, onCambiar }) {
  if (!totalElementos) return null;
  const ultima = Math.max(0, totalPaginas - 1);
  return (
    <nav className={styles.paginacion} aria-label="Paginación de acciones">
      <span className={styles.resumen}>
        {totalElementos} acciones · página {pagina + 1} de {Math.max(1, totalPaginas)}
      </span>
      <div className={styles.botones}>
        <button type="button" onClick={() => onCambiar(pagina - 1)} disabled={pagina <= 0}>
          Anterior
        </button>
        <button type="button" onClick={() => onCambiar(pagina + 1)} disabled={pagina >= ultima}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
