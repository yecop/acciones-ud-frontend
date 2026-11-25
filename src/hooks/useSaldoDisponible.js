import { useCallback, useEffect, useState } from "react";
import { obtenerSaldo } from "../api/portafolioApi.js";

/** Saldo de la cuenta (`GET /cuenta/saldo`); `refrescar()` lo vuelve a pedir (p. ej. tras una orden). */
export function useSaldoDisponible() {
  const [saldo, setSaldo] = useState(null);
  const [error, setError] = useState(null);

  const refrescar = useCallback(async () => {
    try {
      setSaldo(await obtenerSaldo());
      setError(null);
    } catch (e) {
      setError(e?.mensajeUsuario ?? "No pudimos leer tu saldo.");
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  return { saldo, error, refrescar };
}
