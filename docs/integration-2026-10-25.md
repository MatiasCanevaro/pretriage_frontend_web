# Integración de desarrollo del 25 de octubre de 2026

## Rama y cambios conservados

El frontend web estaba en `desarrollo` con cambios locales. Se creó
`codex/chat-voz-gemini-live` desde `8a3d4cd`, sin mover ni publicar la rama
`desarrollo`. El checkpoint `151bea2` preserva selección de sector/consultorio,
gestión administrativa de sesiones, manejo de respuestas HTTP 204 y sus pruebas.
El merge `edeb9fc` incorpora `origin/desarrollo` en `19f94e8`.

Se resolvieron los conflictos de la ruta BFF médica, el espacio médico y el espacio
administrativo combinando las funciones de ambos lados. También se corrigió una
duplicación de `MedicalSector` surgida de la fusión automática: corresponde a
`SectorDTO`, no a `SalaDTO`. Se conservaron las métricas, el guard de sesión, el
logout y la paleta común de gravedad provenientes de desarrollo.

Las consultas de sectores y salas tienen claves distintas y la sala está ligada
al sector seleccionado; cambiar especialidad o sector limpia las selecciones
anteriores. Una sesión no puede iniciarse desde la UI sin un sector y una sala
válidos. Administración conserva la consulta/cierre de sesiones activas o pausadas.
El historial de sesiones finalizadas permanece en la base del backend y no se
expone por ese listado. Las pruebas de contratos ahora se ejecutan también en CI.

## Dependencias revisadas

`npm ci` reprodujo cuatro alertas de paquetes: Next.js (crítica), PostCSS y sharp
(transitivas, altas), y Zod (alta). Se actualizaron versiones explícitas y el lock,
sin usar `npm audit fix --force` ni migrar la aplicación a otro major de Next.

| Paquete | Antes del parche | Versión verificada |
| --- | --- | --- |
| Next.js | 16.2.12 | 16.4.3 |
| eslint-config-next | 16.2.6 | 16.4.3 |
| Zod | 4.4.3 | 4.6.7 |
| PostCSS | 8.4.31 y 8.5.31 | 8.5.23 y 8.5.31 |
| sharp | 0.34.5 | 0.35.5 |

La [actualización oficial de Next del 14 de octubre](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
corrige ejecución remota en Cache Components/imágenes y denegación de servicio
en Server Actions desde 16.4.1. Se eligió
[16.4.3](https://github.com/vercel/next.js/releases/tag/v16.4.3), que agrega
correcciones de `proxy.ts` y otros fallos posteriores. El proyecto usa App Router
y `next/image` para un PNG local; no se encontraron `use cache`, `next/og` ni
Server Actions en el código de la aplicación. Esto delimita los caminos observados,
pero no demuestra que una versión vulnerable sea segura ni sustituye el parche.

El procesamiento de SVG en Linux requiere sharp 0.35.5 o posterior, condición
cubierta por la actualización de Next. Los avisos de
[PostCSS](https://github.com/advisories/GHSA-r28c-9q8g-f849) involucran lectura de
mapas desde CSS controlado por un atacante; el proyecto compila su CSS local y
no ofrece un endpoint que procese CSS subido. Se eliminó igualmente la versión
transitiva afectada, junto con los avisos posteriores de mapas de origen.

[Zod GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
se corrige desde 4.6.6. La aplicación valida listas del formulario clínico; no se
ensayó un ataque de agotamiento de memoria contra datos reales. Se fijó
[4.6.7](https://github.com/colinhacks/zod/releases/tag/v4.6.7), el parche posterior
publicado por el mantenedor. `npm audit` terminó con cero vulnerabilidades para
el árbol instalado y bloqueado en la fecha de verificación.

## Verificación y alcance

- `npm run test:contracts`: 3 pruebas aprobadas (HTTP 204/409, sector/sala médica,
  listado/cierre administrativo y conservación de errores).
- `npm run typecheck`: aprobado.
- `npm run lint`: sin errores; una advertencia de la nueva regla Next sobre
  `window.location.assign("/")` al aceptar una membresía. Ese comportamiento
  existente mantiene la navegación completa para descartar el estado anterior.
- `npm run build`: compilación de producción aprobada con Next 16.4.3.
- Instancia temporal en `127.0.0.1:3100`: login renderizado en un navegador,
  `get_errors` del endpoint MCP oficial devolvió `configErrors=[]` y
  `sessionErrors=[]`.
- HTTP sin credenciales: `/login` devuelve 200, administración y médico redirigen
  a `/login` con 307, y el BFF de métricas rechaza acceso con 401.

No se modificaron cuentas ni datos clínicos. La comprobación de runtime se limita
al login y la protección sin sesión; no reemplaza una prueba autenticada de
recepción, administración, métricas y atención médica con datos sintéticos.
