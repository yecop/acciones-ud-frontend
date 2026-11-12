import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { session } from "../auth/session.js";
import { CONTRASENA_DEMO } from "../mocks/db.js";
import AppRoutes from "./AppRoutes.jsx";

function renderizar(ruta) {
  return render(
    <MemoryRouter
      initialEntries={[ruta]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

/** Deja una sesión ya iniciada, como si la persona hubiera pasado por login + MFA. */
function conSesion(rol, nombre = "Prueba") {
  session.setTokens({ accessToken: "x", refreshToken: "y" });
  session.setUsuario({ id: "1", nombre, rol });
}

describe("rutas protegidas", () => {
  it("sin sesión, una ruta protegida lleva al ingreso", () => {
    renderizar("/comisionista");

    expect(screen.getByRole("heading", { name: /ingresa a acciones ud/i })).toBeInTheDocument();
  });

  it("un rol sin permiso ve la pantalla de acceso denegado", () => {
    conSesion("INV");
    renderizar("/admin");

    expect(screen.getByRole("heading", { name: /no tienes acceso/i })).toBeInTheDocument();
  });

  it("un rol con permiso ve la pantalla dentro del marco con su menú", () => {
    conSesion("COM", "Carlos");
    renderizar("/comisionista");

    expect(screen.getByRole("heading", { name: "Mis clientes" })).toBeInTheDocument();
    // El menú del comisionista no incluye secciones de otros roles.
    expect(screen.queryByRole("button", { name: "Administración" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reportes" }).length).toBeGreaterThan(0);
  });

  it("cada rol aterriza en su pantalla inicial", () => {
    conSesion("ADM", "Admin");
    renderizar("/");

    expect(screen.getByRole("heading", { name: "Administración" })).toBeInTheDocument();
  });

  it("una ruta inexistente muestra 404", () => {
    renderizar("/no-existe");

    expect(screen.getByRole("heading", { name: /página no encontrada/i })).toBeInTheDocument();
  });
});

describe("flujo de ingreso (login → MFA → pantalla del rol)", () => {
  it("abre sesión con el mock y vuelve a la pantalla que se quería abrir", async () => {
    const usuario = userEvent.setup();
    renderizar("/comisionista");

    await usuario.type(screen.getByLabelText(/correo electrónico/i), "carlos@correo.com");
    await usuario.type(screen.getByLabelText(/contraseña/i), CONTRASENA_DEMO);
    await usuario.click(screen.getByRole("button", { name: /continuar/i }));

    await screen.findByRole("heading", { name: /ingresa tu código/i });
    await usuario.click(screen.getByLabelText("Dígito 1"));
    await usuario.keyboard("482913");
    await usuario.click(screen.getByRole("button", { name: /verificar e ingresar/i }));

    expect(await screen.findByRole("heading", { name: "Mis clientes" })).toBeInTheDocument();
    expect(session.getUsuario()).toMatchObject({ nombre: "Carlos", rol: "COM" });
    expect(session.getAccessToken()).toBeTruthy();
  });

  it("muestra el error traducido si las credenciales son incorrectas", async () => {
    const usuario = userEvent.setup();
    renderizar("/ingreso");

    await usuario.type(screen.getByLabelText(/correo electrónico/i), "carlos@correo.com");
    await usuario.type(screen.getByLabelText(/contraseña/i), "incorrecta");
    await usuario.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
  });

  it("muestra el error traducido si el código MFA es incorrecto", async () => {
    const usuario = userEvent.setup();
    renderizar("/ingreso");

    await usuario.type(screen.getByLabelText(/correo electrónico/i), "carlos@correo.com");
    await usuario.type(screen.getByLabelText(/contraseña/i), CONTRASENA_DEMO);
    await usuario.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByRole("heading", { name: /ingresa tu código/i });

    await usuario.click(screen.getByLabelText("Dígito 1"));
    await usuario.keyboard("000000");
    await usuario.click(screen.getByRole("button", { name: /verificar e ingresar/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "El código de verificación es incorrecto."
      )
    );
  });

  it("al salir se limpia la sesión y vuelve al ingreso", async () => {
    const usuario = userEvent.setup();
    conSesion("COM", "Carlos");
    renderizar("/comisionista");

    await usuario.click(screen.getByRole("button", { name: /salir/i }));

    expect(
      await screen.findByRole("heading", { name: /ingresa a acciones ud/i })
    ).toBeInTheDocument();
    expect(session.getUsuario()).toBeNull();
  });
});
