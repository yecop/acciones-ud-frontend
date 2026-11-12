import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { conSesion, renderApp } from "../test/render.jsx";

describe("rutas protegidas", () => {
  it("sin sesión, una ruta protegida lleva al ingreso", () => {
    renderApp("/comisionista");

    expect(screen.getByRole("heading", { name: /ingresa a tu cuenta/i })).toBeInTheDocument();
  });

  it("un rol sin permiso ve la pantalla de acceso denegado", () => {
    conSesion("INV");
    renderApp("/admin");

    expect(screen.getByRole("heading", { name: /no tienes acceso/i })).toBeInTheDocument();
  });

  it("un rol con permiso ve la pantalla dentro del marco con su menú", () => {
    conSesion("COM", "Carlos");
    renderApp("/comisionista");

    expect(screen.getByRole("heading", { name: "Mis clientes" })).toBeInTheDocument();
    // El menú del comisionista no incluye secciones de otros roles.
    expect(screen.queryByRole("button", { name: "Administración" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Reportes" }).length).toBeGreaterThan(0);
  });

  it("cada rol aterriza en su pantalla inicial", () => {
    conSesion("ADM", "Admin");
    renderApp("/");

    expect(screen.getByRole("heading", { name: "Administración" })).toBeInTheDocument();
  });

  it("una ruta inexistente muestra 404", () => {
    renderApp("/no-existe");

    expect(screen.getByRole("heading", { name: /página no encontrada/i })).toBeInTheDocument();
  });

  it("sin reto de verificación, /verificacion lleva al ingreso", () => {
    renderApp("/verificacion");

    expect(screen.getByRole("heading", { name: /ingresa a tu cuenta/i })).toBeInTheDocument();
  });
});
