import { useCallback, useMemo, useState } from "react";
import styles from "./AccionesPage.module.css";
import AccionesFiltros from "../components/acciones/AccionesFiltros.jsx";
import AccionesTabla from "../components/acciones/AccionesTabla.jsx";
import Paginacion from "../components/acciones/Paginacion.jsx";
import CotizacionDetalle from "../components/acciones/CotizacionDetalle.jsx";
import { useAcciones } from "../hooks/useAcciones.js";
import { useCotizacion } from "../hooks/useCotizacion.js";
import { useAhora } from "../hooks/useAhora.js";

const TAMANO_PAGINA = 10;

/**
 * Pantalla de acciones y cotizaciones (SCRUM-24).
 *
 * Lista paginada con filtros (mercado, sector, texto) y panel de detalle de la cotización
 * seleccionada. Los datos vienen de la caché del backend; la advertencia de antigüedad se
 * recalcula cada segundo contra la hora local.
 */
export default function AccionesPage() {
  const [filtros, setFiltros] = useState({ mercado: "", sector: "", q: "", pagina: 0 });
  // Se guarda la acción completa para que el detalle siga visible al cambiar de página.
  const [accionSeleccionada, setAccionSeleccionada] = useState(null);
  const ahora = useAhora(1000);

  const consulta = useMemo(() => ({ ...filtros, tamano: TAMANO_PAGINA }), [filtros]);
  const { pagina, cargando, error, recargar } = useAcciones(consulta);
  const cotizacion = useCotizacion(accionSeleccionada?.ticker ?? null);

  const cambiarFiltros = useCallback((cambios) => {
    // Cualquier cambio de filtro vuelve a la primera página.
    setFiltros((previos) => ({ ...previos, ...cambios, pagina: 0 }));
  }, []);

  const acciones = pagina?.contenido ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <div>
          <h1 className={styles.heading}>Acciones y cotizaciones</h1>
          <p className={styles.subheading}>
            Precios servidos desde la caché de la plataforma. NYSE y NASDAQ se actualizan cada 5 s y
            se resaltan si superan 15 s de antigüedad; LSE, TSE y ASX se actualizan con menor
            frecuencia por los límites de sus proveedores y usan el umbral que indica el backend.
          </p>
        </div>

        <AccionesFiltros valores={filtros} onCambiar={cambiarFiltros} />

        {error && (
          <div className={styles.banner} role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => recargar()}>
              Reintentar
            </button>
          </div>
        )}

        <div className={styles.columns}>
          <section className={styles.card} aria-label="Listado de acciones" aria-busy={cargando}>
            {cargando && !pagina ? (
              <p className={styles.estado} role="status">
                Cargando acciones…
              </p>
            ) : (
              <>
                <AccionesTabla
                  acciones={acciones}
                  seleccionada={accionSeleccionada?.ticker ?? null}
                  onSeleccionar={setAccionSeleccionada}
                  ahora={ahora}
                />
                {pagina && (
                  <Paginacion
                    pagina={pagina.pagina}
                    totalPaginas={pagina.totalPaginas}
                    totalElementos={pagina.totalElementos}
                    onCambiar={(n) => setFiltros((f) => ({ ...f, pagina: n }))}
                  />
                )}
              </>
            )}
          </section>

          <CotizacionDetalle
            accion={accionSeleccionada}
            cotizacion={cotizacion.cotizacion}
            cargando={cotizacion.cargando}
            error={cotizacion.error}
            ahora={ahora}
            onReintentar={cotizacion.recargar}
          />
        </div>
      </div>
    </div>
  );
}
