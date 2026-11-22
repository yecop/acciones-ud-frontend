import { http } from "./http.js";

/**
 * Resumen del panel del inversionista (contrato §4.5). Solo rol INVERSIONISTA.
 */

/**
 * GET /dashboard
 * @param {{signal?:AbortSignal}} [opciones]
 * @returns {Promise<{
 *   accionesInteres:Array<{ticker:string,nombre:string,mercado:string,precio:string,variacionPorcentaje:string}>,
 *   portafolio:{valorTotal:string,numeroPosiciones:number,gananciaPerdidaDia:string},
 *   alertas:Array<object>
 * }>}
 */
export const obtenerDashboard = (opciones) => http.get("/dashboard", opciones);
