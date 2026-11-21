import { useCallback, useEffect, useRef, useState } from "react";
import { CotizacionesService } from "../api/cotizacionesApi.js";
import { listarMercados, obtenerEstadoMercado } from "../api/mercadosApi.js";
import { obtenerPerfil } from "../api/perfilApi.js";

/** Tope de páginas por mercado, por si el catálogo creciera. */
const MAX_PAGINAS = 5;

/**
 * Acciones de un mercado. `GET /acciones?mercado=X` ya trae la cotización dentro de cada acción
 * (desde la caché del backend), así que basta una llamada por mercado.
 */
async function accionesDe(codigo) {
  const acciones = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
    const respuesta = await CotizacionesService.listarAcciones({
      mercado: codigo,
      pagina,
      tamano: 100,
    });
    acciones.push(...(respuesta.contenido ?? []));
    if (pagina + 1 >= (respuesta.totalPaginas ?? 1)) break;
  }
  return acciones;
}

/**
 * Datos del dashboard de mercados: mercados con su estado, acciones por mercado (cada una con su
 * cotización y las advertencias del backend) e intereses del usuario. Se refresca cada
 * `intervaloMs`.
 *
 * Los fallos son parciales a propósito: si falla un mercado, el resto se muestra; si falla la
 * lista de mercados, se conserva lo último que se cargó y se informa del error.
 *
 * @returns {{
 *   cargando:boolean, error:Error|null, mercados:Array, acciones:Object,
 *   intereses:Object|null, actualizadoEn:number|null, refrescar:Function
 * }}
 *   `mercados[i]` = mercado + `estado` (o null) + `estadoError` + `accionesError`.
 *   `acciones[codigoMercado]` = lista de acciones, cada una con `cotizacion` y `advertencia`.
 */
export function useMercadosDashboard({ intervaloMs = 30000 } = {}) {
  const [estado, setEstado] = useState({
    cargando: true,
    error: null,
    mercados: [],
    acciones: {},
    intereses: null,
    actualizadoEn: null,
  });
  const ciclo = useRef(0);
  const enCurso = useRef(false);
  const montado = useRef(true);

  const cargar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    const miCiclo = (ciclo.current += 1);
    const vigente = () => montado.current && ciclo.current === miCiclo;
    const parcial = (cambios) => {
      if (vigente()) setEstado((previo) => ({ ...previo, ...cambios }));
    };

    try {
      parcial({ cargando: true });
      const [listaR, perfilR] = await Promise.allSettled([listarMercados(), obtenerPerfil()]);
      if (!vigente()) return;

      if (listaR.status === "rejected") {
        parcial({ cargando: false, error: listaR.reason });
        return;
      }
      const lista = listaR.value;
      const intereses = perfilR.status === "fulfilled" ? (perfilR.value?.intereses ?? null) : null;

      // Estado y acciones de cada mercado, en paralelo; cada fallo queda aislado.
      const porMercado = await Promise.all(
        lista.map(async (mercado) => {
          const [estadoR, accionesR] = await Promise.allSettled([
            obtenerEstadoMercado(mercado.codigo),
            accionesDe(mercado.codigo),
          ]);
          return {
            mercado: {
              ...mercado,
              estado: estadoR.status === "fulfilled" ? estadoR.value : null,
              estadoError: estadoR.status === "rejected" ? estadoR.reason : null,
              accionesError: accionesR.status === "rejected" ? accionesR.reason : null,
            },
            acciones: accionesR.status === "fulfilled" ? accionesR.value : [],
          };
        })
      );
      if (!vigente()) return;

      parcial({
        error: null,
        mercados: porMercado.map((m) => m.mercado),
        acciones: Object.fromEntries(porMercado.map((m) => [m.mercado.codigo, m.acciones])),
        intereses,
        cargando: false,
        actualizadoEn: Date.now(),
      });
    } catch (e) {
      parcial({ cargando: false, error: e });
    } finally {
      enCurso.current = false;
    }
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

  const refrescar = useCallback(() => {
    // Un refresco manual no debe quedar bloqueado por un ciclo anterior que sigue en vuelo.
    enCurso.current = false;
    return cargar();
  }, [cargar]);

  return { ...estado, refrescar };
}
