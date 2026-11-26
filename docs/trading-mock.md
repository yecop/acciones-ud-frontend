# SCRUM-35: mock de trading — órdenes y notificaciones

Fuente: respuestas del backend (22-nov). Cada punto va marcado como **[Definido]** (ya está en el esquema de la base de datos o en Jira) o **[Propuesta]** (falta acordarlo con backend: úsese para el mock, puede cambiar). Lo que backend no respondió se marca ⚠. Órdenes (SCRUM-38), propuestas, notificaciones y comisionistas (SCRUM-53, 51 y 52) siguen pendientes de su lado.

## Endpoints (`src/mocks/ordenes.js`, cliente `src/api/ordenesApi.js`)

| Endpoint                      | Roles    | Origen de la forma                                                                           |
| ----------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `POST /ordenes/simulacion`    | INV, COM | Contrato                                                                                     |
| `POST /ordenes`               | INV      | Contrato; 202 con doble autorización es [Propuesta]. COM con `clienteId`: parte comisionista |
| `POST /ordenes/autorizar`     | INV      | [Propuesta]                                                                                  |
| `GET /ordenes`                | INV      | Filtros del contrato; lista paginada [Propuesta]                                             |
| `GET /ordenes/{id}`           | INV      | ⚠ Forma de la orden supuesta                                                                |
| `GET /ordenes/{id}/historial` | INV      | Contenido [Definido]; envoltorio [Propuesta]                                                 |
| `POST /ordenes/{id}/cancelar` | INV      | Contrato; estados cancelables [Propuesta]                                                    |

## Reglas

1. **Convenciones [Definido]:** prefijo `/api/v1`; montos como texto con 2 decimales; errores en el formato estándar con `traceId`.
2. **Estados de orden [Definido]:** `PENDIENTE, ENVIADA, FIRMADA_POR_COMISIONISTA, EN_EJECUCION, CANCELADA, RECHAZADA, EXPIRADA, EN_REVISION, FALLIDA, DETENIDA`. **No existe `EJECUTADA`:** las ejecuciones (también las parciales) van aparte, con cantidad, precio y fecha. El mock las expone en `ejecuciones`, `cantidadEjecutada` y `precioEjecucion` (promedio).
3. **Tipos [Definido]:** `MARKET, LIMIT, STOP_LOSS, TAKE_PROFIT`; `lado` COMPRA o VENTA; `cantidad` entero ≥ 1; `precioLimite` y `precioStop` opcionales según el tipo.
4. **Cancelación [Propuesta]:** solo en `PENDIENTE` o `EN_REVISION`; en otro estado, 409 `ORDEN_NO_CANCELABLE`.
5. **Transiciones ⚠:** no están definidas. El mock solo mueve a `EN_EJECUCION` al ejecutar y a `CANCELADA` al cancelar; el resto de estados se puede forzar con `window.__mock.ordenes.estado(id, estado)`.
6. **Historial [Definido]:** cada cambio guarda estado, fecha, actor (null si fue el sistema), motivo, precio de referencia, bid, ask y `traceId`; es inmutable. **[Propuesta]** respuesta `{ ordenId, estados: [{ estado, fecha, actor: { tipo: "USUARIO" | "COMISIONISTA" | "SISTEMA", id | null }, motivo, precioReferencia }] }`, de la entrada más antigua a la más reciente (el mock añade `bid`, `ask` y `traceId`).
7. **Orden de otro usuario [Propuesta]:** 404, para no revelar que existe.
8. **Doble autorización:** **[Definido]** la orden guarda quién la validó y cuándo (`validadaPor`, `validadaEn`). **[Propuesta]** `POST /ordenes` responde `202 { requiereAutorizacion: true, autorizacionId }` sin crear la orden; se confirma con `POST /ordenes/autorizar { autorizacionId, codigoAutorizacion }` (201 con la orden). En el mock el código es `654321` y la autorización vence a los 5 min. Código inválido o vencido: 422 (⚠ el código del error no está definido; el mock usa `CODIGO_AUTORIZACION_INVALIDO`). Confirmar dos veces devuelve la misma orden.
9. **Idempotencia:** **[Definido]** la clave es única por cuenta y no expira. **[Propuesta]** header `Idempotency-Key`; mismo cuerpo → mismo 201; cuerpo distinto → 409 `CONFLICTO_IDEMPOTENCIA`. Con 502/504 el cliente reintenta con la misma clave.
10. **Comisión [Definido]:** 2,00 % del total de la transacción (configurable en el backend). Con comisionista: 60 % Acciones UD y 40 % comisionista; sin comisionista, 100 % plataforma.
11. **Listas [Propuesta]:** paginadas con `{ contenido, pagina, tamano, totalElementos, totalPaginas }`, `pagina` desde 0, más recientes primero.
12. **Saldo:** una compra reserva `totalDescontado` (disponible → reservado); al ejecutarse sale de reservado; si se cancela, rechaza, expira o falla, vuelve a disponible. Una venta suma al disponible al ejecutarse. `GET /cuenta/saldo` y `/portafolio` lo reflejan.
13. **Límite diario:** suma de órdenes del día (sin canceladas, rechazadas, expiradas ni fallidas) más la nueva; si lo supera, 422 `LIMITE_DIARIO_EXCEDIDO`.

## Preguntas que quedan abiertas para backend

1. ¿En qué estado queda una orden totalmente ejecutada, si no existe `EJECUTADA`? El mock la deja en `EN_EJECUCION` con `cantidadEjecutada === cantidad` (constante `ESTADO_AL_EJECUTAR`).
2. ¿Cuál es el flujo entre `PENDIENTE`, `ENVIADA`, `EN_REVISION`, `EN_EJECUCION`, `DETENIDA`, `EXPIRADA` y `FALLIDA`, y qué dispara cada transición?
3. ¿Qué campos tiene la orden en `GET /ordenes` y `GET /ordenes/{id}`? ¿Incluye las ejecuciones?
4. ¿Qué código de error devuelve el 422 de la doble autorización y cuánto dura el código?
5. ¿El código de autorización lo entrega otra vía (SMS/correo)? ¿Se pide para toda orden sobre el umbral?

## Estados de pantalla cubiertos

| Estado  | Cómo verlo (`npm start`)                                                                                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Éxito   | `laura@correo.com`: 8 órdenes de ejemplo (PENDIENTE, EN_EJECUCION ya ejecutada, CANCELADA, RECHAZADA, EXPIRADA, EN_REVISION, FALLIDA, DETENIDA) |
| Vacío   | `nuevo@correo.com`: sin órdenes, saldo y posiciones en cero                                                                                     |
| Carga   | `window.__mock.ordenes.latencia(2000)`                                                                                                          |
| Error   | `window.__mock.ordenes.fallar("PROVEEDOR_NO_DISPONIBLE")` (cualquier código del catálogo; opciones `veces`, `ruta`)                             |
| Mercado | `window.__mock.ordenes.mercado(false \| true \| null)` o `window.__mock.mercadoAbierto("NYSE", false)`                                          |
| Parcial | `window.__mock.ordenes.ejecutarParcial()` tras crear una orden de 2+ acciones                                                                   |
| Estados | `window.__mock.ordenes.listar()` y `.estado(id, "ENVIADA")` para ver cualquiera de los 10                                                       |

`.ejecutarPendientes()` ejecuta lo que falte; `.limpiar()` quita errores y latencia forzados.

## Historial y detalle de órdenes (SCRUM-62)

- `/historial` (solo INV): `GET /ordenes` con filtros `estado`, `lado`, `ticker`, `desde`, `hasta` (día local completo en ISO) y paginación de 10 (`pagina` desde 0 en la API, desde 1 en la URL). Filtros y página viven en la URL (`?estado=CANCELADA&pagina=2`), así que se pueden compartir y el botón «atrás» funciona.
- `/historial/:id`: `GET /ordenes/{id}` + `GET /ordenes/{id}/historial` en paralelo. Si falla solo el historial, el resumen se muestra igual con su propio «Reintentar». Una orden ajena responde 404 y se muestra «no existe o no te pertenece».
- Desde el detalle se puede cancelar (misma regla: solo PENDIENTE y EN_REVISION).
- Actor del historial: `USUARIO` se muestra «Tú» si coincide con la sesión, `COMISIONISTA`, `SISTEMA`. [Propuesta] hasta que backend confirme el formato.
- El filtro «En ejecución o ejecutada» agrupa EN_EJECUCION porque aún no hay un estado EJECUTADA (ver preguntas abiertas).

## Notificaciones (parte 2, `src/mocks/notificaciones.js`, cliente `src/api/notificacionesApi.js`)

| Endpoint                           | Roles    | Origen de la forma                                                            |
| ---------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `GET /notificaciones`              | INV, COM | Filtros `tipo`, `desde` y paginación del contrato; lista paginada [Propuesta] |
| `PATCH /notificaciones/{id}/leida` | INV, COM | [Propuesta]                                                                   |

- **Canales [Definido]:** `SMS`, `EMAIL` y `WHATSAPP` (ya existen en las preferencias del perfil). Las notificaciones del mock son internas (campana); el canal por el que llegan no se modela.
- **Eventos [Definido]:** `APERTURA_CIERRE_MERCADO`, `RESUMEN_DIARIO_OPERACIONES` y `ORDEN_EJECUTADA`. Probablemente se añadan tipos para propuestas y alertas.
- **Forma [Propuesta]:** `{ id, tipo, titulo, mensaje, leida, creadaEn, referenciaId }`; `referenciaId` apunta a la orden (o propuesta) que la originó, o es `null`.
- **Privacidad [Definido]:** cada usuario solo ve y marca las suyas. Marcar una ajena o inexistente responde 404, igual que las órdenes.
- **Orden → notificación:** completar la ejecución de una orden crea `ORDEN_EJECUTADA` (una ejecución parcial no notifica). Cancelar una orden crea `ORDEN_CANCELADA`: el contrato dice que cancelar genera una notificación, pero ⚠ no define su tipo.
- ⚠ **Filtro `leida`:** no está en el contrato; el mock lo acepta (`leida=false`) para poder mostrar la cantidad de no leídas con `totalElementos`. Si backend no lo implementa, habría que contarlas en el cliente o pedir un endpoint de conteo.
- **Orden:** más recientes primero. Marcar como leída es idempotente y devuelve la notificación actualizada.

Estados de pantalla: `laura@correo.com` tiene 4 (2 sin leer); `nuevo@correo.com` ninguna (vacío). Carga y error con `window.__mock.ordenes.latencia(ms)` y `window.__mock.ordenes.fallar("ERROR_INTERNO", { ruta: "/notificaciones" })`. Para ver llegar una nueva: `window.__mock.notificaciones.crear()` o `.mercado("NYSE", false)`; `.noLeidas()` cuenta las pendientes.

### Preguntas abiertas para backend (notificaciones)

1. ¿Qué tipo (`tipo`) y mensaje lleva la notificación que genera cancelar una orden?
2. ¿Existirá un filtro `leida` o un endpoint con el conteo de no leídas?
3. ¿Hay "marcar todas como leídas"? ¿Y cuánto tiempo se conservan?
4. Los tipos para propuestas y alertas, ¿cuáles serán y cuándo?

## Órdenes avanzadas y encolamiento (SCRUM-64)

- El campo de precio cambia según el tipo: «Precio límite» (Limit), «Precio stop» (Stop Loss) y «Precio objetivo» (Take Profit), cada uno con su ayuda, el precio actual y cuánto se aleja el precio escrito (en %).
- **Combinaciones que la interfaz no deja enviar** (botón deshabilitado con el motivo): Stop Loss de venta en o sobre el precio actual y Take Profit de venta en o bajo el precio actual, porque se activarían de inmediato. Un límite que se ejecutaría de inmediato solo avisa.
- ⚠ El contrato no define cuándo se activan Stop Loss y Take Profit ni si aplican a compras; la regla usa la convención habitual del mercado y no bloquea compras. Todo vive en `src/components/order/guiaPrecio.js` para cambiarlo si backend define otra cosa. El backend sigue validando.
- Con el mercado cerrado el formulario explica el encolamiento y muestra la **próxima apertura** en la hora del mercado (zona `zonaHoraria` de `GET /mercados/{codigo}/estado`) y en la hora de la persona. Antes de enviar se pide confirmar (el flujo ya existía) y la confirmación repite la apertura.
- Una orden encolada se ve como **«Programada para la apertura»** (lista y detalle).
- **Qué hacer en cada estado** (`ayudaEstado`, textos [Propuesta]): En revisión (esperar o cancelar), Detenida (no se ejecuta, no se puede reactivar ni cancelar; crear una orden nueva o contactar a soporte). Se muestran en la lista y en el detalle.
- ⚠ Preguntas para backend: ¿por qué una orden pasa a EN_REVISION y a DETENIDA, quién lo decide y cuánto dura? ¿DETENIDA es definitiva? ¿Las Stop Loss/Take Profit de compra existen?

## Comisionista y propuestas (SCRUM-35 parte 3 y SCRUM-65)

Todo lo de esta sección es **[Propuesta]**: backend aún no define estos endpoints (SCRUM-51/52/53). El mock y las pantallas siguen esta forma para poder cambiarla en un solo lugar (`src/api/comisionistaApi.js`, `src/api/propuestasApi.js`, `src/mocks/comisionista.js`).

**Usuarios demo:** `carlos@correo.com` (COM, maneja a «Carlos R.»), `mateo@correo.com` (INV, cliente de Carlos; trae 5 propuestas de ejemplo), `valentina@correo.com` (INV, cliente de Andrea P.: sirve para probar el acceso a un cliente ajeno), `laura@correo.com` (INV sin comisionista, para elegir uno).

**Flujo supuesto:** el comisionista crea la propuesta → el cliente la aprueba o rechaza → el comisionista la firma y entonces se crean las órdenes del cliente (estado `FIRMADA_POR_COMISIONISTA`, sin reservar fondos ni ejecutarse en el mock).

| Endpoint | Rol | Notas |
| --- | --- | --- |
| `GET /clientes`, `GET /clientes/{id}` | COM | Solo clientes asignados; otro cliente → 404 |
| `GET /clientes/{id}/portafolio/posiciones`, `GET /clientes/{id}/ordenes` | COM | Solo lectura (el comisionista no cancela órdenes del cliente) |
| `GET/POST /estrategias`, `PATCH /estrategias/{id}` | COM | Nombre, descripción, perfil de riesgo; se archivan (estado `ACTIVA`/`ARCHIVADA`), no se borran |
| `GET /propuestas`, `GET /propuestas/{id}` | INV, COM | INV ve las suyas; COM las de sus clientes; filtros `estado`, `clienteId`; el detalle trae `historial` |
| `POST /propuestas` | COM | `{clienteId, titulo, nota?, estrategiaId?, ordenes[], venceEn}`; 1–10 órdenes, vigencia máx. 30 días |
| `POST /propuestas/{id}/aprobar` y `/rechazar {motivo}` | INV | Solo desde `PENDIENTE_APROBACION` |
| `POST /propuestas/{id}/firmar` | COM | Solo desde `APROBADA` |

- **Estados:** `PENDIENTE_APROBACION → APROBADA → FIRMADA`, o `RECHAZADA` / `VENCIDA`. Una propuesta vigente cuya `venceEn` pasó se marca `VENCIDA` (actor `SISTEMA`).
- **Errores:** rol equivocado → 403 `ACCESO_DENEGADO`; propuesta o cliente ajeno → 404 (no se revela si existe); acción en estado equivocado → 409 `TRANSICION_INVALIDA`; propuesta vencida → 409 `PROPUESTA_VENCIDA` (código provisional); validación → 400 con `detalles`.
- **Pantallas:** INV `/mi-comisionista` (elegir, cambiar, dejar; usa los endpoints de perfil que ya existían) y `/propuestas` (+ detalle con Aprobar/Rechazar); COM `/comisionista` (clientes) y `/comisionista/clientes/:id`, `/estrategias`, `/propuestas` (+ `/propuestas/nueva` y detalle con Firmar). Aprobar, rechazar y firmar piden confirmación y muestran el estado nuevo. 403, 404, vencimiento y errores de red tienen mensaje propio.

**Preguntas abiertas para backend:**
1. ¿Quién firma? Se asumió que el comisionista firma tras la aprobación del cliente; confirmar el flujo y si la firma crea las órdenes directamente.
2. ¿Qué pasa con las propuestas vigentes cuando el cliente cambia o deja a su comisionista? (el mock deja la firma en 409 y la pantalla lo advierte).
3. ¿Cliente ajeno → 404 o 403? (la interfaz trata ambos igual).
4. ¿Qué es exactamente una «estrategia» (campos, si se vincula a órdenes o a portafolios)?
5. Código de error de una propuesta vencida y vigencia máxima.
6. Tipos de notificación para propuestas (recibida, aprobada, rechazada, firmada): no se generan en el mock.
7. Reserva de fondos y comisión (60/40) al firmar: ¿cuándo se descuentan?

## Pendiente en las siguientes partes

Comisionista: clientes, portafolio y órdenes del cliente, propuestas (`PENDIENTE_APROBACION → APROBADA → FIRMADA`, `RECHAZADA` o `VENCIDA`, con una o más órdenes y vencimiento) y la orden de un COM con `clienteId`.

## Limitaciones conocidas

El mock no reserva acciones en ventas pendientes (se podrían vender dos veces las mismas), el reloj de mercado usa el horario real o el forzado, y las órdenes STOP_LOSS/TAKE_PROFIT se ejecutan con el precio de mercado al pedirlo.
