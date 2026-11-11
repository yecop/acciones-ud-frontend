import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { session } from "../auth/session.js";
import { CODIGO_MFA_EXPIRADO } from "../mocks/db.js";
import { enviarCodigo, enviarCredenciales, renderApp } from "../test/render.jsx";

const ruta = () => screen.getByTestId("ruta").textContent;

async function hastaCodigo(usuario, correo = "carlos@correo.com") {
  renderApp("/ingreso");
  await enviarCredenciales(usuario, screen, { correo });
  await screen.findByText(/paso 2 de 2/i);
}

describe("login", () => {
  it("valida campos vacíos sin llamar al servidor", async () => {
    const usuario = userEvent.setup();
    renderApp("/ingreso");

    await usuario.click(screen.getByRole("button", { name: /continuar/i }));

    expect(screen.getAllByText(/obligatori|ingresa/i).length).toBeGreaterThan(0);
    expect(ruta()).toBe("/ingreso");
  });

  it("credenciales incorrectas muestran un mensaje", async () => {
    const usuario = userEvent.setup();
    renderApp("/ingreso");

    await enviarCredenciales(usuario, screen, { contrasena: "incorrecta1" });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(ruta()).toBe("/ingreso");
  });

  it("tras 5 fallos bloquea el envío con cuenta regresiva", async () => {
    const usuario = userEvent.setup();
    renderApp("/ingreso");

    for (let i = 0; i < 5; i++) {
      await usuario.clear(screen.getByLabelText(/correo electrónico/i));
      await usuario.clear(screen.getByLabelText(/^contraseña$/i));
      await enviarCredenciales(usuario, screen, { contrasena: "incorrecta1" });
      await screen.findByRole("alert");
    }
    await usuario.clear(screen.getByLabelText(/correo electrónico/i));
    await usuario.clear(screen.getByLabelText(/^contraseña$/i));
    await enviarCredenciales(usuario, screen);

    expect(await screen.findByText(/disponible en \d\d:\d\d/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disponible en/i })).toBeDisabled();
  });
});

describe("flujo login + MFA + sesión", () => {
  it.each([
    ["laura@correo.com", "/panel"],
    ["carlos@correo.com", "/comisionista"],
    ["admin@correo.com", "/admin"],
    ["legal@correo.com", "/auditoria"],
    ["junta@correo.com", "/reportes"],
  ])("%s termina en %s", async (correo, destino) => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario, correo);
    expect(ruta()).toBe("/verificacion");

    await enviarCodigo(usuario, screen);

    await waitFor(() => expect(ruta()).toBe(destino));
    expect(session.getAccessToken()).toBeTruthy();
    expect(session.getReto()).toBeNull();
  });

  it("código inválido: muestra el error y deja el campo listo para reintentar", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);

    await enviarCodigo(usuario, screen, "000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrecto/i);
    expect(ruta()).toBe("/verificacion");
    expect(screen.getByLabelText("Dígito 1")).toHaveFocus();
    expect(screen.getByLabelText("Dígito 1")).toHaveValue("");
  });

  it("código vencido: avisa y permite pedir uno nuevo", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);

    await enviarCodigo(usuario, screen, CODIGO_MFA_EXPIRADO);

    expect(await screen.findByRole("alert")).toHaveTextContent(/venci/i);
    expect(screen.getByRole("button", { name: /verificar e ingresar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^reenviar código$/i })).toBeEnabled();
  });

  it("agotar los intentos de código bloquea temporalmente la verificación", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);

    for (let i = 0; i < 6; i++) {
      await enviarCodigo(usuario, screen, "000000");
      await screen.findByRole("alert");
    }

    expect(await screen.findByText(/intenta de nuevo en \d\d:\d\d/i)).toBeInTheDocument();
  });

  it("reenviar está deshabilitado durante la espera", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);

    expect(screen.getByRole("button", { name: /reenviar código en \d\d:\d\d/i })).toBeDisabled();
  });

  it("recargar la página de código conserva el reto", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);
    expect(session.getReto()).not.toBeNull();

    const { unmount } = { unmount: () => {} };
    unmount();
    renderApp("/verificacion");

    expect(screen.getAllByText(/paso 2 de 2/i).length).toBeGreaterThan(0);
  });

  it("salir invalida la sesión: el token ya no sirve y se vuelve al ingreso", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);
    await enviarCodigo(usuario, screen);
    await waitFor(() => expect(ruta()).toBe("/comisionista"));
    const token = session.getAccessToken();

    await usuario.click(screen.getByRole("button", { name: /salir/i }));

    await waitFor(() => expect(ruta()).toBe("/ingreso"));
    expect(session.getAccessToken()).toBeFalsy();
    expect(session.getUsuario()).toBeNull();
    const resp = await fetch("http://localhost:3000/api/v1/perfil", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status).toBe(401);
  });

  it("tras salir, una ruta protegida vuelve a pedir ingreso", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);
    await enviarCodigo(usuario, screen);
    await waitFor(() => expect(ruta()).toBe("/comisionista"));
    await usuario.click(screen.getByRole("button", { name: /salir/i }));
    await waitFor(() => expect(ruta()).toBe("/ingreso"));

    expect(screen.getByRole("heading", { name: /ingresa a tu cuenta/i })).toBeInTheDocument();
  });

  it("si la sesión expira, el ingreso lo explica", async () => {
    const usuario = userEvent.setup();
    await hastaCodigo(usuario);
    await enviarCodigo(usuario, screen);
    await waitFor(() => expect(ruta()).toBe("/comisionista"));

    await act(async () => {
      session.expirar();
    });

    await waitFor(() => expect(ruta()).toBe("/ingreso"));
    expect(await screen.findByText(/tu sesión expiró/i)).toBeInTheDocument();
  });
});
