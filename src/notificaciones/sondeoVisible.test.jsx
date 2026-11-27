import { act, screen } from "@testing-library/react";
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { session } from "../auth/session.js";
import { server } from "../mocks/server.js";
import { renderApp } from "../test/render.jsx";
import { iniciarSesionMock } from "../test/sesionMock.js";
import { cambiarVisibilidad, restaurarVisibilidad } from "../test/visibilidad.js";

const LAURA = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e01";
const pagina = (totalElementos) => ({
  contenido: [],
  pagina: 0,
  tamano: 1,
  totalElementos,
  totalPaginas: 1,
});

/** Cuenta las consultas a /notificaciones, separando la de la campana (leida=false&tamano=1). */
function contarConsultas() {
  const cuenta = { campana: 0, lista: 0 };
  server.use(
    mswHttp.get("*/api/v1/notificaciones", ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("tamano") === "1") cuenta.campana += 1;
      else cuenta.lista += 1;
      return HttpResponse.json(pagina(2));
    })
  );
  return cuenta;
}

async function esperar() {
  // deja resolver las promesas de red con los temporizadores simulados
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    await new Promise((r) => setTimeout(r, 20));
  });
}

describe("sondeo de notificaciones con la pestaña oculta (SCRUM-63)", () => {
  beforeEach(async () => {
    await iniciarSesionMock("laura@correo.com");
    session.setUsuario({ id: LAURA, nombre: "Prueba", rol: "INV" });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  });
  afterEach(() => {
    restaurarVisibilidad();
    vi.useRealTimers();
    server.resetHandlers();
  });

  it("la campana no consulta cada 30 s en segundo plano y refresca una vez al volver", async () => {
    const cuenta = contarConsultas();
    renderApp("/operar");
    await screen.findByRole("button", { name: /Notificaciones/ });
    await esperar();
    const inicial = cuenta.campana;
    expect(inicial).toBeGreaterThanOrEqual(1);

    act(() => cambiarVisibilidad("hidden"));
    await act(async () => {
      vi.advanceTimersByTime(5 * 30_000);
    });
    await esperar();
    expect(cuenta.campana).toBe(inicial);

    act(() => cambiarVisibilidad("visible"));
    await esperar();
    expect(cuenta.campana).toBe(inicial + 1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await esperar();
    expect(cuenta.campana).toBe(inicial + 2);
  });

  it("la lista tampoco consulta en segundo plano y refresca una vez al volver", async () => {
    const cuenta = contarConsultas();
    renderApp("/notificaciones");
    await screen.findByRole("heading", { name: "Notificaciones" });
    await esperar();
    const inicial = cuenta.lista;
    expect(inicial).toBeGreaterThanOrEqual(1);

    act(() => cambiarVisibilidad("hidden"));
    await act(async () => {
      vi.advanceTimersByTime(5 * 30_000);
    });
    await esperar();
    expect(cuenta.lista).toBe(inicial);

    act(() => cambiarVisibilidad("visible"));
    await esperar();
    expect(cuenta.lista).toBe(inicial + 1);
  });
});
