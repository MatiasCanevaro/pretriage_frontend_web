# Design

## Context

`/admin/hospital` hoy es una sola página cliente con secciones por ancla y un único BFF `POST /api/staff/admin` orientado a mutaciones ("operations" en el body). El endpoint backend de métricas existe y está verificado contra el OpenAPI en vivo (`metricas-hospital-controller`), pero el snapshot `contracts/pretriage-openapi.json` (2026-09-21) es anterior a él, así que el refresco de contrato es prerrequisito de cualquier código. El mapa etiqueta/clase por nivel de gravedad está duplicado en `features/reception/reception-workspace.tsx` y `features/doctor/doctor-workspace.tsx`; la vista de métricas sería su tercera aparición. `lib/api/server.ts` ya ofrece `backendRequest` con token de sesión server-side, `AbortSignal.timeout(60_000)` y errores normalizados (`BackendApiError` + `safeMessage` que filtra detalles técnicos). El proyecto no tiene dependencias de charts y TanStack Query es el dueño del estado remoto.

Constraints relevantes (AGENTS.md / docs): los tokens y datos de identidad nunca van a localStorage, logs ni URLs; solo los borradores de triage de recepción usan sessionStorage; disable-while-pending y refetch autoritativo después de cada mutación; Server Components por defecto.

## Goals / Non-Goals

**Goals:**

- Vista dedicada de métricas accesible para admins `ADMIN_HOSPITAL` de su hospital, con consulta por calendario y estado en la URL.
- Un BFF de lectura (GET) que reutilice `backendRequest` y el manejo de errores existente, sin duplicar transporte.
- Presentación accesible y sin dependencias nuevas: KPIs, distribuciones por gravedad, pretriage y serie diaria.
- Extraer `lib/severity.ts` (etiquetas, orden de niveles y clases de color) y reusarlo en recepción, médico y métricas.
- Refresco del snapshot OpenAPI + tipos generados + docs, como primer paso del trabajo.

**Non-Goals:**

- Cambios en el backend (endpoint ya disponible; verificaciones se hacen contra el backend que corre).
- Comparación explícita entre períodos (deltas, paneles lado a lado, A vs B): la comparabilidad es implícita por misma estructura + consulta sucesiva, según lo decidido con el usuario.
- Presets de rangos (hoy/7d/30d/mes): el formulario es puramente calendario, ambos campos obligatorios.
- Exportación (CSV/PDF), desglose por sala o especialidad, y actualizaciones en tiempo real.
- Mutaciones de cualquier tipo: la vista es de solo lectura.

## Decisions

1. **Ruta dedicada** `/admin/hospital/metricas` en lugar de sección ancla de la página admin.

   Alternativa descartada: sección dentro de `/admin/hospital`. La página admin ya carga bootstrap de personal/invitaciones/auditoría/configuración; sumar un flujo con estado de fechas la alarga y las fechas no tendrían URL compartible. Con ruta dedicada, la consulta queda deep-linkable (`?desde=&hasta=`) y la landing admin no cambia.

2. **Composición de la página:** Server Component en `app/admin/hospital/metricas/page.tsx` espejando `app/admin/hospital/page.tsx`: resuelve sesión, `getStaffContext()` y la membresía con rol `ADMIN_HOSPITAL` que coincida con `searchParams.hospitalId`; si el hospital indicado no coincide con ninguna membresía admin, o la sesión no tiene el rol en ese hospital, redirige a `/`. Si la ruta no trae `hospitalId`, NO redirige: renderiza un panel con mensaje claro de hospital faltante y el camino para elegirlo (Administración). Pasa `hospitalId`, `hospitalName`, `desde`, `hasta` y `usuario` al panel cliente en `features/admin/`. El matcher de `proxy.ts` ya cubre `/admin/:path*`, no requiere cambio.

3. **Diseño BFF de lectura (GET):** Nueva ruta `app/api/staff/admin/metricas/route.ts` con `GET`: valida solo la forma (`hospitalId` entero positivo; `desde`/`hasta` presentes con formato `yyyy-MM-dd`). Las reglas de negocio del rango (orden y fechas respecto de hoy) las valida el backend, que responde `400` con mensaje descriptivo que la UI exhibe como aviso. Reenvía a `/api/admin/hospitales/{id}/metricas?desde&hasta` vía `backendRequest` con el access token de sesión y mapea errores con `apiErrorResponse`; además sobreescribe el texto heredado del 504 ("...sin perder el borrador") por uno aplicable a métricas ("La operación tardó demasiado. Reintentá la consulta."), porque aquí no hay borrador.

   Alternativa descartada: `operation: "metricas"` dentro del POST multiplexado. La consulta de métricas es una lectura con query params y no una mutación: GET es semántica correcta, cacheable por TanStack y compatible con el reintento manual. `backendRequest` ya abstrae token, timeout 60 s y normalización de errores, así que la ruta nueva queda contenida en pocas líneas.

4. **Estado de la consulta:** Panel cliente con TanStack `useQuery({ queryKey: ["admin-metricas", hospitalId, desde, hasta], enabled: ambas fechas presentes })`. Las fechas provienen de los search params del servidor (página) para la carga inicial y, al consultar, el panel hace `router.replace` con las fechas normalizadas y re-consulta. Carga sin fechas → `enabled: false` y panel vacío con instrucción; recarga con fechas → consulta automática. La disciplina disable-while-pending aplica al botón Consultar.

   Fechas en la URL normalizadas como `YYYY-MM-DD` construidas con partes de fecha local (`getFullYear/getMonth/getDate`), nunca `toISOString()` (cortes por UTC que corren el día en AR timezone). Validaciones del formulario con zod + `react-hook-form` (patrón ya presente en el repo): `desde.obligatorio`, `desde < hoy` (estricto), `hasta.obligatorio`, `hasta <= hoy`, `hasta >= desde`. Los errores correspondientes se muestran en rojo debajo del campo que los origina.

   El panel valida los parámetros de la URL con esas mismas reglas: parámetros inválidos se muestran en rojo debajo del campo correspondiente y no disparan consulta; parámetros válidos llegan precargados en el formulario y consultan automáticamente. `router.replace` al consultar conserva el `hospitalId` presente. Política de frescura: rangos con `hasta` anterior a hoy quedan con `staleTime` infinito (sin reconsulta automática) y rangos con `hasta` = hoy reconsultan cada 60 minutos (`refetchInterval: 3_600_000`), actualizando en segundo plano sin vaciar la vista. La consulta inicial muestra indicador de carga (spinner o mensaje).

5. **Presentación sin gráficos externos:** Los porcentajes se renderizan como anillos SVG puros (`stroke-dasharray`, sin dependencia) junto al número truncado a su parte entera (sin redondeo); el promedio de espera va como número en tarjeta KPI; las fechas se presentan en `dd/MM/yyyy` con helper local. Barras CSS (`aria-hidden` donde sean decorativas) junto a tablas accesibles con los números reales (`<table>` con caption para lectores de pantalla). Distribuciones como gráfico de barras (tabla con celda de barra por fila) en el orden Manchester: `RIESGO_VITAL_INMEDIATO, MUY_URGENTE, URGENTE, NORMAL, NO_URGENTE` (+ `SIN_REVISION` siempre última, solo en la médica, con color neutro); los niveles fuera del catálogo conocido se filtran y no se muestran. Serie diaria como tabla (`fecha dd/MM/yyyy`, `ingresados`, `atendidos`, `espera promedio`) más par de barras por día. Formateo de conteos y promedios con `Intl.NumberFormat("es-AR")` y "-" para nulos.

   Alternativa descartada: librería de charts (recharts/visx). El repo evita dependencias de UI y la data es proporcionalmente simple (barras de 6 categorías y N días).

6. **Módulo compartido de niveles de gravedad:** `lib/severity.ts` con `NIVEL_GRAVEDAD_LABELS`, `NIVEL_GRAVEDAD_CLASS`, orden canónico `NIVELES_GRAVEDAD_BOT` (5 niveles) y `NIVELES_GRAVEDAD_MEDICO` (mismo orden + `SIN_REVISION` siempre última). El formateo (es-AR, porcentaje truncado a parte entera, fechas `dd/MM/yyyy`) vive en `features/admin/hospital-metrics.ts`, no en este módulo. Refactor mecánico de los mapas inline en recepción y médico para importarlo (sin cambios de comportamiento; typecheck/lint/build lo guarda).

7. **Navegación:** En el shell admin, "Métricas" como link real dentro de `sidebar-section-links` visibles desde ambas páginas del módulo: en `/admin/hospital` se inserta un item de link (marcado con `aria-current` cuando esté activo en su página propia); `/admin/hospital/metricas` pasa su propio `sectionNavigation` con link de vuelta "Administración" + anclas in-page (Resumen, Distribuciones, Serie diaria). Los headers: `aria-current="location"` solo sobre la página correspondiente. Interpretación con la que se implementó (registrada tras la verificación): el link "Métricas" solo se renderiza dentro del sidebar de `/admin/hospital`, por lo que nunca es la ubicación activa y ahí no lleva `aria-current`; en `/admin/hospital/metricas` el estado corriente lo llevan las anclas propias de la página (primera por defecto, siguiendo `aria-current="location"` al hash vigente), y el link de vuelta "Administración" nunca está marcado. Esta decisión actualiza la convención del sidebar documentada en `docs/development.md`.

8. **Contrato primero:** Bajar `v3/api-docs` a `contracts/pretriage-openapi.json`, validar JSON, `npm run contracts:generate`, y actualizar `docs/backend-contract.md` (sección "Metrics contract" con la ruta, params y response esquema + snapshot date/SHA). Las verificaciones contra el backend que no puedo confirmar desde esta máquina quedan como tareas explícitas: (a) límite de extensión de rango / forma exacta del 400 en `desde > hasta` - verificado en vivo; (b) `exigirAdminHospital` activo en el endpoint - se prueba con un admin válido y se confirma el 403 para otro hospital.

## Risks / Trade-offs

- [Snapshot OpenAPI puede volver a quedar desactualizado entre el refresh y el implement] → los tasks ubican el refresh como primer paso y la última tarea re-corre `npm run typecheck` contra los tipos recién generados. El comando de drift en CI sigue siendo deuda documentada en `docs/backend-contract.md` y no se amplía aquí.
- [Techo de rango del backend desconocido desde esta máquina] → la UI muestra el mensaje del backend (`safeMessage` filtra detalles técnicos) y las tareas incluyen un caso de prueba en vivo para documentar la restricción real en `docs/backend-contract.md`.
- [Refactor de severidad toca recepción y médico] → cambio mecánico de mapas por import; `npm run typecheck` + `lint` + `build` y el navegador en las dos vistas existentes son el guard.
- [Errores de zona horaria con input date] → nunca derivar la fecha de hoy con `toISOString()`: partes locales explícitas; la verificación es manual en navegador cubriendo `desde = hoy` (rechazado) y `hasta = hoy` (aceptado). No hay suite de tests automatizados para esto.
- [Días sin atenciones dentro del rango] → el spec define "0" para conteos y "-" para promedios; la vista renderiza la serie tal como llega del backend y la tarea 1.3 verifica en vivo que la entrega completa e inclusive con días-cero; si el backend omitiera días se ajusta en la implementación, sin rellenar en el cliente.
- [Porcentaje truncado a parte entera] → los anillos pueden no sumar exactamente 100 entre niveles; el truncado es regla de presentación decidida, no se re-normaliza en el cliente.
- [El shell admin ancla navegación mixta de links y anclas] → el link "Métricas" convive mediante `aria-current` y la división visual existente; a11y verificado con teclado (nav ya maneja focus).

## Migration Plan

Frontend-only. Orden de despliegue seguro: (1) refresco de contrato y tipos, (2) `lib/severity.ts` + refactor de las dos vistas existentes (commit independiente, defendible con build), (3) BFF + página de métricas + navegación, (4) docs. Rollback trivial por revert de los mismos commits; el backend no cambia y no hay migraciones de datos.

## Open Questions

Ninguna que frene la implementación: los dos unknown backend (techo de rango y `exigirAdminHospital`) están modelados como tareas de verificación en vivo y no alteran specs, approach ni task breakdown.
