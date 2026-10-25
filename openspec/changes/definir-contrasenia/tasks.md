# Tasks

## 1. Validación y transporte

- [x] 1.1 Crear `features/auth/password-policy.ts` con el largo por punto de código, las reglas Unicode (`\p{Lu}`, `\p{Ll}`, `\p{Nd}`/especial con el `\s` ASCII de Java), la regla "distinta de la actual" y el listado ordenado de reglas para el checklist. Verificar con `npm run typecheck` y con casos manuales: `Abcdef1!` (válida), `abcdefg1` (sin mayúscula), `ABCDEFG1` (sin minúscula), `Abcdefgh` (sin número ni especial), 8 y 32 code points (válidas), 33 (inválida) y un emoji contado como un carácter.
- [x] 1.2 Extender `safeMessage` en `lib/api/server.ts` para tomar el primer valor string de un payload por campo cuando no hay `message` ni `error`, manteniendo los filtros de longitud y detalles técnicos. Verificar con `npm run typecheck` y con una llamada manual al BFF usando una contraseña nueva inválida: debe mostrarse la regla del backend y no el mensaje genérico.

## 2. BFF y contrato

- [x] 2.1 Crear `app/api/staff/account/password/route.ts`: validar `contraseniaActual` y `contraseniaNueva` con Zod (strings no vacíos, máximo 256), reenviar con `backendRequest` a `POST /api/auth/cambio-contrasenia/actual`, limpiar las tres cookies de sesión en el `200`, limpiar cookies también en un `401`, aplicar no-store y devolver errores con `apiErrorResponse` sin registrar el cuerpo. Verificar con `npm run typecheck` y, con una sesión activa, comprobar un `400` por contraseña actual incorrecta y un `423` con cuenta bloqueada.
- [x] 2.2 Actualizar `docs/backend-contract.md` con el flujo web, las formas reales de error (`{ error }` de servicio y mapas por campo de Bean Validation), el `423`, el cierre de cookies al éxito y la limitación de que no existe revocación de grant en el backend. Verificar que el documento coincida con la implementación y con el OpenAPI en vivo para este endpoint.

## 3. Página y formulario

- [ ] 3.1 Crear `app/cuenta/contrasena/page.tsx` como Server Component con `getSession()` y redirect a `/login` sin sesión, usando el card público y el brand existentes. Verificar que sin sesión redirige y que con sesión renderiza el formulario.
- [ ] 3.2 Crear `features/auth/password-change-form.tsx` con los campos actual/nueva/repetir, checklist en vivo, aviso estático de 3 intentos/24 h, submit deshabilitado por reglas/coincidencia/pending, `fetch` al BFF, mensajes de `400`/`423`, bloqueo visual en `423`, redirect en `401` y, al éxito, limpieza de caché/sessionStorage más `window.location.replace("/login?cambio=exito")`. Verificar manualmente: contraseña débil no llama al backend, contraseña igual a la actual no llama, repetición distinta no llama, y una contraseña válida con actual incorrecta muestra el mensaje del backend y limpia solo el campo actual.
- [ ] 3.3 Agregar los estilos del formulario, checklist, aviso y estados de error/bloqueo en `app/globals.css`, reutilizando las clases existentes cuando sea posible. Verificar visualmente en ancho de escritorio y móvil, y con `npm run lint`.
- [ ] 3.4 Mostrar el aviso de éxito en `app/login/page.tsx` cuando `cambio === "exito"`, leyendo `searchParams` como Promise. Verificar que `/login?cambio=exito` muestra el mensaje y que `/login` sin el flag no lo muestra.

## 4. Entradas y sesión

- [ ] 4.1 Agregar el enlace "Cambiar contraseña" en el `topbar-account` de `components/staff-shell.tsx`, junto a "Salir". Verificar que aparece y navega en `/recepcion`, `/medico` y `/admin/hospital`.
- [ ] 4.2 Agregar el mismo enlace en `acciones-admin-plataforma` de `features/admin/platform-admin-workspace.tsx`. Verificar que aparece y navega en `/admin/plataforma`.
- [ ] 4.3 Agregar `"/cuenta/:path*"` al matcher de `proxy.ts`. Verificar con `npm run build` y borrando la cookie de acceso pero conservando la de refresh: la página debe renovar la sesión y cargar en vez de redirigir al login.
- [ ] 4.4 Verificar que el formulario no ofrece botón "Volver" y que la salida funciona con el historial del navegador y con el enlace del header, según la decisión de producto.

## 5. Integración

- [ ] 5.1 Ejecutar `npm run typecheck`, `npm run lint` y `npm run build` sin errores. Verificar además con Next.js DevTools MCP que `get_errors` no reporte errores de configuración, build, runtime ni hidratación.
- [ ] 5.2 Con una cuenta descartable, recorrer el flujo completo: cambio exitoso (se cierran las cookies, el refresh token ya no está en el navegador, el login muestra el aviso y no se puede volver al formulario), contraseña actual incorrecta, contraseña débil bloqueada localmente, contraseña igual a la actual bloqueada localmente, y tres fallos consecutivos seguidos de un `423` con minutos restantes.
- [ ] 5.3 Verificar la sesión expirada: con el access token vencido y sin refresh válido, la página redirige a `/login`; con refresh válido, el proxy renueva y la página sigue operativa.
