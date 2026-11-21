# SCRUM-35: mock de trading — órdenes (parte 1)

Este documento separa lo que el mock toma **del contrato acordado** de lo que **se supuso** porque el contrato no lo define. Los supuestos están marcados con ⚠ y deben validarse con backend antes de integrar.

## Endpoints (`src/mocks/ordenes.js`, cliente `src/api/ordenesApi.js`)

| Endpoint                      | Roles    | Origen de la forma                                                                                         |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `POST /ordenes/simulacion`    | INV, COM | Contrato                                                                                                   |
| `POST /ordenes`               | INV      | Contrato (201, 409 `MERCADO_CERRADO` con `datos`). COM con `clienteId` llega en la parte de comisionistas. |
| `GET /ordenes`                | INV      | ⚠ Filtros del contrato; respuesta supuesta                                                                |
| `GET /ordenes/{id}`           | INV      | ⚠ Supuesta                                                                                                |
| `GET /ordenes/{id}/historial` | INV      | ⚠ Contenido del contrato (estado, actor, fecha, motivo); envoltorio supuesto                              |
| `POST /ordenes/{id}/cancelar` | INV      | Contrato (200, 409 `ORDEN_NO_CANCELABLE`)                                                                  |

## Supuestos ⚠

1. **Listas paginadas** con la forma de `GET /acciones`: `{ contenido, pagina, tamano, totalElementos, totalPaginas }`, orden por `creadaEn` descendente.
2. **Orden** (detalle e ítems de lista): `id, ticker, lado, tipo, cantidad (número), precioLimite, precioStop, precioEstimado, precioEjecucion (null hasta ejecutarse), totalTransaccion, comision{…}, totalDescontado, estado, encolada, creadaEn, actualizadaEn`. Montos como texto con 2 decimales.
3. **Historial**: `{ ordenId, estados: [{ estado, fecha, actor: { tipo: "USUARIO" | "SISTEMA", nombre }, motivo }] }`.
4. **Estados de orden**: `PENDIENTE`, `EN_EJECUCION`, `EJECUTADA`, `CANCELADA`, `RECHAZADA`. Transiciones: `PENDIENTE → EN_EJECUCION | CANCELADA | RECHAZADA`; `EN_EJECUCION → EJECUTADA | RECHAZADA`. Solo `PENDIENTE` es cancelable.
5. **Creación**: MARKET con mercado abierto → `EN_EJECUCION` (pasa a `EJECUTADA` a los 3 s o con `ejecutarPendientes()`); LIMIT/STOP_LOSS/TAKE_PROFIT o mercado cerrado con `confirmarEncolamiento` → `PENDIENTE`.
6. **Comisión**: 0,50 % del total; en INV todo es `valorPlataforma` y `valorComisionista` es `0.00`.
7. **Compra** reserva `totalDescontado` (disponible → reservado); al ejecutarse sale de reservado; al cancelar vuelve a disponible. **Venta** suma al disponible al ejecutarse.
8. **Orden de otro usuario** → 404 `NO_ENCONTRADO` (no 403, para no revelar su existencia).
9. **Doble autorización**: si la preferencia está activa y el total supera `umbralOrdenGrande`, se exige `codigoAutorizacion` (en el mock `654321`) o responde 403 `DOBLE_AUTORIZACION_REQUERIDA`.
10. **Límite diario**: suma de órdenes del día (sin canceladas/rechazadas) más la nueva; si lo supera, 422 `LIMITE_DIARIO_EXCEDIDO` con `datos { limiteDiario, usadoHoy }`.
11. `GET /cuenta/saldo` y `/portafolio` reflejan las órdenes del mock.

## Estados de pantalla cubiertos

| Estado  | Cómo verlo (`npm start`)                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------- |
| Éxito   | `laura@correo.com`: 4 órdenes de ejemplo (pendiente, ejecutada, cancelada, rechazada)                               |
| Vacío   | `nuevo@correo.com`: sin órdenes, saldo y posiciones en cero                                                         |
| Carga   | `window.__mock.ordenes.latencia(2000)`                                                                              |
| Error   | `window.__mock.ordenes.fallar("PROVEEDOR_NO_DISPONIBLE")` (cualquier código del catálogo; opciones `veces`, `ruta`) |
| Mercado | `window.__mock.ordenes.mercado(false \| true \| null)`                                                              |

`.limpiar()` quita errores y latencia forzados. Con `PROVEEDOR_NO_DISPONIBLE` o `TIEMPO_AGOTADO` en `POST /ordenes` el cliente HTTP reintenta con la **misma** `Idempotency-Key`.

## Pendiente en las siguientes partes

Notificaciones (incluida la que genera cancelar), comisionista (clientes, portafolio y órdenes del cliente, propuestas) y la orden de un COM con `clienteId` / `codigoAutorizacion`.

## Limitaciones conocidas

El mock no reserva acciones en ventas pendientes (se podrían vender dos veces las mismas), no simula ejecución parcial y el reloj de mercado usa el horario real o el forzado.
