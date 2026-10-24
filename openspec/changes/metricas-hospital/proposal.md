# Proposal

## Why

Los administradores de hospital no tienen visibilidad sobre el funcionamiento operativo de su hospital: cuántos pacientes ingresaron, fueron atendidos, cuánto esperaron en promedio y cómo se distribuye la gravedad. El backend ya expone el endpoint `GET /api/admin/hospitales/{hospitalId}/metricas?desde&hasta` (verificado contra el OpenAPI en vivo), pero el snapshot de contrato del frontend (2026-09-21) es anterior al endpoint, así que la primera tarea obligatoria es refrescar el contrato. Esta historia de usuario cubre la consulta de métricas para identificar oportunidades de mejora en la atención y la gestión de colas y, tras la primera versión funcional, incorpora ajustes de claridad visual y una lectura vertical interactiva de los gráficos.

## What Changes

- Nueva ruta dedicada `/admin/hospital/metricas` para administradores `ADMIN_HOSPITAL` de su propio hospital (el `hospitalId` viene del contexto de membresía del servidor; el backend además exige admin del hospital; sin `hospitalId` la vista muestra un mensaje claro de hospital faltante en vez de redirigir).
- Formulario de consulta por calendario: `desde` (obligatorio, estrictamente `< hoy`) y `hasta` (obligatorio, `<= hoy`). Vista vacía hasta consultar; los errores de fechas inválidas (en el formulario o en un deeplink) se muestran en rojo debajo de cada input y no disparan consulta; al consultar, el rango queda en search params (`?desde=...&hasta=...`) y una recarga repite la consulta con el formulario precargado. Rangos con `hasta` = hoy se reconsultan cada una hora; los cerrados quedan cacheados. El botón `Consultar` usa el estilo de acción primaria del sistema, con fondo azul y texto claro, consistente con los demás botones primarios.
- Vista de un solo período: KPIs (ingresados, atendidos, % de atención, espera promedio), distribución por gravedad del bot (5 niveles) y del médico (con `SIN_REVISION`), pretriage realizado/no realizado con porcentaje, y serie diaria del período. La comparación entre períodos es implícita: reconsultar con otro rango muestra la misma estructura de vista, más la serie diaria como lectura de tendencia. Sin deltas ni dobles paneles.
- BFF de lectura nuevo: `GET /api/staff/admin/metricas?hospitalId&desde&hasta`, reenvío server-side con token (el navegador nunca recibe tokens) y validación de forma con zod; las reglas de negocio del rango las valida el backend y la UI muestra su `400` con mensaje descriptivo.
- Extraer `lib/severity.ts` con el mapa etiqueta/clase de color por nivel de gravedad (tercera aparición: hoy duplicado en recepción y médico) y usarlo desde la nueva vista.
- Visualización sin dependencias nuevas: anillos para los porcentajes con el número truncado a la parte entera, fechas en `dd/MM/yyyy` y gráficos construidos con HTML/CSS. La vista horizontal conserva la tabla accesible con barras horizontales por fila. La vista vertical reemplaza la tabla por un gráfico de columnas interactivo por sección: cada barra se puede seleccionar con mouse o teclado, hay un mensaje inicial que invita a seleccionar una barra y un panel de detalle con los números asociados (en la serie diaria, todos los datos del día). Cada sección tiene su propio control `Cambiar vista a vertical` / `Cambiar vista a horizontal`, la vista inicial es horizontal y alternar no reconsulta el backend ni modifica la URL. Las barras de gravedad usan colores sólidos con contraste, no los fondos suaves de los chips de prioridad. `SIN_REVISION` siempre queda última y los niveles de gravedad desconocidos no se muestran.
- Refresco de contrato: exportar `v3/api-docs` → `contracts/pretriage-openapi.json`, `npm run contracts:generate`, actualizar `docs/backend-contract.md` (nueva sección de métricas + fecha/SHA) y `docs/development.md` (ruta, navegación y modos de visualización).

## Capabilities

### New Capabilities

- `admin/hospital-metrics`: Consulta de métricas operativas del hospital propio por parte del administrador de hospital: acceso en cualquier momento, filtros por período con reglas de fecha, KPIs de atención y cola, distribución por gravedad, estadísticas de pretriage y serie diaria.

### Modified Capabilities

(ninguna — el proyecto no tiene specs anteriores)

## Impact

- **Código nuevo**: `app/admin/hospital/metricas/page.tsx`, página de servidor que resuelve membresía; `features/admin/hospital-metrics.ts` (tipos del contrato, formateos es-AR con porcentaje truncado a parte entera y fechas `dd/MM/yyyy`, reglas de fecha) y `features/admin/hospital-metrics-panel.tsx` (formulario, estados de carga, anillos, tablas y control de orientación); `features/admin/hospital-metrics-charts.tsx` (gráficos verticales interactivos y panel de detalle); `app/api/staff/admin/metricas/route.ts` BFF GET; `lib/severity.ts`.
- **Código tocado**: `app/globals.css` (colores sólidos de barras, gráficos verticales, estados de selección y responsive); `components/staff-shell.tsx` / navegación admin (entrada real "Métricas"); `features/reception/reception-workspace.tsx` y `features/doctor/doctor-workspace.tsx` pasan a usar `lib/severity.ts` (refactor mecánico de etiquetas/colores, sin cambios de comportamiento); `contracts/*` (refresh); `docs/backend-contract.md`, `docs/development.md`.
- **Backend**: sin cambios — el endpoint ya existe y su response cubre todos los criterios de la historia. El repo del backend no está en esta máquina; verificaciones Backend-side (techo de rango de fechas, `exigirAdminHospital` activo para el endpoint) se anotan como tareas de propuesta y se confirman contra el backend que corre.
- **Dependencias**: ninguna nueva (TanStack Query, zod y Fecha nativas HTML ya están).
- **Privacidad**: la vista no muestra datos de identificación de pacientes; solo agregados. Fechas y `hospitalId` pueden ir en la URL (no son datos sensibles); tokens permanecen server-side.
