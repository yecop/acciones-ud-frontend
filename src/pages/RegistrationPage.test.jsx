import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { vi } from "vitest";
import { renderApp, enviarCredenciales } from "../test/render.jsx";
import { server } from "../mocks/server.js";
import { db } from "../mocks/db.js";
import { session } from "../auth/session.js";

async function completar(usuario, correo = "nueva@correo.com") {
  await usuario.type(screen.getByLabelText("Nombre completo"), "  Ana Pérez  ");
  await usuario.type(screen.getByLabelText("Correo electrónico"), correo);
  await usuario.type(screen.getByLabelText("Celular"), "+57 300 123 4567");
  await usuario.type(screen.getByLabelText("Contraseña"), "Segura123");
  await usuario.type(screen.getByLabelText("Confirmar contraseña"), "Segura123");
  await usuario.click(screen.getByRole("radio", { name: "Principiante" }));
  await usuario.click(screen.getByRole("radio", { name: "Moderado" }));
  await usuario.click(screen.getByRole("checkbox", { name: "NYSE" }));
  await usuario.click(screen.getByRole("checkbox", { name: "Tecnología" }));
  await usuario.click(screen.getByRole("checkbox", { name: "Ahorrar a largo plazo" }));
}

const crear = () => screen.getByRole("button", { name: "Crear cuenta y continuar" });

it("valida campos y grupos sin enviar, anuncia el resumen y enfoca el primer error", async () => {
  const solicitud = vi.fn(() => HttpResponse.json({}, { status: 201 }));
  server.use(http.post("*/api/v1/auth/registro", solicitud));
  const usuario = userEvent.setup();
  renderApp("/registro");
  await usuario.click(crear());
  expect(screen.getByRole("alert")).toHaveTextContent(/mercado/);
  await waitFor(() => expect(screen.getByLabelText("Nombre completo")).toHaveFocus());
  expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("group", { name: "Tus objetivos" })).toHaveAccessibleDescription(
    /al menos un objetivo/
  );
  expect(solicitud).not.toHaveBeenCalled();
});

it("rechaza confirmación distinta y celular inválido conservando los datos", async () => {
  const usuario = userEvent.setup();
  renderApp("/registro");
  await completar(usuario);
  await usuario.clear(screen.getByLabelText("Confirmar contraseña"));
  await usuario.type(screen.getByLabelText("Confirmar contraseña"), "diferente");
  await usuario.clear(screen.getByLabelText("Celular"));
  await usuario.type(screen.getByLabelText("Celular"), "123");
  await usuario.click(crear());
  expect(screen.getByRole("alert")).toHaveTextContent(/contraseñas deben coincidir/);
  expect(screen.getByLabelText("Celular")).toHaveAccessibleDescription(/celular válido/);
  expect(screen.getByLabelText("Correo electrónico")).toHaveValue("nueva@correo.com");
  expect(db.usuarios).toHaveLength(6);
});

it("registra contra MSW, guarda el perfil y muestra pendiente de alta sin iniciar sesión", async () => {
  const usuario = userEvent.setup();
  renderApp("/registro");
  await completar(usuario, "NUEVA@correo.com");
  await usuario.click(crear());
  const titulo = await screen.findByRole("heading", { name: "Tu cuenta está pendiente de alta" });
  await waitFor(() => expect(titulo).toHaveFocus());
  expect(db.usuarios.at(-1)).toMatchObject({
    correo: "nueva@correo.com",
    nombre: "Ana Pérez",
    celular: "+573001234567",
    nivelExperiencia: "PRINCIPIANTE",
    perfilRiesgo: "MODERADO",
    objetivos: ["AHORRO"],
    intereses: { mercados: ["NYSE"], sectores: ["TECNOLOGIA"] },
    estado: "PENDIENTE_ALTA",
  });
  expect(session.getAccessToken()).toBeFalsy();
  await usuario.click(screen.getByRole("link", { name: "Ir al ingreso" }));
  await enviarCredenciales(usuario, screen, {
    correo: "nueva@correo.com",
    contrasena: "Segura123",
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(/pendiente de alta/);
  expect(session.getReto()).toBeNull();
});

it("correo duplicado se asocia al correo y permite corregir y reintentar", async () => {
  const usuario = userEvent.setup();
  renderApp("/registro");
  await completar(usuario, "LAURA@correo.com");
  await usuario.click(crear());
  await screen.findByRole("alert");
  await waitFor(() => expect(screen.getByLabelText("Correo electrónico")).toHaveFocus());
  expect(screen.getByLabelText("Correo electrónico")).toHaveAccessibleDescription(
    /ya existe una cuenta/i
  );
  await usuario.clear(screen.getByLabelText("Correo electrónico"));
  await usuario.type(screen.getByLabelText("Correo electrónico"), "otra@correo.com");
  await usuario.click(crear());
  expect(await screen.findByRole("heading", { name: /pendiente de alta/ })).toBeInTheDocument();
});

it("muestra VALIDACION_FALLIDA del servidor por campo, incluidos campos desconocidos en el resumen", async () => {
  server.use(
    http.post("*/api/v1/auth/registro", () =>
      HttpResponse.json(
        {
          codigo: "VALIDACION_FALLIDA",
          detalles: [
            { campo: "celular", problema: "Este celular ya está en uso" },
            { campo: "intereses.mercados", problema: "Este mercado no está disponible" },
            { campo: "documento", problema: "Se requiere documento" },
          ],
        },
        { status: 400 }
      )
    )
  );
  const usuario = userEvent.setup();
  renderApp("/registro");
  await completar(usuario);
  await usuario.click(crear());
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Celular")).toHaveAccessibleDescription(
    "Este celular ya está en uso"
  );
  expect(screen.getByRole("group", { name: "Mercados de interés" })).toHaveAccessibleDescription(
    "Este mercado no está disponible"
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Se requiere documento");
  expect(screen.getByLabelText("Contraseña")).toHaveValue("Segura123");
});

it("deshabilita el formulario durante el envío y no duplica solicitudes", async () => {
  const solicitud = vi.fn(async ({ request }) => {
    const body = await request.json();
    expect(body).not.toHaveProperty("confirmacion");
    await delay(150);
    return HttpResponse.json({ estado: "ACTIVO" }, { status: 201 });
  });
  server.use(http.post("*/api/v1/auth/registro", solicitud));
  const usuario = userEvent.setup();
  renderApp("/registro");
  await completar(usuario);
  await usuario.dblClick(crear());
  expect(screen.getByRole("button", { name: /creando cuenta/i })).toBeDisabled();
  expect(
    await screen.findByRole("heading", { name: "Tu registro se completó" })
  ).toBeInTheDocument();
  expect(solicitud).toHaveBeenCalledTimes(1);
});

it("un fallo de red conserva los valores y permite reintentar", async () => {
  server.use(http.post("*/api/v1/auth/registro", () => HttpResponse.error()));
  const usuario = userEvent.setup();
  renderApp("/registro");
  await completar(usuario);
  await usuario.click(crear());
  expect(await screen.findByRole("alert")).toHaveTextContent(/conectarnos al servidor/);
  expect(screen.getByLabelText("Nombre completo")).toHaveValue("  Ana Pérez  ");
  expect(crear()).toBeEnabled();
});
