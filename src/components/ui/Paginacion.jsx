import styles from "./Paginacion.module.css";

/**
 * Paginación simple: «Anterior», «Página x de y» y «Siguiente».
 *
 * @param {object} props
 * @param {number} props.pagina         Página actual, desde 1.
 * @param {number} props.totalPaginas
 * @param {number} [props.totalElementos]
 * @param {string} [props.unidad]       Cómo llamar a los elementos (por defecto «resultados»).
 * @param {(pagina:number)=>void} props.onCambiar
 */
export default function Paginacion({
  pagina,
  totalPaginas,
  totalElementos,
  unidad = "resultados",
  onCambiar,
}) {
  if (!totalPaginas || totalPaginas < 1) return null;
  return (
    <nav className={styles.nav} aria-label="Paginación">
      <button
        type="button"
        className={styles.boton}
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        Anterior
      </button>
      <p className={styles.texto} aria-live="polite">
        Página {pagina} de {totalPaginas}
        {totalElementos !== undefined && ` · ${totalElementos} ${unidad}`}
      </p>
      <button
        type="button"
        className={styles.boton}
        disabled={pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
