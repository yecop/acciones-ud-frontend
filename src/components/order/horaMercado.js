/**
 * Fechas de mercado: la hora en la zona del mercado (la que importa para abrir y cerrar) junto a
 * la hora de la persona. `zona` es un id IANA, p. ej. `America/New_York` (campo `zonaHoraria` de
 * `GET /mercados/{codigo}/estado`).
 */

const cache = new Map();
function formato(zona) {
  const clave = zona ?? "local";
  if (!cache.has(clave)) {
    cache.set(
      clave,
      new Intl.DateTimeFormat("es-CO", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        ...(zona ? { timeZone: zona } : {}),
      })
    );
  }
  return cache.get(clave);
}

/** «Nueva York» a partir de `America/New_York`. */
export function nombreDeZona(zona) {
  const ciudad = String(zona ?? "")
    .split("/")
    .pop();
  const NOMBRES = { New_York: "Nueva York", London: "Londres", Tokyo: "Tokio", Sydney: "Sídney" };
  return NOMBRES[ciudad] ?? ciudad.replace(/_/g, " ");
}

/**
 * @returns {{mercado:string|null, local:string, zona:string|null}|null}
 *   `mercado`: hora en la zona del mercado; `local`: hora de la persona.
 */
export function describirMomento(iso, zona) {
  const fecha = new Date(iso);
  if (!iso || Number.isNaN(fecha.getTime())) return null;
  let delMercado = null;
  try {
    delMercado = zona ? formato(zona).format(fecha) : null;
  } catch {
    delMercado = null; // zona desconocida: solo se muestra la hora local
  }
  return {
    mercado: delMercado,
    local: formato(null).format(fecha),
    zona: delMercado ? nombreDeZona(zona) : null,
  };
}

/** «lun, 26 nov, 9:30 a. m. (hora de Nueva York) · tu hora: lun, 26 nov, 9:30 a. m.» */
export function textoMomento(iso, zona) {
  const m = describirMomento(iso, zona);
  if (!m) return null;
  return m.mercado
    ? `${m.mercado} (hora de ${m.zona}) · tu hora: ${m.local}`
    : `${m.local} (tu hora)`;
}
