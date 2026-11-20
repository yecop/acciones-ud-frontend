import { session } from "../auth/session.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO } from "../mocks/db.js";

const API = "http://localhost:3000/api/v1";

const post = (ruta, cuerpo) =>
  fetch(`${API}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  }).then((r) => r.json());

/** Inicia sesión contra el servidor mock (login + MFA) y deja los tokens en la sesión. */
export async function iniciarSesionMock(correo = "laura@correo.com") {
  const reto = await post("/auth/login", { correo, contrasena: CONTRASENA_DEMO });
  const tokens = await post("/auth/mfa/verificar", {
    mfaToken: reto.mfaToken,
    codigo: CODIGO_MFA_VALIDO,
  });
  session.setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
}
