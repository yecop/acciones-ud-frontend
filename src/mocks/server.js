import { setupServer } from "msw/node";
import { handlers } from "./handlers.js";

/** Servidor mock para pruebas (Node). Se levanta en `src/test/setup.js`. */
export const server = setupServer(...handlers);
