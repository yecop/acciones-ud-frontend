import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerDashboard } from "../api/dashboardApi.js";
import { obtenerEstadoMercado } from "../api/mercadosApi.js";
import { obtenerSaldo } from "../api/portafolioApi.js";

/**
 * Datos del panel del inversionista: saldo, resumen del dashboard y estado del mercado de la
 * acción destacada. Cada llamada falla por separado: lo que no llegue queda en `null` y el resto
 * se muestra. Solo hay `error` si no llegó nada. Se refresca cada `intervaloMs`.
 *
 * @returns {{cargando:boolean, error:Error|null, saldo:object|null, dashboard:object|null,
 *   estadoMercado:object|null, refrescar:Function}}
 */
export function useResumenPanel({ intervaloMs = 30000 } = {}) {
  const [estado, setEstado] = useState({
    cargando: true,
    error: null,
    saldo: null,
    dashboard: null,
    estadoMercado: null,
  });
  const montado = useRef(true);
  const ciclo = useRef(0);

  const cargar = useCallback(async () => {
    const miCiclo = (ciclo.current += 1);
    const vigente = () => montado.current && ciclo.current === miCiclo;
    setEstado((previo) => ({ ...previo, cargando: true }));

    const [saldoR, dashboardR] = await Promise.allSettled([obtenerSaldo(), obtenerDashboard()]);
    if (!vigente()) return;
    const dashboard = dashboardR.status === "fulfilled" ? dashboardR.value : null;

    let estadoMercado = null;
    const mercado = dashboard?.accionesInteres?.[0]?.mercado;
    if (mercado) {
      try {
        estadoMercado = await obtenerEstadoMercado(mercado);
      } catch {
        /* sin estado: el formulario asume mercado abierto */
      }
      if (!vigente()) return;
    }

    const saldo = saldoR.status === "fulfilled" ? saldoR.value : null;
    setEstado({
      cargando: false,
      error: !saldo && !dashboard ? (dashboardR.reason ?? saldoR.reason ?? null) : null,
      saldo,
      dashboard,
      estadoMercado,
    });
  }, []);

  useEffect(() => {
    montado.current = true;
    cargar();
    const id = setInterval(cargar, intervaloMs);
    return () => {
      montado.current = false;
      clearInterval(id);
    };
  }, [cargar, intervaloMs]);

  return { ...estado, refrescar: cargar };
}
