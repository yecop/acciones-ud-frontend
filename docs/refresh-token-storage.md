# Dónde guardar el refresh token (SCRUM-28)

Decisión pendiente de acordar con backend. Este documento resume la propuesta del front.

## Estado actual (provisional)

- Access token: solo en memoria.
- Refresh token, usuario y reto MFA: `sessionStorage` (`src/auth/session.js`).
- Riesgo: cualquier XSS puede leer `sessionStorage`. Se mitiga con TTL corto y rotación del refresh token.

## Propuesta: cookie `httpOnly`

El backend entrega el refresh token en una cookie y el JavaScript nunca lo ve.

| Aspecto | Propuesta |
| --- | --- |
| Atributos | `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` |
| Quién la fija | `POST /auth/mfa/verificar` y `POST /auth/refresh` (con rotación) |
| Quién la borra | `POST /auth/logout` (`Max-Age=0`) |
| Access token | Sigue en el cuerpo de la respuesta y en memoria del front |
| CSRF | `SameSite=Strict` + exigir cabecera propia (`X-Trace-Id` ya se envía) en `/auth/refresh` |
| CORS | Si front y API están en orígenes distintos: `Access-Control-Allow-Credentials: true` con origen explícito (nunca `*`). Lo más simple es servir ambos bajo el mismo origen con un proxy |

## Cambios en el front una vez acordado

1. `src/api/http.js`: el refresh usa `credentials: "include"` y no envía cuerpo.
2. `src/auth/session.js`: deja de guardar el refresh token; conserva solo una bandera no sensible `tieneSesion`.
3. `src/api/httpClient.js`: `getRefreshToken` se reemplaza por una comprobación de «hay sesión».
4. Mock: `/auth/refresh` lee y rota la cookie.

No se implementa hasta que backend confirme.

## Preguntas para backend

1. ¿Cookie `httpOnly` o el refresh token en el cuerpo de la respuesta?
2. Si es cookie: ¿mismo origen (proxy) o CORS con credenciales?
3. Si es cuerpo: ¿`/auth/refresh` recibe `{ "refreshToken": "..." }`?
4. Nombres exactos de los roles (el front asume INVERSIONISTA, COMISIONISTA, ADMINISTRADOR, LEGAL, JUNTA_DIRECTIVA).
5. ¿Reenviar el código reinicia su vigencia?
6. ¿Se puede elegir el canal del código (correo/SMS) al iniciar sesión?
7. Límites reales: intentos de código, intentos de login, espera de reenvío y duración del bloqueo (hoy son constantes en `src/auth/mfaConfig.js`).
