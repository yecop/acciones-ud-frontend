# SCRUM-36 · Mock de premium, fondos, administración y reportes

`npm start` activa MSW y sirve los módulos a través del cliente HTTP común. `npm run dev` usa el backend configurado con `VITE_API_BASE_URL` o con el proxy de Vite. Las pantallas de SCRUM-66 a SCRUM-70 pueden consumir los mismos clientes en ambos modos. Ejecuta `npm test -- src/mocks/scrum36.test.js` para recorrer los escenarios mediante los clientes.

## Fondos · SCRUM-46

`fondosApi.js` reutiliza la forma de [CuentaController y sus DTO en el PR #18](https://github.com/yecop/acciones-ud-backend/pull/18). Los endpoints que usan la pantalla de depósitos y retiros simulados son los siguientes.

| Método y ruta bajo `/api/v1` | Datos                                                    | Resultado                                                 |
| ---------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| POST /cuenta/depositos       | `{monto}` e `Idempotency-Key`                            | `{movimiento, saldo}`, 201                                |
| POST /cuenta/retiros         | `{monto}` e `Idempotency-Key`                            | `{movimiento, saldo}`, 201                                |
| GET /cuenta/movimientos      | `tipo`, `pagina`, `tamano`, `inversionistaId` opcionales | Página con `contenido`, `totalElementos` y `totalPaginas` |

Usa `obtenerSaldo` de `portafolioApi.js` para leer el mismo saldo que actualizan estas operaciones. Envía una clave por intención de depósito o retiro con la opción `{idempotencyKey}`. El reintento con datos iguales conserva el movimiento y con otros datos responde 409. Un retiro superior al disponible responde 422, aparece como fallido y conserva el saldo anterior. `nuevo@correo.com` permite probar una cuenta con historial vacío.

La recarga con pasarela de SCRUM-46 tiene su propio endpoint. El mock cubre depósito y retiro simulados, y el pago de suscripción descrito abajo.

En SCRUM-67, abre **Portafolio y órdenes → Depósitos y retiros** desde una cuenta inversionista. Con `nuevo@correo.com` puedes depositar USD 50, comprobar el historial y probar un retiro mayor al saldo antes de confirmar uno válido. La pantalla comparte el cliente entre el mock y el backend. Para probar la integración en un entorno con SCRUM-46, inicia el frontend con `npm run dev` y configura el origen de la API.

## Propuestas de contrato pendientes de acordar

| Cliente         | Rutas bajo `/api/v1`                                                                                                          | Escenarios                                                                                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `premiumApi.js` | GET /suscripciones/planes, GET/DELETE /suscripciones/actual, POST /suscripciones/checkout                                     | Planes de prueba y cuenta básica de inicio. Enviar `{planId, escenarioPrueba: "APROBADO"}` activa la suscripción. Con `"RECHAZADO"` devuelve 402. La simulación nunca solicita datos de tarjeta.                         |
| `premiumApi.js` | GET/POST /watchlist y /alertas, DELETE/PATCH /watchlist/:id y /alertas/:id                                                    | Listas inicialmente vacías. POST recibe `{ticker}` y para alertas también `condicion` (`SUBE_A` o `BAJA_A`) y `precioObjetivo`. DELETE deja el elemento inactivo y PATCH lo reactiva. Una cuenta sin Premium recibe 403. |
| `gestionApi.js` | GET /admin/mercados, PATCH /admin/mercados/:codigo, GET /admin/usuarios, PATCH /admin/usuarios/:id, GET/PUT /admin/parametros | Con rol Administrador se consultan y editan horarios, feriados, roles, certificaciones y reparto de comisión. Horarios inválidos o un reparto distinto de 100 % devuelven 400.                                           |
| `gestionApi.js` | GET /auditoria/eventos, GET /auditoria/ordenes/:id/historial, GET/POST /restricciones, PATCH /restricciones/:id               | Legal consulta eventos y la trazabilidad de órdenes demo. Legal y Administrador pueden crear y levantar restricciones con motivo y referencia de caso. Los cambios de gestión generan eventos con `traceId`.             |
| `gestionApi.js` | GET /reportes y /reportes/dashboard                                                                                           | Reportes de ejemplo por rol. El dashboard empresarial requiere Junta Directiva. Un periodo anterior a la fecha de los datos demo devuelve una lista vacía. Fechas inválidas devuelven 400.                               |

Las suscripciones y listas de seguimiento demo se guardan por cuenta en la sesión de la pestaña. Fondos, administración y auditoría mantienen sus cambios en memoria. Los registros de roles y restricciones sirven para probar formularios. Su aplicación a la autenticación y a la ejecución de órdenes corresponde a los servicios que implementarán esas reglas. La confirmación de rutas y campos pendientes queda para SCRUM-42, 47 a 50, 54 y 55.

## Pantalla Premium · SCRUM-66

Inicia sesión como inversionista en modo mock y abre **Premium** en la navegación o entra a `/#/premium`. Elige un plan y una de las tarjetas de prueba para simular aprobación o rechazo. Después de activar la suscripción, prueba agregar `AAPL` a la watchlist y crear una alerta con un precio objetivo positivo. Puedes eliminar y reactivar ambos registros. Al cancelar la suscripción, el acceso queda restringido y puedes elegir un plan de nuevo.

En modo API, el checkout espera que el servidor devuelva `urlPago` de Stripe Checkout y consulta el estado de la suscripción al regresar. Esta forma de integración queda pendiente de confirmar y probar con SCRUM-54 y SCRUM-55. La simulación utiliza tarjetas predefinidas y omite la captura de datos de tarjeta.
