import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { vi } from "vitest";
import { renderApp } from "../test/render.jsx";
import { db } from "../mocks/db.js";
import { server } from "../mocks/server.js";
import { session } from "../auth/session.js";

function sesion(rol = "INV") {
  const u = db.usuarios[rol === "INV" ? 0 : 1];
  session.setTokens(db.emitirTokens(u.id));
  session.setUsuario({ id: u.id, nombre: u.nombre, rol });
}

async function abrir() {
  sesion();
  const vista = renderApp("/perfil");
  await screen.findByLabelText("Nombre completo");
  return vista;
}

it("carga perfil y preferencias reales del mock, con trailing stop deshabilitado", async () => {
  await abrir();
  expect(screen.getByLabelText("Nombre completo")).toHaveValue("Laura");
  expect(
    screen.getByLabelText("Correo electrónico", { selector: 'input[type="email"]' })
  ).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Límite diario (USD)")).toHaveValue("10000.00");
  expect(screen.getByRole("option", { name: /trailing stop/i })).toBeDisabled();
  expect(screen.getByLabelText("Umbral de orden grande (USD)")).toBeDisabled();
});

it("guarda datos básicos, actualiza la sesión y los recupera al montar otra vez", async () => {
  const usuario = userEvent.setup();
  const vista = await abrir();
  await usuario.clear(screen.getByLabelText("Nombre completo"));
  await usuario.type(screen.getByLabelText("Nombre completo"), "Laura Pérez");
  await usuario.clear(screen.getByLabelText("Celular"));
  await usuario.type(screen.getByLabelText("Celular"), "+57 311 123 4567");
  await usuario.click(screen.getByRole("button", { name: "Guardar datos básicos" }));
  await screen.findByText("Tus datos básicos se guardaron.");
  expect(session.getUsuario().nombre).toBe("Laura Pérez");
  expect(db.usuarios[0].celular).toBe("+573111234567");
  vista.unmount();
  renderApp("/perfil");
  expect(await screen.findByLabelText("Nombre completo")).toHaveValue("Laura Pérez");
});

it("guarda todos los grupos, conserva preferencias desconocidas y recupera selecciones", async () => {
  db.usuarios[0].preferencias.operaciones.futura = "conservar";
  const usuario = userEvent.setup();
  const vista = await abrir();
  await usuario.click(screen.getByLabelText("SMS", { exact: true }));
  await usuario.click(screen.getByLabelText("Recibir reporte mensual por correo"));
  await usuario.selectOptions(screen.getByLabelText("Vista del portafolio"), "TARJETAS");
  await usuario.selectOptions(screen.getByLabelText("Tema de color"), "bosque");
  await usuario.selectOptions(screen.getByLabelText("Tipo de orden por defecto"), "LIMIT");
  await usuario.clear(screen.getByLabelText("Límite diario (USD)"));
  await usuario.type(screen.getByLabelText("Límite diario (USD)"), "2500.50");
  await usuario.click(screen.getByLabelText("Solicitar doble autorización para órdenes grandes"));
  await usuario.clear(screen.getByLabelText("Umbral de orden grande (USD)"));
  await usuario.type(screen.getByLabelText("Umbral de orden grande (USD)"), "500.25");
  await usuario.click(screen.getByRole("button", { name: "Guardar preferencias" }));
  await screen.findByText("Tus preferencias se guardaron.");
  expect(db.usuarios[0].preferencias).toMatchObject({
    notificaciones: { canales: ["EMAIL", "SMS"], reporteMensual: true },
    visualizacion: { tema: "bosque", portafolio: "TARJETAS" },
    operaciones: {
      tipoOrdenPorDefecto: "LIMIT",
      limiteDiario: "2500.50",
      dobleAutorizacion: true,
      umbralOrdenGrande: "500.25",
      futura: "conservar",
    },
  });
  vista.unmount();
  renderApp("/perfil");
  await screen.findByLabelText("Nombre completo");
  expect(screen.getByLabelText("Tipo de orden por defecto")).toHaveValue("LIMIT");
  expect(screen.getByLabelText("Límite diario (USD)")).toHaveValue("2500.50");
  expect(screen.getByLabelText("Recibir reporte mensual por correo")).toBeChecked();
  expect(screen.getByLabelText("Solicitar doble autorización para órdenes grandes")).toBeChecked();
});

it("valida campos locales sin enviar, enfoca el error y conserva entradas", async () => {
  const solicitud = vi.fn(() => HttpResponse.json({}));
  server.use(http.put("*/api/v1/perfil/preferencias", solicitud));
  const usuario = userEvent.setup();
  await abrir();
  await usuario.click(
    screen.getByLabelText("Correo electrónico", { selector: 'input[type="checkbox"]' })
  );
  await usuario.clear(screen.getByLabelText("Límite diario (USD)"));
  await usuario.type(screen.getByLabelText("Límite diario (USD)"), "-50");
  await usuario.click(screen.getByLabelText("Solicitar doble autorización para órdenes grandes"));
  await usuario.clear(screen.getByLabelText("Umbral de orden grande (USD)"));
  await usuario.click(screen.getByRole("button", { name: "Guardar preferencias" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/al menos un canal/);
  await waitFor(() =>
    expect(
      screen.getByLabelText("Correo electrónico", { selector: 'input[type="checkbox"]' })
    ).toHaveFocus()
  );
  expect(screen.getByLabelText("Límite diario (USD)")).toHaveAccessibleDescription(
    /mayor que cero/
  );
  expect(screen.getByLabelText("Umbral de orden grande (USD)")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  expect(solicitud).not.toHaveBeenCalled();
});

it("muestra errores anidados de API junto al campo y campos desconocidos en el resumen", async () => {
  server.use(
    http.put("*/api/v1/perfil/preferencias", () =>
      HttpResponse.json(
        {
          codigo: "VALIDACION_FALLIDA",
          detalles: [
            {
              campo: "operaciones.limiteDiario",
              problema: "Supera el máximo permitido para tu cuenta",
            },
            { campo: "campoNuevo", problema: "Se requiere una opción adicional" },
          ],
        },
        { status: 400 }
      )
    )
  );
  const usuario = userEvent.setup();
  await abrir();
  await usuario.click(screen.getByRole("button", { name: "Guardar preferencias" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/opción adicional/);
  expect(screen.getByLabelText("Límite diario (USD)")).toHaveAccessibleDescription(
    "Supera el máximo permitido para tu cuenta"
  );
  await waitFor(() => expect(screen.getByLabelText("Límite diario (USD)")).toHaveFocus());
});

it("un fallo al guardar preferencias no borra cambios ni afecta al guardado del perfil", async () => {
  server.use(http.put("*/api/v1/perfil/preferencias", () => HttpResponse.error()));
  const usuario = userEvent.setup();
  await abrir();
  await usuario.selectOptions(screen.getByLabelText("Tipo de orden por defecto"), "STOP_LOSS");
  await usuario.click(screen.getByRole("button", { name: "Guardar preferencias" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/conectarnos al servidor/);
  expect(screen.getByLabelText("Tipo de orden por defecto")).toHaveValue("STOP_LOSS");
  await usuario.click(screen.getByRole("button", { name: "Guardar datos básicos" }));
  expect(await screen.findByText("Tus datos básicos se guardaron.")).toBeInTheDocument();
});

it("un fallo de carga impide guardar la sección fallida y ofrece reintentar", async () => {
  server.use(
    http.get("*/api/v1/perfil/preferencias", () =>
      HttpResponse.json({ codigo: "ERROR_INTERNO" }, { status: 500 })
    )
  );
  await abrir();
  expect(screen.queryByRole("button", { name: "Guardar preferencias" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Guardar datos básicos" })).toBeEnabled();
  server.resetHandlers();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar carga" }));
  expect(await screen.findByRole("button", { name: "Guardar preferencias" })).toBeEnabled();
});

it("el comisionista puede editar datos básicos sin pedir preferencias de inversionista", async () => {
  const obtener = vi.fn();
  server.events.on("request:start", ({ request }) => {
    if (request.url.endsWith("/perfil/preferencias")) obtener();
  });
  sesion("COM");
  renderApp("/perfil");
  expect(await screen.findByLabelText("Nombre completo")).toHaveValue("Carlos");
  expect(screen.queryByRole("form", { name: "Preferencias" })).not.toBeInTheDocument();
  expect(obtener).not.toHaveBeenCalled();
  server.events.removeAllListeners("request:start");
});

it("bloquea envíos simultáneos mientras guarda", async () => {
  const solicitud = vi.fn(async ({ request }) => {
    const p = await request.json();
    await delay(200);
    return HttpResponse.json(p);
  });
  server.use(http.put("*/api/v1/perfil/preferencias", solicitud));
  const usuario = userEvent.setup();
  await abrir();
  await usuario.dblClick(screen.getByRole("button", { name: "Guardar preferencias" }));
  expect(screen.getByRole("button", { name: "Guardando preferencias…" })).toBeDisabled();
  await screen.findByText("Tus preferencias se guardaron.");
  expect(solicitud).toHaveBeenCalledTimes(1);
  expect(
    within(screen.getByRole("form", { name: "Preferencias" })).getByRole("button")
  ).toBeEnabled();
});
