import { http } from "../api/http.js";
export const fetchSaldo = () => http.get("/cuenta/saldo");
export const fetchResumenPortafolio = () => http.get("/portafolio");
export const fetchPosiciones = () => http.get("/portafolio/posiciones");
