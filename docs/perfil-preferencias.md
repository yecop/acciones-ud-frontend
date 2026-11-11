# SCRUM-29 — Perfil y preferencias

Pantalla `#/perfil`, disponible desde el menú del usuario autenticado. Mantiene la tipografía Manrope, los tokens de color y las tarjetas del proyecto; no se recibió un mockup específico de configuración.

## API reutilizada

- `GET /api/v1/perfil` carga el perfil; `PATCH /perfil` guarda solo `nombre` y `celular`. El correo se muestra como solo lectura, conforme a los campos editables documentados en `perfilApi.js`.
- `GET /api/v1/perfil/preferencias` carga preferencias; `PUT` reemplaza el documento completo. Se conservan campos desconocidos en el documento y en cada grupo para no perder preferencias ajenas al formulario.
- Las dos secciones se guardan por separado y muestran éxito o error independientes. Una carga fallida no habilita el formulario de esa sección; permite reintentar sin sobrescribir con datos inventados.
- Después del guardado, la respuesta de la API actualiza el formulario; el nombre actualiza también la sesión y el encabezado. Al volver a abrir o recargar se consulta de nuevo la API.
- Se mantiene la autorización existente del mock: datos básicos para INV y COM; preferencias únicamente para INV. Otros roles conservan las restricciones del router.

## Forma de las preferencias

```json
{
  "notificaciones": { "canales": ["EMAIL", "SMS"], "reporteMensual": true },
  "visualizacion": { "tema": "esmeralda", "portafolio": "TABLA" },
  "operaciones": {
    "confirmarAntesDeEnviar": true,
    "tipoOrdenPorDefecto": "LIMIT",
    "limiteDiario": "2500.50",
    "dobleAutorizacion": true,
    "umbralOrdenGrande": "500.25"
  }
}
```

**Contrato pendiente de confirmación:** la base de SCRUM-26 ya documenta `notificaciones.canales`, `visualizacion.tema` y `operaciones.confirmarAntesDeEnviar`, pero no documenta los campos adicionales del alcance. `reporteMensual`, `portafolio`, `tipoOrdenPorDefecto`, `limiteDiario`, `dobleAutorizacion` y `umbralOrdenGrande`, sus catálogos y la moneda USD son extensiones provisionales del mock y de esta interfaz. Confirmarlas contra la especificación antes de declarar validada la integración real. No se modificó el repositorio backend.

Opciones: EMAIL/SMS/WHATSAPP; portafolio TABLA/TARJETAS; orden MARKET/LIMIT/STOP_LOSS/TAKE_PROFIT. TRAILING_STOP se muestra deshabilitado y no supera la validación. Los montos viajan como texto para conservar decimales, deben ser positivos y admitir hasta 12 enteros y 2 decimales. El umbral es obligatorio al activar doble autorización. Las reglas de ejecución de órdenes, autorización adicional y envío del reporte pertenecen a sus servicios/consumidores: esta tarea edita y persiste la configuración; no añade ejecución de esas operaciones ni un envío de correos.

## Mock y recarga

Solo con `npm start` (modo mock), `mocks/persistence.js` conserva los perfiles demo editables y sus preferencias en `sessionStorage`, junto con los refresh tokens **ficticios** necesarios para renovar la sesión al recargar. No guarda contraseñas ni access tokens. El contenido del backend real nunca pasa por ese adaptador. Cerrar la pestaña elimina esos datos; `window.__mock.reiniciar()` restaura los valores demo e invalida los tokens mock. Sin almacenamiento disponible, el mock funciona únicamente en memoria.

El mock valida campos de perfil y preferencias y retorna `VALIDACION_FALLIDA` con `detalles: [{ campo, problema }]`. Los nombres anidados se expresan con puntos (por ejemplo, `operaciones.limiteDiario`). La interfaz muestra los errores junto al campo y en un resumen anunciado, incluidos campos desconocidos. Un error de guardado conserva los valores para reintentar. No hay guardado optimista ni solicitudes simultáneas por sección.

## Cómo probar

1. Ejecutar `npm start`; ingresar con `laura@correo.com` / `Demo1234` y MFA `482913`.
2. Ir a Perfil; modificar datos básicos y guardarlos. Comprobar el nombre en el encabezado.
3. Cambiar canales, vista, tema, tipo de orden, límite, autorización, umbral y reporte; guardar preferencias.
4. Recargar la página y comprobar que se mantienen los datos y la sesión. Volver al perfil después de navegar a otra sección.
5. Vaciar el nombre, desmarcar todos los canales o ingresar un monto negativo; verificar foco y errores por campo sin guardado.
6. Probar fallo de red, errores de validación API y reintento de carga. Para backend real, usar `npm run dev` con `VITE_PROXY_TARGET` configurado y confirmar antes la forma de los campos anteriores.

Pruebas: `ProfilePage.test.jsx` recorre carga/guardado, remontaje, conservación de campos desconocidos, validación, errores de servidor/red, fallos parciales, roles y bloqueo de doble envío. `persistence.test.js` verifica la restauración mock y almacenamiento bloqueado/corrupto. Se verificó además el flujo en Chromium con recarga real y tamaños de 1440, 390 y 320 px.
