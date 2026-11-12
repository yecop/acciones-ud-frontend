import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { session } from "../auth/session.js";
import { CODIGO_MFA_VALIDO, CONTRASENA_DEMO } from "../mocks/db.js";
import AppRoutes from "../routes/AppRoutes.jsx";

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

function RutaActual() {
  return <span data-testid="ruta">{useLocation().pathname}</span>;
}

/** Renderiza la app completa (router + sesión) en la ruta dada. */
export function renderApp(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]} future={FUTURE}>
      <AuthProvider>
        <AppRoutes />
        <RutaActual />
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Deja una sesión ya iniciada, como si la persona hubiera pasado por login + MFA. */
export function conSesion(rol, nombre = "Prueba") {
  session.setTokens({ accessToken: "x", refreshToken: "y" });
  session.setUsuario({ id: "1", nombre, rol });
}

/** Completa el formulario de credenciales y pulsa «Continuar». */
export async function enviarCredenciales(
  usuario,
  screen,
  { correo = "carlos@correo.com", contrasena = CONTRASENA_DEMO } = {}
) {
  await usuario.type(screen.getByLabelText(/correo electrónico/i), correo);
  await usuario.type(screen.getByLabelText(/^contraseña$/i), contrasena);
  await usuario.click(screen.getByRole("button", { name: /continuar/i }));
}

/** Escribe un código en el campo OTP (la primera celda se enfoca sola) y pulsa verificar. */
export async function enviarCodigo(usuario, screen, codigo = CODIGO_MFA_VALIDO) {
  await usuario.click(screen.getByLabelText("Dígito 1"));
  await usuario.keyboard(codigo);
  await usuario.click(screen.getByRole("button", { name: /verificar e ingresar/i }));
}
