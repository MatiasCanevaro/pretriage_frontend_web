# Plan de endurecimiento de autenticación

## Estado provisional aceptado

El flujo implementado para desarrollo es:

```text
Formulario web
  -> POST /api/auth/login de Next.js
  -> POST /api/login de Spring Boot
  -> Password Realm de Auth0
  -> ID token
  -> cookie HttpOnly de Next.js
  -> llamadas BFF con Authorization: Bearer
```

Las credenciales sólo atraviesan el servidor de Next.js y Spring Boot durante
el login. No se guardan. El token no se entrega a componentes React, no se
escribe en localStorage y no debe aparecer en logs, URLs ni analítica.

Este flujo no está aprobado para producción.

## Riesgos conocidos

1. Spring devuelve un ID token y el frontend lo usa como bearer de la API. Un
   ID token prueba autenticación para el cliente; la API debe recibir un access
   token destinado a su audience.
2. El grant Password Realm hace que la aplicación manipule directamente la
   contraseña y limita MFA, SSO y recuperación gestionada por Universal Login.
3. La cookie contiene el JWT sin una capa propia de cifrado o una sesión
   opaca del servidor.
4. No hay renovación, rotación ni revocación de sesión. Al expirar el token se
   exige un nuevo login.
5. Proxy sólo comprueba presencia de cookie. La autorización real depende del
   backend, pero el chequeo optimista no valida la sesión.
6. El decoder de Spring valida issuer pero debe validar explícitamente el
   audience de la API.
7. Falta definir rate limiting, protección CSRF completa y auditoría segura del
   endpoint de login.

## Contrato backend objetivo

Manteniendo temporalmente el formulario propio, cambiar `POST /api/login`
para devolver:

```json
{
  "accessToken": "<access-token>",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

Requisitos:

- Solicitar a Auth0 un access token con audience `http://localhost:8080`.
- No devolver ni aceptar un ID token como autorización de la API.
- Validar issuer, firma, expiración y audience en Spring Security.
- Responder `401` con un cuerpo genérico para credenciales inválidas.
- No incluir credenciales ni tokens en excepciones o logs.
- Añadir pruebas que demuestren que un ID token y un token con audience
  incorrecta son rechazados.

## Sesión frontend objetivo

Elegir una de estas alternativas, en este orden de preferencia:

1. Volver a Auth0 Universal Login con Authorization Code + PKCE y una
   aplicación Regular Web.
2. Si se conserva el login propio, crear una sesión opaca del lado servidor:
   el navegador recibe sólo un identificador aleatorio y el access/refresh
   token queda cifrado en un almacén de sesiones.
3. Como transición corta, cifrar y firmar una cookie de sesión con
   `iron-session` o `jose`, usando un `SESSION_SECRET` rotatable.

La sesión debe:

- Tener expiración alineada con el access token.
- Renovarse sólo mediante refresh token rotation del lado servidor.
- Revocarse y eliminarse al cerrar sesión.
- Usar `HttpOnly`, `Secure` en HTTPS, `SameSite=Lax` o más estricto y
  `Path=/`.
- No exponer access ni refresh tokens a componentes cliente.

## Controles adicionales

- Verificar Origin y añadir protección CSRF para mutaciones autenticadas.
- Aplicar rate limiting por cuenta e IP al login.
- Mantener mensajes genéricos para evitar enumeración de usuarios.
- Configurar HTTPS, HSTS, CSP y encabezados de seguridad en producción.
- Impedir cache de respuestas de autenticación y datos clínicos.
- Auditar éxito/fallo sin email completo, contraseña ni token.
- Rotar las credenciales que hayan sido compartidas o expuestas.

## Orden sugerido para el siguiente agente

1. Corregir el DTO y servicio de login del backend para devolver access token.
2. Agregar validación de audience y pruebas de seguridad en Spring.
3. Actualizar el BFF para consumir el nuevo contrato.
4. Implementar sesión cifrada u opaca, expiración y logout.
5. Incorporar refresh rotation o migrar a Universal Login.
6. Añadir CSRF, rate limiting y encabezados de producción.
7. Ejecutar pruebas E2E de login válido, inválido, expirado, logout y acceso
   cruzado entre recepción y medicina.

## Criterio de cierre

La deuda queda resuelta cuando el navegador nunca recibe tokens OAuth, la API
rechaza ID tokens y audiences incorrectas, las sesiones expiran y se revocan,
las credenciales no aparecen en almacenamiento o logs y las pruebas de
autorización por rol/propiedad pasan de extremo a extremo.
