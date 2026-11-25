# Acciones UD — Interfaz web

Interfaz web de la plataforma de day trading **Acciones UD**, implementada en **React** con
**CSS Modules** y tokens de diseño. Se comunica con el backend a través del contrato
_Especificación de la API REST_ (`/api/v1`).

## Primeros pasos

```bash
npm install
npm start        # app + servidor mock (MSW): no necesita backend
npm run dev      # app contra el backend real (proxy de Vite a VITE_PROXY_TARGET, 8080 por defecto)
npm run build    # build de producción (no incluye el mock)
npm run preview  # previsualiza el build
```

| Script                 | Qué hace                                                |
| ---------------------- | ------------------------------------------------------- |
| `npm start`            | Vite en modo `mock`: levanta la app con la API simulada |
| `npm run dev`          | Vite contra el backend real                             |
| `npm run lint`         | ESLint (bloqueante en CI)                               |
| `npm run format`       | Prettier (escribe)                                      |
| `npm run format:check` | Prettier (solo verifica)                                |
| `npm test`             | Vitest (bloqueante en CI)                               |

### Cuentas del mock

Contraseña de todas: `Demo1234` · Código MFA: `482913` (`111111` simula un código vencido).

| Correo              | Rol                  | Pantalla inicial |
| ------------------- | -------------------- | ---------------- |
| `laura@correo.com`  | Inversionista (INV)  | `#/panel`        |
| `carlos@correo.com` | Comisionista (COM)   | `#/comisionista` |
| `admin@correo.com`  | Administrador (ADM)  | `#/admin`        |
| `legal@correo.com`  | Legal (LEG)          | `#/auditoria`    |
| `junta@correo.com`  | Junta directiva (JD) | `#/reportes`     |

Para ver la renovación automática del token: inicia sesión, abre la consola del navegador y
ejecuta `window.__mock.expirarToken()`; la siguiente acción de la app se completa sin que se
note y `window.__mock.renovaciones()` pasa a `1`.

## Variables de entorno

Copia `.env.example` a `.env.local` para cambiarlas en tu máquina. `npm start` usa `.env.mock`.

| Variable                       | Descripción                                             |
| ------------------------------ | ------------------------------------------------------- |
| `VITE_API_BASE_URL`            | Origen del backend sin `/api/v1`. Vacío = mismo origen. |
| `VITE_PROXY_TARGET`            | Backend al que apunta el proxy de `npm run dev`.        |
| `VITE_USE_MOCK`                | `true` activa el servidor mock.                         |
| `VITE_MOCK_ACCESS_TTL_SECONDS` | Vida del access token del mock (900 por defecto).       |

## Rutas y roles

Router con `HashRouter` (`#/panel`), que se despliega en hosting estático sin reglas de
reescritura. **`src/routes/routesConfig.js` es la fuente única**: cada ruta declara los roles
que pueden verla y de ahí salen tanto el router como el menú de cada rol.

- Sin sesión → `#/ingreso` (recuerda a dónde quería ir).
- Con sesión pero sin el rol → pantalla «No tienes acceso» (403).
- Pantallas reales: ingreso, verificación MFA, registro (datos personales y perfil de
  inversión, SCRUM-27), panel, perfil, portafolio y acciones (SCRUM-24). El resto de rutas
  existen y están protegidas, con una pantalla
  «En construcción» que indica la tarea que las construye.
- **Layout responsivo**: en escritorio, barra superior con el menú del rol; en móvil (≤ 860 px),
  barra de navegación inferior.

Para agregar una pantalla: crear la página, registrar la ruta en `routesConfig.js` con sus roles
y reemplazar `PaginaPendiente` en `AppRoutes.jsx`.

## Cliente HTTP

Todo acceso a la API pasa por `src/api/http.js` (`createHttpClient` en `httpClient.js`). Los
módulos `src/api/*Api.js` solo declaran los endpoints y **no deben usar `fetch` directamente**.
Las rutas se escriben sin prefijo: `http.get("/perfil")` llama a `/api/v1/perfil`.

Interceptores:

- **Solicitud:** `Authorization: Bearer <accessToken>` (salvo `auth: false` en endpoints PUB),
  `X-Trace-Id` (UUID nuevo por solicitud) e `Idempotency-Key` cuando se pasa `idempotencyKey`.
- **Renovación automática:** ante `401 TOKEN_EXPIRADO` renueva con `/auth/refresh` **una sola vez**
  y repite la solicitud **una sola vez** (con el mismo `X-Trace-Id`). Varias solicitudes
  simultáneas comparten una sola renovación. Si la renovación falla, cierra la sesión y la app
  vuelve al ingreso.
- **Errores:** todo error se lanza como `ApiError` (`status`, `codigo`, `traceId`, `detalles`,
  `datos`) con el mensaje traducido en español. La UI decide por `codigo`, nunca por el texto del
  servidor. En fallas inesperadas, `error.mensajeUsuario` incluye el `traceId` para soporte.
- **Reintentos con idempotencia:** con `idempotencyKey`, ante 502, 504 o fallo de red reintenta
  (máx. 2 veces) con la **misma** clave. Se genera con `nuevoUuid()` una vez por intención del
  usuario.

```js
import { http } from "../api/http.js";
import { nuevoUuid } from "../api/httpClient.js";

try {
  await http.post("/ordenes", orden, { idempotencyKey: claveDeEstaIntencion });
} catch (e) {
  mostrarError(e.mensajeUsuario); // mensaje traducido; incluye el traceId si es inesperado
}
```

Los mensajes están en `src/api/errorMessages.js` (los 24 códigos del catálogo del contrato) y una
prueba falla si falta alguno.

**Sesión:** el access token vive solo en memoria; el refresh token y el usuario, en
`sessionStorage` (sobreviven a una recarga y se pierden al cerrar la pestaña).

### Migrar los clientes de otras ramas

`mercadosApi.js` y `portafolioApi.js` (SCRUM-23 y SCRUM-25) tienen su propio `fetch`. Para
usar el cliente común, cambian `obtenerJson(ruta)` por `http.get(ruta)` y quitan el prefijo
`/api/v1` de la ruta; así reciben token, trazabilidad, renovación y errores traducidos.

## Saldo y portafolio (SCRUM-31)

En `#/portafolio`, el inversionista puede consultar saldo disponible y reservado, resumen y
posiciones con ganancia/pérdida y rendimiento porcentual. Se reutilizan los componentes de
SCRUM-25 y se aplica la vista Tabla/Tarjetas guardada en Perfil. La cuenta mock `nuevo@correo.com`
permite comprobar el portafolio vacío; usa `Demo1234` y MFA `482913`, como Laura.
Ver [docs/saldo-portafolio.md](docs/saldo-portafolio.md) para escenarios, API y alcance.

## Perfil y preferencias (SCRUM-29)

En `#/perfil`, los usuarios autenticados pueden editar nombre y celular. El inversionista
puede guardar canales de notificación, vista del portafolio, tema, tipo de orden (trailing stop
deshabilitado), límite diario, doble autorización, umbral de orden grande y reporte mensual.
Los errores se muestran por campo; los datos básicos y las preferencias se guardan por separado.
El mock conserva la configuración al recargar la pestaña. Ver [docs/perfil-preferencias.md](docs/perfil-preferencias.md)
para probarlo y consultar los campos pendientes de confirmar con el backend.

## Login, MFA y sesión

El registro está en `#/registro`: valida datos personales, intereses, nivel, riesgo y objetivos;
envía el formulario al cliente HTTP común y muestra errores por campo, correo duplicado y el
estado pendiente de alta. El mock conserva el perfil y no habilita el ingreso de cuentas
pendientes. Ver [docs/registro.md](docs/registro.md) para el cuerpo de la solicitud, escenarios
de prueba y los campos que falta confirmar con el backend y el mockup.

Flujo: `/ingreso` (credenciales) → `/verificacion` (código de 6 dígitos) → pantalla inicial del rol
(o la ruta a la que se intentó entrar).

- Páginas: `LoginPage` y `MfaPage` (lógica) con `LoginForm` y `VerificationForm` (presentación).
- Estado: `AuthContext` (`iniciarSesion`, `verificarMfa`, `reenviarMfa`, `cerrarSesion`).
- Constantes (espera de reenvío 30 s, bloqueo por defecto 60 s, largo del código) en `src/auth/mfaConfig.js`.
- Mensajes: código inválido, vencido (se pide uno nuevo) y intentos excedidos (429 con cuenta regresiva).
- «Salir» llama a `/auth/logout` y limpia la sesión aunque la llamada falle.
- En el mock, 5 contraseñas incorrectas seguidas bloquean el login 30 s.
- El reto MFA sobrevive a una recarga (`sessionStorage`).
- Dónde guardar el refresh token: ver [docs/refresh-token-storage.md](docs/refresh-token-storage.md).

## Mercados, saldo y portafolio

Los módulos de estado de mercados (SCRUM-23) y de saldo y portafolio (SCRUM-25) usan el cliente
HTTP común, igual que el resto: `src/api/mercadosApi.js` y `src/api/portafolioApi.js`.
Con eso heredan el token, la renovación automática, `X-Trace-Id` y los mensajes de error en español.
Para agregar un módulo nuevo basta con importar `http` de `src/api/http.js`; no se usa `fetch` directo.

- El estado de los mercados se muestra en el panel de mercados (`PanelMercados`, SCRUM-30).
- `/portafolio` (rol INVERSIONISTA) muestra saldo, resumen y posiciones dentro del marco común.

## Dashboard de mercados y acciones (SCRUM-30)

`PanelMercados` (en `/panel`) muestra, por mercado: estado abierto/cerrado con próxima apertura o
cierre, y sus acciones con último precio, bid, ask, spread, variación y antigüedad del dato.

- Datos: `useMercadosDashboard` pide `/mercados`, `/mercados/{c}/estado`, `/perfil` (intereses) y
  `GET /acciones?mercado=X` (una llamada por mercado: cada acción ya trae su `cotizacion` desde la
  caché del backend) mediante `CotizacionesService` (SCRUM-24). Se refresca cada 30 s.
- Intereses: las acciones cuyo sector está en `intereses.sectores` van primero, y los mercados de
  `intereses.mercados` también. Si el perfil falla, se muestra todo sin ese orden.
- LSE, TSE y ASX se marcan «Cierre diario» y «Ejecución simulada» (`src/mercados/reglas.js`).
- Dato antiguo: no hay umbral propio. Se usa lo que envía el backend en cada cotización
  (`umbralAntiguedadSegundos`, `desactualizada`, `advertencia`) con las mismas reglas que la
  pantalla de acciones (`src/utils/antiguedad.js`). Con el mercado **abierto** se muestra «Dato
  antiguo»; con el mercado cerrado, «Último cierre»; con `PROVEEDOR_NO_DISPONIBLE`, «Proveedor sin
  respuesta» y el último dato conocido.
- Si el proveedor falla: un aviso global si todas las acciones vienen sin cotización,
  «Cotización no disponible» en la fila si falla una, y un error con «Reintentar» si falla la lista
  de mercados (se conservan los últimos datos cargados).

Probar fallos desde la consola del navegador con `npm start`:
`__mock.proveedorCaido()`, `__mock.datoAntiguo('AAPL', 600)` y `__mock.mercadoAbierto('NYSE')`
(sin forzar, el estado depende de la hora real y la advertencia solo aplica con el mercado abierto).

## Acciones y cotizaciones (SCRUM-24)

`#/acciones` (roles INVERSIONISTA y COMISIONISTA) lista las acciones de las cinco bolsas con
filtros (mercado, sector, texto) y paginación, y muestra el detalle de la cotización
seleccionada: precio, bid, ask, spread, volumen, fuente y `actualizadoEn`.

- Servicio: `src/api/cotizacionesApi.js` (`CotizacionesService`): `GET /acciones`,
  `GET /acciones/{ticker}` y `GET /acciones/{ticker}/cotizacion`. El backend responde siempre
  desde su caché; el frontend nunca consulta a Alpaca ni a otros proveedores.
- Hooks: `useAcciones` (refresco cada 15 s), `useCotizacion` (cada 5 s) y `useAhora` (reloj
  local cada segundo).
- **Advertencia de antigüedad** (`src/utils/antiguedad.js`): se compara `actualizadoEn` con la
  hora local. Si supera el umbral de su mercado (`umbralAntiguedadSegundos` del backend: 15 s en
  NYSE/NASDAQ, 30 min por defecto en LSE/TSE/ASX) se resalta en ámbar; si el backend avisa
  `PROVEEDOR_NO_DISPONIBLE`, en rojo con el último dato disponible.
- Si nunca hubo dato, el backend responde 502 `PROVEEDOR_NO_DISPONIBLE` y el detalle lo explica.
- En el mock (`npm start`), SHEL, 7203 y BHP vienen con dato viejo para ver la advertencia.

## Servidor mock

`src/mocks/` simula los endpoints de esta semana con [MSW](https://mswjs.io) y la forma exacta
del contrato (éxito y error con `codigo` y `traceId`): autenticación (`registro`, `login`,
`mfa/verificar`, `mfa/reenviar`, `refresh`, `logout`), perfil y preferencias, comisionistas,
mercados (con estado abierto/cerrado calculado por hora real), acciones y cotización,
`dashboard`, saldo y portafolio. Respeta roles (403 `ACCESO_DENEGADO`) y vence los tokens como el
backend. Las pruebas usan los mismos handlers (`src/test/setup.js`).

Para agregar un endpoint, añade su handler en `src/mocks/handlers.js` con `protegido(roles, ...)`.
El archivo `public/mockServiceWorker.js` lo genera MSW (`npx msw init public/`); no se edita.

### Mock de órdenes (SCRUM-35)

`src/mocks/ordenes.js` simula `POST /ordenes/simulacion`, `POST /ordenes` (con `Idempotency-Key`),
`GET /ordenes`, `GET /ordenes/{id}`, `GET /ordenes/{id}/historial` y `POST /ordenes/{id}/cancelar`.
El estado es coherente con saldo y portafolio: comprar reserva fondos, ejecutar mueve la posición
y cancelar libera el saldo. Cliente: `src/api/ordenesApi.js`. Las formas que el contrato no
define (listas, historial, estados) están en [docs/trading-mock.md](docs/trading-mock.md).

`src/mocks/notificaciones.js` simula `GET /notificaciones` y `PATCH /notificaciones/{id}/leida`
(cliente `src/api/notificacionesApi.js`). Ejecutar o cancelar una orden crea su notificación.
Consola: `window.__mock.notificaciones.crear()`, `.mercado("NYSE", false)` y `.noLeidas()`.

Desde la consola del navegador (`npm start`): `window.__mock.ordenes.mercado(false)` (cierra el
mercado), `.ejecutarPendientes()`, `.ejecutarParcial()`, `.estado(id, "ENVIADA")`,
`.fallar("PROVEEDOR_NO_DISPONIBLE")`, `.latencia(2000)` y `.limpiar()`. Cuenta con órdenes de ejemplo: `laura@`; estado vacío: `nuevo@`.

**Cambiar entre mock y API real:** no hay código que tocar, solo el comando. `npm start` usa el
mock (`.env.mock`, `VITE_USE_MOCK=true`); `npm run dev` usa el backend definido en
`VITE_API_BASE_URL` / `VITE_PROXY_TARGET`.

## Calidad y CI

`.github/workflows/ci.yml` ejecuta en cada push y en cada PR a `main`: **lint → build → pruebas**.
Si cualquiera falla, el check queda en rojo. Para que además **bloquee el merge**, el repositorio
debe tener una regla de protección de `main` que exija el check «Lint, build y pruebas»
(Settings → Branches → Branch protection rules → _Require status checks to pass_).

`format:check` no está en el CI todavía porque varios archivos previos no están formateados con
Prettier; los archivos nuevos sí lo están.

## Stack

- React 18 + Vite · React Router 6
- CSS Modules + variables CSS (design tokens) · Tipografía Manrope
- Vitest + Testing Library · MSW · ESLint + Prettier

## Estructura

```
src/
├─ api/          # httpClient (interceptores), http (instancia), ApiError, errorMessages, *Api.js
├─ auth/         # session (tokens), AuthContext (login + MFA), roles
├─ config/       # env.js (variables VITE_*)
├─ layout/       # AppShell (marco de pantallas autenticadas)
├─ mocks/        # servidor mock (MSW): db, handlers, browser, server
├─ routes/       # routesConfig (rutas y roles), ProtectedRoute, AppRoutes
├─ pages/        # Dashboard, Login, Verification, InvestmentProfile, StatusPage
├─ components/   # layout, sections, dashboard, order, verification, ui
├─ data/         # datos de ejemplo del panel y catálogos
├─ theme/        # ThemeContext, ThemeSwitcher
└─ styles/       # tokens.css, themes.css, global.css
```

## Temas de color (3 paletas, sin azules)

Paletas intercambiables en tiempo real con el selector «Tema: …»:

1. **Esmeralda Tradicional** (por defecto)
2. **Verde Neón**
3. **Verde Bosque**

- `styles/themes.css` — cada paleta redefine las mismas variables bajo `[data-theme="..."]`.
- `theme/ThemeContext.jsx` — aplica `data-theme` en `<html>` y persiste la elección.
- `theme/ThemeSwitcher.jsx` — selector con vista previa.

Los componentes no usan colores fijos: consumen variables CSS (`--color-brand`, `--color-surface`,
etc.). El cliente pidió un diseño más moderno **sin azul**, por eso se retiró «Azul Cobalto» y los
neutros pasaron de tonos azulados a tonos cálidos. Para añadir una paleta, agrega un bloque
`[data-theme="..."]` en `themes.css` y una entrada en `THEMES`.

## Creación de órdenes (trading)

Componente `OrderForm` (en `components/order/`), integrado en el panel `#/panel`.
Se divide en:

- **OrderTypeSelector** — tabs: Market / Limit / Stop Loss / Take Profit.
- **OrderSummary** — desglose de total, comisión y alerta de fondos.
- **OrderForm** — orquesta estado y reglas de negocio.
- **orderUtils** — funciones puras: `calculateOrder`, `formatCurrency`, etc.

Reglas implementadas:

- **Market Order** oculta el input de precio y usa el precio actual del activo.
- **Calculadora en tiempo real**: Total (precio × cantidad) y Comisión (2% del total).
- **Validación de fondos**: recibe `saldoDisponible`; si `Total + Comisión`
  supera el saldo, deshabilita el botón y muestra una alerta visual.
- **Mercado cerrado**: con `isMarketOpen={false}` muestra un banner y el botón
  cambia de "Ejecutar Orden" a "Encolar Orden".

Importación directa en el dashboard:

```jsx
import OrderForm from "../components/order/OrderForm.jsx";

<OrderForm
  asset={{ symbol: "AAPL", name: "Apple Inc.", currentPrice: 176.5 }}
  saldoDisponible={4250.0}
  isMarketOpen={true}
  onSubmit={(order) => enviarOrden(order)}
/>;
```

`onSubmit` recibe el payload listo para el API:

```js
{
  symbol: "AAPL",
  side: "buy",          // "buy" | "sell"
  type: "limit",        // market | limit | stop | take
  quantity: 10,
  price: 176.5,
  subtotal: 1765.0,
  commission: 35.3,     // 2%
  total: 1800.3,
  queued: false         // true cuando el mercado está cerrado
}
```

## Interactividad

El estado de los elementos del mockup se maneja con `useState` en
`InvestmentProfilePage`:

- **Nivel de experiencia** y **comisionista**: selección única (radio).
- **Mercados**, **sectores** y **notificaciones**: multi-selección (toggle).
- **Plan**: selección única.
- **Crear cuenta y continuar**: dispara `onSubmit` con estado de carga.

```

```

## Marca

El logo aprobado por el cliente vive en `src/assets/marca/` (PNG con fondo transparente: `logo-horizontal`, `logo-completo`, `isotipo`) y se usa siempre a través del componente `src/components/marca/Logo.jsx`. Los íconos de la pestaña (`favicon-32.png`, `apple-touch-icon.png`) están en `public/`. El logo tiene tintas oscuras: sobre fondos oscuros va dentro de una placa clara (ver `BrandHero`).

## Pruebas de extremo a extremo (Playwright)

`npm run test:e2e` levanta la app en modo mock y recorre en un navegador real: login con MFA (errores, bloqueos, código vencido), rutas protegidas, cierre de sesión, renovación del token y portafolio, en escritorio y móvil. La primera vez ejecuta `npx playwright install chromium`. Si ya tienes Chrome, define `PW_CHROMIUM_PATH` con su ruta. Las pruebas unitarias (`npm test`) no incluyen la carpeta `e2e/`.
