import { http } from "./http.js";

export const listarMovimientos = (query, opciones) =>
  http.get("/cuenta/movimientos", { ...opciones, query });
export const depositar = (monto, opciones) => http.post("/cuenta/depositos", { monto }, opciones);
export const retirar = (monto, opciones) => http.post("/cuenta/retiros", { monto }, opciones);
