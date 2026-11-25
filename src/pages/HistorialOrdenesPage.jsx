import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "./HistorialOrdenesPage.module.css";
import FiltrosOrdenes from "../components/order/FiltrosOrdenes.jsx";
import OrdenesLista from "../components/order/OrdenesLista.jsx";
import {
  aFiltrosApi,
  escribirParams,
  hayFiltros,
  leerFiltros,
  TAMANO_PAGINA,
} from "../components/order/filtrosOrdenes.js";
import Paginacion from "../components/ui/Paginacion.jsx";
import { useOrdenes } from "../hooks/useOrdenes.js";

/**
 * Historial de órdenes (SCRUM-62): todas las órdenes del usuario con filtros (estado, operación,
 * acción y fechas), paginación y acceso al detalle. Los filtros y la página viven en la URL.
 */
export default function HistorialOrdenesPage() {
  const [params, setParams] = useSearchParams();
  const { filtros, pagina } = leerFiltros(params);
  const ordenes = useOrdenes(aFiltrosApi(filtros, pagina, TAMANO_PAGINA));

  const aplicarFiltros = useCallback(
    (nuevos) => setParams(escribirParams(nuevos, 1), { replace: false }),
    [setParams]
  );
  const irAPagina = useCallback(
    (n) => setParams(escribirParams(filtros, n), { replace: false }),
    [filtros, setParams]
  );

  const filtrado = hayFiltros(filtros);
  const claveFiltros = JSON.stringify(filtros);

  return (
    <div className={styles.main}>
      <div>
        <h1 className={styles.heading}>Historial de órdenes</h1>
        <p className={styles.subheading}>
          Todas tus órdenes, con su estado y sus ejecuciones. Abre el detalle para ver cada cambio
          de estado.
        </p>
      </div>

      <FiltrosOrdenes key={claveFiltros} valores={filtros} onAplicar={aplicarFiltros} />

      <OrdenesLista
        titulo="Órdenes"
        pagina={ordenes.pagina}
        cargando={ordenes.cargando}
        error={ordenes.error}
        onReintentar={ordenes.recargar}
        onCambio={ordenes.refrescar}
        detalleHref={(orden) => `/historial/${orden.id}`}
        mostrarNota={false}
        encabezadoExtra={
          <Link className={styles.enlace} to="/operar">
            Nueva orden
          </Link>
        }
        vacio={
          filtrado
            ? "Ninguna orden coincide con los filtros. Prueba con otros o pulsa «Limpiar»."
            : "Todavía no tienes órdenes. Crea la primera desde «Operar»."
        }
      />

      <Paginacion
        pagina={pagina}
        totalPaginas={ordenes.pagina?.totalPaginas ?? 0}
        totalElementos={ordenes.pagina?.totalElementos}
        unidad="órdenes"
        onCambiar={irAPagina}
      />
    </div>
  );
}
