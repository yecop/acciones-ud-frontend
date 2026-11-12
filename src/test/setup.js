import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "../mocks/server.js";
import { db } from "../mocks/db.js";
import { session } from "../auth/session.js";

// Servidor mock de la API para todas las pruebas. Las pruebas que no hacen peticiones
// reales (p. ej. las que usan vi.mock) no se ven afectadas.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

afterEach(() => {
  server.resetHandlers();
  db.reiniciar();
  session.clear();
});

afterAll(() => server.close());
