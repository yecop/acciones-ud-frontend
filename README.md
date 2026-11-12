# Acciones UD — Interfaz web

Interfaz web de la plataforma de day trading **Acciones UD**, implementada en
**React** a partir de los mockups de Figma, con **CSS Modules** y tokens de
diseño para un layout responsivo.

## Pantallas

| Ruta (hash)       | Pantalla                              |
| ----------------- | ------------------------------------- |
| `#/panel`         | Panel principal (dashboard de trading) |
| `#/portafolio`    | Mi dinero y mis posiciones (SCRUM-25)  |
| `#/perfil`        | Perfil de inversión (onboarding paso 2) |
| `#/verificacion`  | Verificación en dos pasos (OTP)        |

La navegación usa un router ligero basado en hash en `App.jsx` (sin dependencias
extra). El botón "Nueva orden" del panel enlaza al perfil y, al enviar el perfil,
se pasa a la verificación; al verificar, se vuelve al panel.

## Stack

- React 18 + Vite
- CSS Modules + variables CSS (design tokens)
- Tipografía Manrope (Google Fonts)

## Primeros pasos

```bash
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # build de producción
npm run preview  # previsualiza el build
```

## Estructura

```
src/
├─ App.jsx                      # Raíz + router por hash; integración al API Gateway
├─ main.jsx                     # Punto de entrada
├─ data/
│  ├─ dashboardData.js          # Datos del panel (forma del JSON del API)
│  └─ investmentProfileData.js  # Catálogos del perfil de inversión
├─ pages/
│  ├─ DashboardPage.*           # Panel principal
│  ├─ InvestmentProfilePage.*   # Perfil de inversión
│  └─ VerificationPage.*        # Verificación OTP
├─ components/
│  ├─ layout/                   # Header, Stepper, Card
│  ├─ sections/                 # Secciones del perfil de inversión
│  ├─ dashboard/                # TopNav, KpiCards, PriceChartCard,
│  │                            # MarketsCard, Watchlist, ActivityCard
│  ├─ order/                    # OrderForm, OrderTypeSelector, OrderSummary,
│  │                            # orderUtils (lógica de negocio)
│  ├─ verification/             # BrandHero, OtpInput, VerificationForm
│  └─ ui/                       # Primitivas: RadioCard, Chip, CheckboxCard, Icons
└─ styles/
   ├─ tokens.css                # Colores, tipografía, espaciados, radios
   └─ global.css                # Reset y estilos base
```

## Integración con el API Gateway

Los componentes reciben todos sus datos vía **props**, por lo que están listos
para consumir información del API Gateway (REST/JSON).

El objeto `investmentProfileData` define la forma esperada de la respuesta.
Para conectar el backend:

```jsx
// Carga de catálogos
const res = await fetch("/api/onboarding/investment-profile");
const data = await res.json();

<InvestmentProfilePage data={data} onSubmit={enviarPerfil} onBack={volver} />
```

`onSubmit` recibe el perfil armado desde el estado del formulario:

```js
{
  experienceLevel: "beginner",
  markets: ["nyse", "nasdaq"],
  sectors: ["tech"],
  broker: "carlos",
  notifications: ["email", "whatsapp"],
  plan: "basic"
}
```

## Temas de color (4 paletas)

La app incluye 4 paletas intercambiables en tiempo real mediante un selector
("Tema: …") presente en el panel, el perfil y la verificación:

1. **Esmeralda Tradicional** (por defecto)
2. **Verde Neón**
3. **Azul Cobalto**
4. **Verde Bosque**

Implementación:

- `styles/themes.css` — cada paleta redefine las mismas variables de color
  bajo un selector `[data-theme="..."]`.
- `theme/ThemeContext.jsx` — proveedor que aplica `data-theme` en `<html>` y
  persiste la elección en `localStorage`.
- `theme/ThemeSwitcher.jsx` — selector con vista previa de cada paleta.

Los componentes no usan colores fijos: todos consumen las variables CSS
(`--color-brand`, `--color-surface`, etc.), por lo que cambian de tema sin
tocar su código. Para añadir una paleta nueva basta con agregar un bloque
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
/>
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

## Mi dinero y mis posiciones (SCRUM-25)

Vista `#/portafolio` (`pages/PortafolioView.jsx`) que muestra el saldo del
usuario, el resumen del portafolio y el detalle de posiciones, consumiendo la
API del backend. Todos los montos llegan como texto con 2 decimales.

Componentes (en `components/portafolio/`):

- **SaldoWidget** — dinero disponible, reservado y total.
- **PortafolioResumen** — valor total, costo invertido, ganancia/pérdida y rendimiento.
- **PosicionesTable** — tabla con activo, cantidad, precio de compra, precio
  actual, valor actual, G/P y porcentaje. Incluye estado de portafolio vacío.
- **portafolioUtils** — funciones puras (`formatCurrency`, `formatPercent`,
  `toneFromValue`) con pruebas en `portafolioUtils.test.js`.

Servicio (`services/portafolioApi.js`) con `fetch` hacia los 3 endpoints:

| Función                   | Endpoint                          |
| ------------------------- | --------------------------------- |
| `fetchSaldo`              | `GET /api/v1/cuenta/saldo`        |
| `fetchResumenPortafolio`  | `GET /api/v1/portafolio`          |
| `fetchPosiciones`         | `GET /api/v1/portafolio/posiciones` |

La vista maneja estados de **carga**, **error** (con reintentar) y **portafolio
vacío** (usuario nuevo). En desarrollo, `vite.config.js` hace proxy de `/api`
hacia el backend en `http://localhost:8080`, así que basta con levantar primero
el backend y luego `npm run dev`.
