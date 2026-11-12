import { API_URL } from "../config/env.js";
import { session } from "../auth/session.js";
import { createHttpClient, nuevoUuid } from "./httpClient.js";

/**
 * Renueva el access token con el refresh token (`POST /auth/refresh`, endpoint PUB).
 * Usa `fetch` directo (sin pasar por el cliente) para no reentrar en los interceptores.
 * Lanza si el refresh token falta o el backend lo rechaza.
 */
async function renovarTokens() {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) throw new Error("Sin refresh token");

  const respuesta = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Trace-Id": nuevoUuid(),
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (!respuesta.ok) throw new Error(`Refresh rechazado (${respuesta.status})`);

  const datos = await respuesta.json();
  session.setTokens({ accessToken: datos.accessToken, refreshToken: datos.refreshToken });
}

/** Cliente HTTP único de la aplicación. Los módulos `*Api.js` deben usar este objeto. */
export const http = createHttpClient({
  baseUrl: API_URL,
  getAccessToken: session.getAccessToken,
  getRefreshToken: session.getRefreshToken,
  refresh: renovarTokens,
  onSessionExpired: () => session.expirar(),
});
