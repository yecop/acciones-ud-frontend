# SCRUM-27: registro

`#/registro` envía `POST /api/v1/auth/registro` mediante `authApi.registrar` y el cliente HTTP común (sin token). `npm start` usa MSW; `npm run dev` usa el backend configurado en `.env.local`. No se guardan datos del formulario ni contraseñas en el almacenamiento del navegador.

## Cuerpo de la solicitud

```json
{
  "nombre": "Ana Pérez",
  "correo": "ana@correo.com",
  "celular": "+573001234567",
  "contrasena": "Segura123",
  "nivelExperiencia": "PRINCIPIANTE",
  "intereses": { "mercados": ["NYSE"], "sectores": ["TECNOLOGIA"] },
  "perfilRiesgo": "MODERADO",
  "objetivos": ["AHORRO"]
}
```

La confirmación de contraseña solo se valida en el cliente y no se envía. El nombre se recorta, el correo se recorta y normaliza a minúsculas; el celular admite formato internacional y elimina espacios, paréntesis y guiones. La contraseña no se modifica.

**Pendiente de confirmar con el contrato real:** celular obligatorio, nombres y valores de `perfilRiesgo` y `objetivos`, y estado de la respuesta. Estos son acuerdos provisionales del mock de SCRUM-27; no constituyen una verificación del backend. El adaptador está en `src/pages/registration.js`. Los niveles, intereses y su estructura se basan en el perfil existente.

**Referencia visual revisada:** el enlace recibido apunta a la página «Verificación» (`2:295`). El mismo archivo contiene «Perfil de inversión» (`2:176`), que coincide con la base de componentes existente: cabecera, dos columnas, tarjetas y selecciones. No contiene una pantalla de datos personales ni campos de riesgo u objetivos. El registro extiende esa base para cubrir el alcance de SCRUM-27; no es una reproducción exacta de una pantalla de registro completa de Figma. Comisionistas, notificaciones, planes y apertura de custodia no forman parte de esta solicitud de registro.

MSW valida datos personales, selecciones y catálogos, rechaza correos duplicados, guarda el perfil y responde `201` con `{ id, correo, nombre, estado: "PENDIENTE_ALTA" }`. El login de esa cuenta responde `403 USUARIO_RESTRINGIDO` con `datos.estado: "PENDIENTE_ALTA"`; las cuentas demo siguen activas. El mock se reinicia al recargar: completar el registro y probar el login dentro de la misma sesión de la página. No hay activación automática ni se emiten tokens al registrarse.

## Mensajes y accesibilidad

- `VALIDACION_FALLIDA`: `detalles: [{ campo, problema }]`. Los campos anidados usan `intereses.mercados` / `intereses.sectores`. Todos los errores aparecen en el resumen, incluso si el backend menciona un campo desconocido.
- `CORREO_DUPLICADO`: mensaje junto al correo, foco en ese campo y posibilidad de corregirlo.
- Respuesta con estado `PENDIENTE_ALTA`, `PENDIENTE_DE_ALTA` o `PENDIENTE`: confirmación explícita de que todavía no puede ingresar ni operar. Otros estados de éxito muestran confirmación general.
- Fallo de red u otro error: conserva datos para reintentar. Mientras se envía, bloquea el formulario y evita solicitudes simultáneas. Después del éxito, borra el formulario.
- Labels, fieldsets y controles nativos de radio/checkbox; navegación por teclado, errores asociados con `aria-describedby`, resumen anunciado y foco en el primer error o en la confirmación. Una columna en celular y controles de al menos 48 px.

## Verificación manual con backend

1. Confirmar el cuerpo anterior con su contrato, incluidos catálogos y reglas de contraseña.
2. Configurar `VITE_PROXY_TARGET` o `VITE_API_BASE_URL`, desactivar `VITE_USE_MOCK` y usar `npm run dev`.
3. Probar cuenta nueva, correo duplicado y errores por campo; comprobar la respuesta de pendiente de alta sin sesión automática.
4. Revisar el diseño contra Figma en escritorio y celular, con teclado y lector de pantalla.

Las pruebas automáticas de `RegistrationPage.test.jsx` recorren la ruta completa con el cliente HTTP real y MSW: validación local, alta y perfil, pendiente, duplicado/corrección, errores de servidor, bloqueo durante envío y fallo de red.
