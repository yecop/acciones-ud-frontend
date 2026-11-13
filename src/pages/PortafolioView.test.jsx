import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { db } from "../mocks/db.js";
import { server } from "../mocks/server.js";
import { session } from "../auth/session.js";
import { renderApp } from "../test/render.jsx";
import { formatCurrency } from "../components/portafolio/portafolioUtils.js";

function abrir({ nuevo = false, vista = "TABLA" } = {}) {
  const u = db.usuarios.find((u) => u.correo === (nuevo ? "nuevo@correo.com" : "laura@correo.com"));
  u.preferencias.visualizacion.portafolio = vista;
  session.setTokens(db.emitirTokens(u.id));
  session.setUsuario({ id: u.id, nombre: u.nombre, rol: "INV" });
  return renderApp("/portafolio");
}

it("carga el saldo y posiciones del mock usando la sesión, con ganancias y pérdidas", async () => {
  abrir();
  const tabla = await screen.findByRole("table");
  expect(screen.getByText(formatCurrency("4250.00"), { normalizer: (t) => t })).toBeInTheDocument();
  expect(screen.getByText(formatCurrency("351.20"), { normalizer: (t) => t })).toBeInTheDocument();
  expect(within(tabla).getAllByRole("row")).toHaveLength(6);
  expect(within(tabla).getByRole("row", { name: /MSFT/ })).toHaveTextContent(/-/);
  expect(within(tabla).getByRole("row", { name: /AAPL/ })).toHaveTextContent(/\+/);
});

it.each(["TABLA", "TARJETAS"])(
  "usuario nuevo: estado vacío sin filas, NaN ni posiciones ajenas (%s)",
  async (vista) => {
    abrir({ nuevo: true, vista });
    await screen.findByText("Aún no tienes posiciones");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument();
    expect(screen.getByText("0 posiciones")).toBeInTheDocument();
    expect(screen.getByText("0.00 %")).toBeInTheDocument();
    expect(
      screen.getAllByText(formatCurrency("0.00"), { normalizer: (t) => t }).length
    ).toBeGreaterThan(2);
    expect(document.body).not.toHaveTextContent("NaN");
  }
);

it("respeta la vista de tarjetas y recupera la preferencia al volver a cargar", async () => {
  const view = abrir({ vista: "TARJETAS" });
  const tarjeta = await screen.findByRole("article", { name: "Posición AAPL" });
  expect(within(tarjeta).getByText("Ganancia / Pérdida")).toBeInTheDocument();
  expect(within(tarjeta).getByText("Rendimiento")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  view.unmount();
  renderApp("/portafolio");
  expect(await screen.findByRole("article", { name: "Posición AAPL" })).toBeInTheDocument();
});

it("cambiar la preferencia en Perfil cambia la vista del portafolio", async () => {
  const usuario = userEvent.setup();
  abrir();
  await screen.findByRole("table");
  await usuario.click(screen.getByRole("link", { name: "Cambiar en Perfil" }));
  await screen.findByLabelText("Vista del portafolio");
  await usuario.selectOptions(screen.getByLabelText("Vista del portafolio"), "TARJETAS");
  await usuario.click(screen.getByRole("button", { name: "Guardar preferencias" }));
  await screen.findByText("Tus preferencias se guardaron.");
  await usuario.click(screen.getAllByRole("button", { name: "Portafolio y órdenes" })[0]);
  expect(await screen.findByRole("article", { name: "Posición AAPL" })).toBeInTheDocument();
});

it("un fallo de API muestra error, no un portafolio vacío, y permite reintentar", async () => {
  server.use(
    http.get("*/api/v1/portafolio/posiciones", () =>
      HttpResponse.json({ codigo: "ERROR_INTERNO" }, { status: 500 })
    )
  );
  abrir();
  expect(await screen.findByRole("alert")).toHaveTextContent(/error inesperado/);
  expect(screen.queryByText("Aún no tienes posiciones")).not.toBeInTheDocument();
  server.resetHandlers();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByRole("table")).toBeInTheDocument();
});

it("si no puede cargar preferencias informa el error en lugar de ignorar la vista guardada", async () => {
  server.use(http.get("*/api/v1/perfil/preferencias", () => HttpResponse.error()));
  abrir();
  expect(await screen.findByRole("alert")).toHaveTextContent(/conectarnos al servidor/);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("actualiza la preferencia desde la API al pulsar Actualizar", async () => {
  abrir();
  await screen.findByRole("table");
  db.usuarios[0].preferencias.visualizacion.portafolio = "TARJETAS";
  await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await waitFor(() =>
    expect(screen.getByRole("article", { name: "Posición AAPL" })).toBeInTheDocument()
  );
});
