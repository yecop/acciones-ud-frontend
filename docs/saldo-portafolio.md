# SCRUM-30: saldo y portafolio

`#/portafolio` está protegida para inversionistas y reutiliza los componentes de SCRUM-25 dentro de `AppShell`. No añade otra barra de navegación ni usa datos de una identidad fija. El panel principal conserva su presentación existente.

## API

`src/services/portafolioApi.js` conserva sus exportaciones originales pero usa el cliente HTTP común para GET `/cuenta/saldo`, `/portafolio` y `/portafolio/posiciones`: sesión autenticada, renovación de token y errores traducidos. No usa `X-Usuario-Id: usuario-demo` ni un `fetch` independiente.

La pantalla consulta también GET `/perfil/preferencias`. `visualizacion.portafolio` selecciona TABLA o TARJETAS; se aplica el tema guardado y se conservan las mismas cifras en ambas vistas. El enlace «Cambiar en Perfil» permite guardar otra vista y volver desde el menú. Al recargar o pulsar Actualizar se consulta otra vez la API. Una preferencia ausente usa TABLA por compatibilidad; una vista desconocida o un fallo al consultar preferencias se informa y permite reintentar, sin afirmar que se respetó una configuración que no se pudo leer.

Los montos y rendimientos provienen de los endpoints existentes; la UI solo les da formato USD y porcentaje. Signos y números comunican ganancia o pérdida además del color. Las tablas tienen desplazamiento horizontal accesible por teclado en pantallas pequeñas; las tarjetas se adaptan a una columna. Un fallo de API muestra un error, no un portafolio vacío ni datos de ejemplo.

## Casos del mock

| Cuenta             | Estado                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `laura@correo.com` | Disponible 4250.00, reservado 351.20; cinco posiciones con ganancias y pérdidas. MSFT usa costo de compra 500.00 para mostrar pérdida. |
| `nuevo@correo.com` | Inversionista demo habilitado con saldo y posiciones en cero; permite probar el estado vacío sin depender del proceso de alta.         |

Contraseña `Demo1234`; MFA `482913`. Los usuarios recién registrados se marcan también con cuenta vacía, pero mantienen el estado pendiente de alta y no pueden entrar hasta su habilitación. Esta tarea no añade un proceso de activación.

El mock separa los datos según el usuario autenticado y evita división por cero en el resumen vacío. No se modificó el repositorio backend. El comportamiento contra el backend real queda sujeto a que implemente los endpoints y el contrato de preferencias existente; los criterios de esta tarea se verifican con MSW.

## Verificación

1. `npm start`, ingresar como Laura y abrir Portafolio y órdenes. Comprobar disponible, reservado, resumen y las cinco posiciones. AAPL presenta ganancia y MSFT pérdida.
2. Ir a Perfil, seleccionar Tarjetas en «Vista del portafolio», guardar preferencias y regresar. Recargar: la vista debe seguir en tarjetas.
3. Salir e ingresar como `nuevo@correo.com`: resumen en cero, cero posiciones y «Aún no tienes posiciones», sin activos de Laura. Repetir con ambas vistas.
4. Probar Actualizar, error de API y Reintentar. Un error nunca debe confundirse con una cuenta vacía.

`PortafolioView.test.jsx` recorre estos casos mediante router, sesión, cliente HTTP y MSW. La revisión adicional en Chromium incluye ingreso + MFA, cambio real de preferencia y recarga, cuentas vacía/con posiciones, ambas vistas y anchos de 1440, 390 y 320 px, con comprobación automática de accesibilidad en el contenido de la pantalla.
