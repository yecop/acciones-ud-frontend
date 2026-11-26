import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "./OrdenesPage.module.css";
import NuevaOrden from "../components/order/NuevaOrden.jsx";
import OrdenesLista from "../components/order/OrdenesLista.jsx";
import { listarAcciones } from "../api/cotizacionesApi.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { ROLES } from "../auth/roles.js";
import { useAccionOperable } from "../hooks/useAccionOperable.js";
import { useOrdenes } from "../hooks/useOrdenes.js";
import { useSaldoDisponible } from "../hooks/useSaldoDisponible.js";

const TICKER_POR_DEFECTO = "AAPL";

/**
 * Pantalla «Operar» (SCRUM-61): crear una orden y ver/cancelar las propias.
 * `?ticker=XXXX` preselecciona la acción (así llega desde «Operar» en los mercados).
 */
export default function OrdenesPage() {
  const { rol } = useAuth();
  const [params, setParams] = useSearchParams();
  const ticker = (params.get("ticker") ?? TICKER_POR_DEFECTO).toUpperCase();

  const [opciones, setOpciones] = useState([]);
  useEffect(() => {
    let activo = true;
    listarAcciones({ tamano: 100 })
      .then((pagina) => {
        if (activo)
          setOpciones(pagina.contenido.map((a) => ({ ticker: a.ticker, nombre: a.nombre })));
      })
      .catch(() => {
        /* sin lista: el selector queda con la acción actual */
      });
    return () => {
      activo = false;
    };
  }, []);

  const operable = useAccionOperable(ticker);
  const { saldo, refrescar: refrescarSaldo } = useSaldoDisponible();
  const ordenes = useOrdenes({ tamano: 10 });

  const alCambiar = useCallback(() => {
    ordenes.refrescar();
    refrescarSaldo();
  }, [ordenes, refrescarSaldo]);

  if (rol === ROLES.COM) {
    return (
      <div className={styles.main}>
        <h1 className={styles.heading}>Operar</h1>
        <p className={styles.aviso} role="status">
          Como comisionista no creas órdenes con tu propia cuenta: las órdenes de tus clientes se
          proponen y se firman desde <Link to="/propuestas">Propuestas</Link>.
        </p>
      </div>
    );
  }

  const precio = operable.cotizacion ? Number(operable.cotizacion.precio) : null;
  const lista = opciones.some((o) => o.ticker === ticker)
    ? opciones
    : [{ ticker, nombre: operable.accion?.nombre ?? "" }, ...opciones];

  return (
    <div className={styles.main}>
      <div>
        <h1 className={styles.heading}>Operar</h1>
        <p className={styles.subheading}>
          Crea una orden de compra o venta y sigue su estado. Puedes cancelar mientras esté
          pendiente.
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.columna}>
          <label className={styles.selector}>
            <span>Acción</span>
            <select
              value={ticker}
              onChange={(e) => setParams({ ticker: e.target.value }, { replace: true })}
            >
              {lista.map((o) => (
                <option key={o.ticker} value={o.ticker}>
                  {o.ticker}
                  {o.nombre ? ` · ${o.nombre}` : ""}
                </option>
              ))}
            </select>
          </label>

          {operable.cargando && <p role="status">Cargando la acción…</p>}
          {operable.error && (
            <p className={styles.alerta} role="alert">
              {operable.error}
            </p>
          )}
          {operable.cotizacion?.advertencia && (
            <p className={styles.alerta} role="status">
              {operable.cotizacion.advertencia.mensaje}
            </p>
          )}

          {operable.accion && precio !== null && (
            <NuevaOrden
              key={ticker}
              asset={{
                symbol: operable.accion.ticker,
                name: operable.accion.nombre,
                currentPrice: precio,
              }}
              saldoDisponible={saldo ? Number(saldo.disponible) : 0}
              isMarketOpen={operable.mercadoAbierto ?? true}
              mercado={operable.mercado}
              onCreada={alCambiar}
            />
          )}
        </div>

        <OrdenesLista
          pagina={ordenes.pagina}
          cargando={ordenes.cargando}
          error={ordenes.error}
          onReintentar={ordenes.recargar}
          onCambio={alCambiar}
          encabezadoExtra={<Link to="/historial">Ver historial completo</Link>}
        />
      </div>
    </div>
  );
}
