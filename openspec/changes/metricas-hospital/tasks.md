# Tasks

## 1. Refresco de contrato y verificaciones contra el backend

- [ ] 1.1 Con el backend corriendo, exportar `http://localhost:8080/v3/api-docs` a `contracts/pretriage-openapi.json` (patrón de `docs/backend-contract.md#Refresh-the-snapshot`) y verificar que el archivo parsea como JSON y contiene la ruta `/api/admin/hospitales/{hospitalId}/metricas` con sus schemas `MetricasHospitalResponse`, `DistribucionNivelItem` y `SerieDiariaItem`
- [ ] 1.2 Ejecutar `npm run contracts:generate` y verificar que `contracts/pretriage-api.d.ts` incluye los tres schemas nuevos y que `npm run typecheck` sigue pasando
- [ ] 1.3 Con un admin válido en sesión, verificar en vivo contra el backend: rechazo para un hospital ajeno (403 con `exigirAdminHospital`), `desde > hasta` (forma y mensaje del 400) y techo de extensión de rango; registrar los hallazgos en `docs/backend-contract.md`
- [ ] 1.4 Actualizar `docs/backend-contract.md`: snapshot date, SHA-256, tamaño de paths/schemas y nueva sección "Metrics contract" con ruta, params, reglas de autorización observadas y forma de respuesta

## 2. Módulo compartido de niveles de gravedad

- [ ] 2.1 Crear `lib/severity.ts` con labels (`Riesgo vital inmediato`, `Muy urgente`, `Urgente`, `Normal`, `No urgente`, `Sin revisión`), clases (`priority-critical`/`urgent`/`normal`/`low` + neutra para `SIN_REVISION`), orden canónico bot (5 niveles) y médico (+`SIN_REVISION`), y helpers de formateo `Intl.NumberFormat("es-AR")` para conteos, porcentajes y minutos; verificar con `npm run typecheck`
- [ ] 2.2 Refactor mecánico de `features/reception/reception-workspace.tsx` para importar el mapa desde `lib/severity.ts` y verificar `npm run typecheck && npm run lint && npm run build` sin cambios visuales en la vista de recepción
- [ ] 2.3 Refactor mecánico de `features/doctor/doctor-workspace.tsx` para importar el mapa desde `lib/severity.ts` y verificar `npm run typecheck && npm run lint && npm run build` sin cambios visuales en la vista médica

## 3. BFF de lectura de métricas

- [ ] 3.1 Crear `app/api/staff/admin/metricas/route.ts` con `GET`: validar `hospitalId` (entero seguro positivo), `desde` e `hasta` (`yyyy-MM-dd`, `hasta >= desde`) con zod, reenviar por `backendRequest` a `/api/admin/hospitales/{hospitalId}/metricas?desde&hasta` y mapear errores con `apiErrorResponse` (401 de sesión, `BackendApiError` del resto)
- [ ] 3.2 Verificar con `npm run dev` y peticiones PowerShell: sin sesión devuelve 401; con params faltantes o inválidos devuelve 400 con el mensaje del BFF; con un admin válido y un rango válido devuelve el JSON de métricas sin filtrar bearer tokens en la respuesta

## 4. Página y vista de métricas

- [ ] 4.1 Crear `app/admin/hospital/metricas/page.tsx` (Server Component, `dynamic = "force-dynamic"`): sesión requerida, `getStaffContext()`, membresía `ADMIN_HOSPITAL` que coincida con `searchParams.hospitalId`, redirect a `/` en cualquier desvío, y paso de `hospitalId`, `hospitalName`, `desde` y `hasta` al panel cliente; verificar con browser que un admin entra y un intento con `hospitalId` ajeno redirige
- [ ] 4.2 Crear `features/admin/hospital-metrics.ts` (tipos de `MetricasHospitalResponse` desde el contrato generado, formateos es-AR, reglas de fecha) y `features/admin/hospital-metrics-panel.tsx` (cliente): formulario `desde`/`hasta` (`type="date"`), TanStack `useQuery` con key `["admin-metricas", hospitalId, desde, hasta]` y `enabled` solo con ambas fechas, `router.replace` de la URL al consultar y `disabled` en pending del botón Consultar; verificar con Next DevTools MCP `get_errors` sin errores en `/admin/hospital/metricas`
- [ ] 4.3 Implementar estado vacío con instrucción (carga sin params, sin llamadas de métricas), aviso `notice-error` con el mensaje del backend en fallos y persistencia de la consulta al recargar con `?desde&hasta`; verificar los tres casos en browser
- [ ] 4.4 Implementar los KPIs del período (ingresados a cola, atendidos, no atendidos, % atención, espera promedio, pretriage realizado/no realizado y %) con "-" en `esperaPromedioMinutos` null y formato `es-AR`; verificar contra la respuesta del backend local comparando los valores crudos
- [ ] 4.5 Implementar las distribuciones por gravedad (tabla con caption accesible + barras CSS `aria-hidden` por fila) en el orden del módulo compartido: bot con sus 5 niveles y médica con `SIN_REVISION` en color neutro; verificar conteos/porcentajes contra el backend y con teclado/lectores (foco y estructura de tabla)
- [ ] 4.6 Implementar la serie diaria del rango (tabla `fecha / ingresados / atendidos / espera promedio` + barras por día) con "0" en conteos y "-" en esperas ausentes, cubriendo ambos extremos del rango consultado; verificar con un rango que incluya días sin atenciones
- [ ] 4.7 Implementar las validaciones del formulario con zod + mensajes inline en español: `desde` obligatorio y estrictamente anterior a hoy, `hasta` obligatorio y `hasta <= hoy`, y `hasta >= desde`, sin envío si falla; verificar con `desde = hoy` (rechazado), rango invertido (rechazado) y día único anterior (aceptado)
- [ ] 4.8 Agregar los estilos (classes en `globals.css` o modules CSS siguiendo el lenguaje visual existente de panels y record-list) y verificar layout en desktop y mobile del shell con sticky sidebar

## 5. Navegación, docs y verificación integrada

- [ ] 5.1 Agregar "Métricas" como link real en la sidebar del módulo admin (visible desde `/admin/hospital`), y en la página de métricas un `sectionNavigation` con link de vuelta "Administración" + anclas in-page (Resumen, Distribuciones, Serie diaria) con `aria-current="location"` correcto en cada página; verificar navegación por teclado y los dos estados activos de la sidebar
- [ ] 5.2 Actualizar `docs/development.md`: nueva ruta de métricas, convención del sidebar admin (link real + anclas) y cómo verificar la vista; verificar que la doc coincide con la implementación
- [ ] 5.3 Pasada completa final: `npm run typecheck`, `npm run lint`, `npm run build`, Next DevTools MCP `get_errors` en `/admin/hospital/metricas` y `/admin/hospital`, y recorrido manual de los escenarios del spec (acceso ajeno, carga limpia, consulta válida, recarga con params, errores de fechas, error del backend, pendiente bloquea segundo envío)
