# Design

## Context

`/admin/hospital` hoy es una sola página cliente con secciones por ancla y un único BFF `POST /api/staff/admin` orientado a mutaciones ("operations" en el body). El endpoint backend de métricas existe y está verificado contra el OpenAPI en vivo (`metricas-hospital-controller`), pero el snapshot `contracts/pretriage-openapi.json` (2026-09-21) es anterior a él, así que el refresco de contrato es prerrequisito de cualquier código. El mapa etiqueta/clase por nivel de gravedad está duplicado en `features/reception/reception-workspace.tsx` y `features/doctor/doctor-workspace.tsx`; la vista de métricas sería su tercera aparición. `lib/api/server.ts` ya ofrece `backendRequest` con token de sesión server-side, `AbortSignal.timeout(60_000)` y errores normalizados (`BackendApiError` + `safeMessage` que filtra detalles técnicos). El proyecto no tiene dependencias de charts y TanStack Query es el dueño del estado remoto. La primera versión de la vista ya está implementada; el feedback de uso detectó que el botón Consultar no se lee como acción primaria, que los fondos pastel de los chips no funcionan como relleno de barras y que hace falta una lectura vertical con detalle por barra.

Constraints relevantes (AGENTS.md / docs): los tokens y datos de identidad nunca van a localStorage, logs ni URLs; solo los borradores de triage de recepción usan sessionStorage; disable-while-pending y refetch autoritativo después de cada mutación; Server Components por defecto.

## Goals / Non-Goals

**Goals:**

- Vista dedicada de métricas accesible para admins `ADMIN_HOSPITAL` de su hospital, con consulta por calendario y estado en la URL.
- Un BFF de lectura (GET) que reutilice `backendRequest` y el manejo de errores existente, sin duplicar transporte.
- Presentación accesible y sin dependencias nuevas: KPIs, distribuciones por gravedad, pretriage y serie diaria.
- Extraer `lib/severity.ts` (etiquetas, orden de niveles y clases de color) y reusarlo en recepción, médico y métricas.
- Refresco del snapshot OpenAPI + tipos generados + docs, como primer paso del trabajo.
- Jerarquía visual clara: el botón Consultar se lee como acción primaria y las barras de gravedad tienen colores sólidos con contraste.
- Dos modos de lectura por sección: horizontal con tabla y barras, y vertical con columnas interactivas y detalle por barra.

**Non-Goals:**

- Cambios en el backend (endpoint ya disponible; verificaciones se hacen contra el backend que corre).
- Comparación explícita entre períodos (deltas, paneles lado a lado, A vs B): la comparabilidad es implícita por misma estructura + consulta sucesiva, según lo decidido con el usuario.
- Presets de rangos (hoy/7d/30d/mes): el formulario es puramente calendario, ambos campos obligatorios.
- Exportación (CSV/PDF), desglose por sala o especialidad, y actualizaciones en tiempo real.
- Mutaciones de cualquier tipo: la vista es de solo lectura.
- Persistir la orientación de los gráficos en la URL o en almacenamiento del navegador.
- Tooltips, hovercards o librerías de charts: el detalle es un panel persistente y accesible.

## Decisions

1. **Ruta dedicada** `/admin/hospital/metricas` en lugar de sección ancla de la página admin.

   Alternativa descartada: sección dentro de `/admin/hospital`. La página admin ya carga bootstrap de personal/invitaciones/auditoría/configuración; sumar un flujo con estado de fechas la alarga y las fechas no tendrían URL compartible. Con ruta dedicada, la consulta queda deep-linkable (`?desde=&hasta=`) y la landing admin no cambia.

2. **Composición de la página:** Server Component en `app/admin/hospital/metricas/page.tsx` espejando `app/admin/hospital/page.tsx`: resuelve sesión, `getStaffContext()` y la membresía con rol `ADMIN_HOSPITAL` que coincida con `searchParams.hospitalId`; si el hospital indicado no coincide con ninguna membresía admin, o la sesión no tiene el rol en ese hospital, redirige a `/`. Si la ruta no trae `hospitalId`, NO redirige: renderiza un panel con mensaje claro de hospital faltante y el camino para elegirlo (Administración). Pasa `hospitalId`, `hospitalName`, `desde`, `hasta` y `usuario` al panel cliente en `features/admin/`. El matcher de `proxy.ts` ya cubre `/admin/:path*`, no requiere cambio.

3. **Diseño BFF de lectura (GET):** Nueva ruta `app/api/staff/admin/metricas/route.ts` con `GET`: valida solo la forma (`hospitalId` entero positivo; `desde`/`hasta` presentes con formato `yyyy-MM-dd`). Las reglas de negocio del rango (orden y fechas respecto de hoy) las valida el backend, que responde `400` con mensaje descriptivo que la UI exhibe como aviso. Reenvía a `/api/admin/hospitales/{id}/metricas?desde&hasta` vía `backendRequest` con el access token de sesión y mapea errores con `apiErrorResponse`; además sobreescribe el texto heredado del 504 ("...sin perder el borrador") por uno aplicable a métricas ("La operación tardó demasiado. Reintentá la consulta."), porque aquí no hay borrador.

   Alternativa descartada: `operation: "metricas"` dentro del POST multiplexado. La consulta de métricas es una lectura con query params y no una mutación: GET es semántica correcta, cacheable por TanStack y compatible con el reintento manual. `backendRequest` ya abstrae token, timeout 60 s y normalización de errores, así que la ruta nueva queda contenida en pocas líneas.

4. **Estado de la consulta:** Panel cliente con TanStack `useQuery({ queryKey: ["admin-metricas", hospitalId, desde, hasta], enabled: ambas fechas presentes })`. Las fechas provienen de los search params del servidor (página) para la carga inicial y, al consultar, el panel hace `router.replace` con las fechas normalizadas y re-consulta. Carga sin fechas → `enabled: false` y panel vacío con instrucción; recarga con fechas → consulta automática. La disciplina disable-while-pending aplica al botón Consultar.

   Fechas en la URL normalizadas como `YYYY-MM-DD` construidas con partes de fecha local (`getFullYear/getMonth/getDate`), nunca `toISOString()` (cortes por UTC que corren el día en AR timezone). Validaciones del formulario con zod + `react-hook-form` (patrón ya presente en el repo): `desde.obligatorio`, `desde < hoy` (estricto), `hasta.obligatorio`, `hasta <= hoy`, `hasta >= desde`. Los errores correspondientes se muestran en rojo debajo del campo que los origina.

   El panel valida los parámetros de la URL con esas mismas reglas: parámetros inválidos se muestran en rojo debajo del campo correspondiente y no disparan consulta; parámetros válidos llegan precargados en el formulario y consultan automáticamente. `router.replace` al consultar conserva el `hospitalId` presente. Política de frescura: rangos con `hasta` anterior a hoy quedan con `staleTime` infinito (sin reconsulta automática) y rangos con `hasta` = hoy reconsultan cada 60 minutos (`refetchInterval: 3_600_000`), actualizando en segundo plano sin vaciar la vista. La consulta inicial muestra indicador de carga (spinner o mensaje).

5. **Dos modos de lectura sin gráficos externos:** La vista horizontal conserva la tabla accesible con barras horizontales por fila: distribuciones con columnas Gravedad/Casos/Porcentaje y barra; serie con Fecha/Ingresados/Atendidos/Espera y par de barras. La vista vertical reemplaza la tabla por un gráfico de columnas interactivo por sección. Cada barra de distribución y cada grupo diario de la serie es un botón que contiene las barras visuales y la etiqueta; su nombre accesible incluye los valores. Sin selección, el panel muestra el mensaje para seleccionar una barra; al seleccionar, muestra el detalle (gravedad/casos/porcentaje o fecha/ingresados/atendidos/espera) y el botón queda con `aria-pressed`. El contenedor del gráfico permite scroll horizontal con foco para rangos largos. La tabla no se renderiza en la vista vertical: los nombres accesibles y el panel con `aria-live` conservan la información. Los porcentajes siguen truncados; los conteos usan es-AR; las fechas de tabla usan `dd/MM/yyyy` y las etiquetas del eje vertical usan `dd/MM` con la fecha completa en el detalle.

   Alternativa descartada: librería de charts (recharts/visx). El repo evita dependencias de UI y la data es proporcionalmente simple (barras de 6 categorías y N días).

   Alternativa descartada: tooltip o hovercard para el detalle. No es accesible por teclado ni para lectores de pantalla y desaparece al mover el puntero; el panel persistente con `aria-live` es más robusto.

   Alternativa descartada: mantener la tabla también en la vista vertical. El usuario pidió una vista de gráfico con detalle por barra; la tabla se reemplaza y la accesibilidad se cubre con los nombres accesibles de cada botón.

6. **Módulo compartido de niveles de gravedad:** `lib/severity.ts` con `NIVEL_GRAVEDAD_LABELS`, `NIVEL_GRAVEDAD_CLASS`, orden canónico `NIVELES_GRAVEDAD_BOT` (5 niveles) y `NIVELES_GRAVEDAD_MEDICO` (mismo orden + `SIN_REVISION` siempre última). El formateo (es-AR, porcentaje truncado a parte entera, fechas `dd/MM/yyyy`) vive en `features/admin/hospital-metrics.ts`, no en este módulo. Refactor mecánico de los mapas inline en recepción y médico para importarlo (sin cambios de comportamiento; typecheck/lint/build lo guarda).

7. **Navegación:** En el shell admin, "Métricas" como link real dentro de `sidebar-section-links` visibles desde ambas páginas del módulo: en `/admin/hospital` se inserta un item de link (marcado con `aria-current` cuando esté activo en su página propia); `/admin/hospital/metricas` pasa su propio `sectionNavigation` con link de vuelta "Administración" + anclas in-page (Resumen, Distribuciones, Serie diaria). Los headers: `aria-current="location"` solo sobre la página correspondiente. Interpretación con la que se implementó (registrada tras la verificación): el link "Métricas" solo se renderiza dentro del sidebar de `/admin/hospital`, por lo que nunca es la ubicación activa y ahí no lleva `aria-current`; en `/admin/hospital/metricas` el estado corriente lo llevan las anclas propias de la página (primera por defecto, siguiendo `aria-current="location"` al hash vigente), y el link de vuelta "Administración" nunca está marcado. Esta decisión actualiza la convención del sidebar documentada en `docs/development.md`.

8. **Contrato primero:** Bajar `v3/api-docs` a `contracts/pretriage-openapi.json`, validar JSON, `npm run contracts:generate`, y actualizar `docs/backend-contract.md` (sección "Metrics contract" con la ruta, params y response esquema + snapshot date/SHA). Las verificaciones contra el backend que no puedo confirmar desde esta máquina quedan como tareas explícitas: (a) límite de extensión de rango / forma exacta del 400 en `desde > hasta` - verificado en vivo; (b) `exigirAdminHospital` activo en el endpoint - se prueba con un admin válido y se confirma el 403 para otro hospital.

9. **Colores sólidos acotados a métricas:** Los chips de prioridad de recepción y médico conservan sus fondos suaves. Para las barras de métricas se agrega una clase de relleno compartida (`metrics-fill`) que aplica colores sólidos de la paleta existente: crítico rojo, urgente ámbar, normal azul, no urgente verde y sin revisión gris neutro. La clase de relleno solo define el `background`; el texto de la etiqueta conserva el color de tinta del sistema. Las reglas se acotan a `.metrics-fill.priority-*` para no alterar el significado visual de `.priority-*` en el resto de la aplicación.

   Alternativa descartada: cambiar los fondos de `.priority-*` globalmente. Afectaría los chips de prioridad de recepción y médico, donde el fondo suave con texto oscuro es el patrón correcto.

10. **Estado de orientación local por sección:** Distribuciones y Serie diaria mantienen su propio estado `horizontal | vertical` con `useState`, con horizontal como valor inicial. El control muestra la orientación de destino (`Cambiar vista a vertical` o `Cambiar vista a horizontal`). No se persiste en la URL, `localStorage` ni `sessionStorage`: el proyecto solo permite `sessionStorage` para borradores de triage de recepción. Alternar no cambia la query key ni dispara una consulta; al desmontar el gráfico se limpia la selección. La orientación se conserva al reconsultar mientras la página siga abierta. Los componentes de gráfico se montan con una clave que incluye el rango consultado, de modo que la selección se limpia al cambiar de rango incluso si hay datos cacheados.

    Alternativas descartadas: parámetro de URL (el usuario no pidió compartir la orientación y la URL ya está reservada a `hospitalId`, `desde` y `hasta`); estado global compartido (el usuario eligió que cada sección alterne por separado).

11. **Accesibilidad de la vista vertical sin tabla:** Cada barra de distribución y cada grupo diario de la serie se renderiza como un `<button>` que contiene las barras visuales y la etiqueta. El nombre accesible incluye los valores (`casos`/`porcentaje` o `fecha`/`ingresados`/`atendidos`/`espera`). El botón usa `aria-pressed` para el estado seleccionado y se activa con mouse, Enter o Espacio. El detalle vive en una región `aria-live="polite"` con `aria-atomic="true"`; sin selección, la misma región muestra el mensaje que invita a seleccionar una barra. Las barras con valor cero siguen siendo seleccionables porque el botón ocupa la columna completa. El contenedor con scroll horizontal es enfocable y tiene nombre accesible.

    Alternativa descartada: tooltip o hovercard. No es accesible por teclado ni para lectores de pantalla. La tabla se elimina del DOM en vertical por decisión del usuario; los nombres accesibles y el panel de detalle son la representación alternativa.

12. **Botón Consultar como acción primaria:** Se reutiliza `button button-primary` del sistema de diseño existente; no se crea una variante nueva. El estado `disabled` durante la consulta se conserva. Alternativa descartada: una clase propia para métricas, que duplicaría el estilo azul ya definido.

## Risks / Trade-offs

- [Snapshot OpenAPI puede volver a quedar desactualizado entre el refresh y el implement] → los tasks ubican el refresh como primer paso y la última tarea re-corre `npm run typecheck` contra los tipos recién generados. El comando de drift en CI sigue siendo deuda documentada en `docs/backend-contract.md` y no se amplía aquí.
- [Techo de rango del backend desconocido desde esta máquina] → la UI muestra el mensaje del backend (`safeMessage` filtra detalles técnicos) y las tareas incluyen un caso de prueba en vivo para documentar la restricción real en `docs/backend-contract.md`.
- [Refactor de severidad toca recepción y médico] → cambio mecánico de mapas por import; `npm run typecheck` + `lint` + `build` y el navegador en las dos vistas existentes son el guard.
- [Errores de zona horaria con input date] → nunca derivar la fecha de hoy con `toISOString()`: partes locales explícitas; la verificación es manual en navegador cubriendo `desde = hoy` (rechazado) y `hasta = hoy` (aceptado). No hay suite de tests automatizados para esto.
- [Días sin atenciones dentro del rango] → el spec define "0" para conteos y "-" para promedios; la vista renderiza la serie tal como llega del backend y la tarea 1.3 verifica en vivo que la entrega completa e inclusive con días-cero; si el backend omitiera días se ajusta en la implementación, sin rellenar en el cliente.
- [Porcentaje truncado a parte entera] → los anillos pueden no sumar exactamente 100 entre niveles; el truncado es regla de presentación decidida, no se re-normaliza en el cliente.
- [El shell admin ancla navegación mixta de links y anclas] → el link "Métricas" convive mediante `aria-current` y la división visual existente; a11y verificado con teclado (nav ya maneja focus).
- [La vista vertical elimina la tabla] → es una decisión explícita del usuario. Mitigación: cada botón expone los valores en su nombre accesible, el panel de detalle usa `aria-live` y la verificación incluye teclado y lector de pantalla; el modo horizontal sigue ofreciendo la tabla completa.
- [Rangos largos en la serie vertical] → el gráfico usa un ancho mínimo por día, scroll horizontal y un contenedor enfocable; las etiquetas muestran `dd/MM` y el detalle la fecha completa. Verificar en desktop y mobile.
- [Colores sólidos con contraste insuficiente] → se usan los colores de la paleta existente y se acotan las reglas a `.metrics-fill`; la verificación visual cubre las cinco severidades y confirma que los chips de recepción/médico no cambiaron.
- [Selección obsoleta después de reconsultar] → la selección vive dentro de cada gráfico y los componentes se montan con una clave que incluye el rango consultado; así se limpia al cambiar de rango incluso si hay datos cacheados. La orientación se mantiene en el panel y no se toca la query key.

## Migration Plan

Frontend-only. Orden de despliegue seguro: (1) refresco de contrato y tipos, (2) `lib/severity.ts` + refactor de las dos vistas existentes (commit independiente, defendible con build), (3) BFF + página de métricas + navegación, (4) ajustes de presentación (botón primario, colores sólidos, alternancia y gráficos verticales), (5) docs. Rollback trivial por revert de los mismos commits; el backend no cambia y no hay migraciones de datos.

## Open Questions

Ninguna que frene la implementación: los dos unknown backend (techo de rango y `exigirAdminHospital`) están modelados como tareas de verificación en vivo y no alteran specs, approach ni task breakdown.
