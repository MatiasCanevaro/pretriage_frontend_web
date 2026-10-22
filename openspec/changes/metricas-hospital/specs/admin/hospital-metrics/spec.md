# Spec Delta

## Purpose

Permite al administrador de hospital consultar en cualquier momento las métricas operativas de su propio hospital -atención, colas, gravedad y pretriage- filtradas por un período de fechas, para identificar oportunidades de mejora.

## ADDED Requirements

### Requirement: Acceso restringido a las métricas del hospital propio

Un administrador con rol `ADMIN_HOSPITAL` DEBE (MUST) poder acceder a las métricas de su hospital en cualquier momento desde su sesión. El sistema DEBE resolver el hospital del contexto de membresía del staff autenticado y DEBE impedir que un admin consulte métricas de un hospital distinto al de su membresía, sin importar el valor en la URL. Cuando la ruta no trae `hospitalId`, el sistema DEBE (MUST) mostrar un mensaje claro que indique cómo seleccionar el hospital y no DEBE redirigir, sin realizar llamadas de métricas. El sistema no DEBE exponer métricas a usuarios sin rol `ADMIN_HOSPITAL` ni a sesiones sin identidad.

#### Scenario: Admin accede a las métricas de su hospital
- **WHEN** un usuario con membresía `ADMIN_HOSPITAL` sobre el hospital H abre `/admin/hospital/metricas`
- **THEN** se muestra el formulario de consulta de períodos y el estado inicial vacío de la vista, dentro del shell de administración del hospital H

#### Scenario: Consulta sin hospital indicado
- **WHEN** el admin abre `/admin/hospital/metricas` sin `hospitalId` en la URL
- **THEN** la vista muestra un mensaje claro de hospital faltante dentro del shell admin, con el camino para elegir el hospital (Administración), sin redirigir y sin llamar al endpoint de métricas

#### Scenario: Admin intenta un hospital ajeno
- **WHEN** el `hospitalId` de la URL no coincide con ninguna membresía `ADMIN_HOSPITAL` del usuario autenticado
- **THEN** el sistema redirige sin mostrar métricas de otro hospital y sin llamar al endpoint backend de métricas

#### Scenario: Sesión sin rol admin
- **WHEN** el `hospitalId` de la URL coincide con una membresía vigente pero la sesión del usuario no incluye el rol `ADMIN_HOSPITAL` para ese hospital
- **THEN** el sistema redirige sin presentar la vista ni los datos de métricas

#### Scenario: Sesión vencida
- **WHEN** el usuario no tiene sesión vigente al abrir la ruta
- **THEN** el guardia de sesión lo lleva al flujo de inicio de sesión antes de mostrar cualquier métrica

### Requirement: Consulta de métricas por período con calendario

El sistema DEBE (MUST) presentar un formulario de calendario nativo con dos fechas obligatorias: `desde` y `hasta`. El `desde` DEBE ser estrictamente anterior a hoy, el `hasta` DEBE ser hoy o anterior, y el `hasta` DEBE ser mayor o igual que el `desde`. Cuando los campos del formulario o los parámetros de la URL violen esas reglas o presenten valores malformados, el sistema DEBE (MUST) mostrar los errores en rojo debajo del campo correspondiente y no DEBE consultar. El backend es la autoridad final: si una consulta inválida lo alcanza de todos modos, el sistema DEBE mostrar su 400 con mensaje descriptivo como aviso y no inventar métricas. Mientras una consulta está en curso, el formulario completo (botón y envío por Enter incluidos) DEBE quedar bloqueado para nuevos envíos.

#### Scenario: Consulta de un rango válido
- **WHEN** el admin selecciona `desde` y `hasta` que cumplen las reglas y consulta
- **THEN** el sistema muestra las métricas del hospital para ese rango inclusive

#### Scenario: Fecha inicial en el futuro o el día de hoy
- **WHEN** el admin selecciona `desde` igual a hoy o posterior
- **THEN** el sistema impide la consulta e indica la regla en el campo correspondiente

#### Scenario: Fecha final en el futuro
- **WHEN** el admin selecciona `hasta` posterior a hoy
- **THEN** el sistema impide la consulta e indica la regla en el campo correspondiente

#### Scenario: Rango invertido
- **WHEN** el admin selecciona `hasta` anterior a `desde`
- **THEN** el sistema impide la consulta e indica la regla en los campos correspondientes

#### Scenario: Campos incompletos
- **WHEN** el admin consulta con `desde` o `hasta` vacíos
- **THEN** el sistema no envía la consulta e indica que ambas fechas son obligatorias

#### Scenario: Parámetros de URL inválidos
- **WHEN** la página se abre con `desde`/`hasta` en la URL que violan las reglas o están malformados
- **THEN** los errores se muestran en rojo debajo del campo correspondiente y no se consulta

#### Scenario: Backend rechaza la consulta
- **WHEN** la consulta cumplió las reglas del formulario pero el backend la rechaza (por ejemplo, por límite propio de extensión del rango)
- **THEN** el sistema muestra el mensaje de error del backend como aviso, no inventa métricas y permite corregir el rango y reintentar

#### Scenario: Consulta reiterada durante pendiente
- **WHEN** el admin consulta y vuelve a enviar el formulario antes de obtener respuesta
- **THEN** todo el formulario queda bloqueado (botón y envío por Enter) mientras la consulta está pendiente

### Requirement: Estado de la consulta en la URL

La vista DEBE (MUST) iniciarse sin datos hasta que el admin realice una consulta. Al consultar, el sistema DEBE reflejar el rango consultado en los parámetros de la ruta (`desde` y `hasta`), preservando el `hospitalId` presente, y DEBE repetir automáticamente esa consulta al recargar la página con esos parámetros, presentando además el formulario precargado con ese rango. La primera carga sin parámetros DEBE permanecer vacía, sin llamar al endpoint con fechas inventadas.

#### Scenario: Carga limpia
- **WHEN** el admin abre la ruta sin parámetros de fechas
- **THEN** la vista se muestra vacía con la instrucción de consulta y no se realizan llamadas de métricas

#### Scenario: Recarga con consulta activa
- **WHEN** el admin recarga la página con `?desde=...&hasta=...` en la URL
- **THEN** el sistema repite automáticamente esa consulta, presenta el formulario precargado con ese rango y muestra sus métricas

### Requirement: Actualización periódica y estado de carga

Mientras corre la consulta inicial, la vista DEBE (MUST) mostrar un indicador de carga (spinner o mensaje) y mantener bloqueado el envío hasta recibir respuesta. Si el rango consultado incluye el día de hoy (`hasta` = hoy), el sistema DEBE reconsultar el mismo endpoint cada una hora mientras la vista permanezca abierta. Si el rango cerró en el pasado (`hasta` anterior a hoy), el resultado DEBE quedar cacheado y el sistema no DEBE reconsultarlo automáticamente. La reconsulta automática DEBE actualizar los datos en segundo plano sin vaciar la vista.

#### Scenario: Indicador durante la consulta inicial
- **WHEN** el admin consulta y el backend aún no respondió
- **THEN** la vista muestra el indicador de carga y el envío queda bloqueado hasta recibir respuesta

#### Scenario: Reconsulta horaria de rango que incluye hoy
- **WHEN** la consulta activa tiene `hasta` = hoy y la vista permanece abierta
- **THEN** el sistema reconsulta el endpoint cada una hora sin intervención del admin, actualizando los datos en segundo plano

#### Scenario: Rango cerrado queda cacheado
- **WHEN** la consulta activa tiene `hasta` anterior a hoy
- **THEN** el resultado queda cacheado y no se reconsulta automáticamente

### Requirement: Indicadores del período consultado

Para el rango consultado, el sistema DEBE (MUST) mostrar: la cantidad de pacientes que ingresaron a la cola, la cantidad atendidos, la cantidad no atendidos, el porcentaje de atención, el tiempo promedio de espera antes de ser atendidos, y la cantidad de pacientes que realizaron y no realizaron el pretriage junto con su porcentaje. El sistema DEBE tratar los valores nulos del backend como falta de dato: cuando la espera promedio reportada no tiene valor (período sin atenciones) la vista DEBE mostrar falta de dato y no un número inventado. Los porcentajes DEBEN (MUST) presentarse con un indicador visual circular (anillo) junto al número truncado a su parte entera, sin redondeo. El promedio de espera DEBE presentarse como número en tarjeta de KPI. Las fechas DEBEN formatearse en `dd/MM/yyyy`. Los conteos y promedios DEBEN usar la convención local `es-AR`.

#### Scenario: Período con datos completos
- **WHEN** el backend responde con todas las métricas del rango
- **THEN** la vista presenta los KPIs: ingresados a cola, atendidos, no atendidos, % de atención, espera promedio en minutos y pretriage realizado/no realizado con su porcentaje

#### Scenario: Período sin atenciones
- **WHEN** el backend reporta espera promedio sin valor
- **THEN** la vista muestra el estado vacío explícito ("-") en vez de un número inventado

#### Scenario: Formato local
- **WHEN** se renderizan porcentajes y promedios con decimales
- **THEN** el porcentaje se muestra truncado a la parte entera (70,0 se presenta "70") dentro de su anillo, el promedio se muestra con coma decimal (37,5) en tarjeta KPI y las fechas de la serie se presentan en `dd/MM/yyyy`

### Requirement: Distribución por gravedad

El sistema DEBE (MUST) mostrar la distribución de pacientes según nivel de gravedad en dos vistas: la asignada por el bot (los cinco niveles de la tabla de Manchester) y la revisada por el médico, en gráfico de barras acompañado de sus conteos y porcentajes (no solo los números). La distribución del médico DEBE mostrar además los pacientes sin revisión (`SIN_REVISION`), que DEBE quedar siempre como última fila porque no es un nivel de gravedad; la del bot no DEBE inventar categoría. Los niveles fuera del catálogo conocido no DEBEN presentarse. Las filas conocidas DEBEN mantenerse en orden de gravedad.

#### Scenario: Distribuciones presentes
- **WHEN** el backend responde la distribución del período
- **THEN** la vista muestra la distribución del bot en gráfico de barras con sus cinco niveles en orden de gravedad y la del médico con la fila `SIN_REVISION` al final, con sus conteos y porcentajes

#### Scenario: Período sin pacientes en algún nivel
- **WHEN** un nivel no registra pacientes en el rango
- **THEN** la vista lo presenta con cantidad 0 y porcentaje 0, sin omitir el nivel del orden de gravedad

#### Scenario: Nivel desconocido en la respuesta
- **WHEN** la distribución del backend incluye un nivel fuera del catálogo conocido
- **THEN** la vista lo omite de las barras sin inventar categoría ni bloquear el resto de la presentación

### Requirement: Serie diaria del período

El sistema DEBE (MUST) mostrar la serie diaria del rango consultado con ingresados, atendidos y espera promedio por día, presentada como tabla con indicadores de barras por día. Los días sin atenciones DEBEN representarse con su valor cero en conteos y falta de dato en espera. La serie DEBE cubrir ambos extremos del rango consultado (rango inclusivo).

#### Scenario: Serie con días de datos y días vacíos
- **WHEN** el backend responde la serie diaria de un rango que incluye días con y sin atenciones
- **THEN** la vista presenta cada día del rango con sus conteos y la espera promedio cuando existe, mostrando "-" los promedios ausentes

### Requirement: Comparabilidad entre períodos

Cada consulta DEBE (MUST) presentarse con la misma estructura de indicadores, distribuciones y serie diaria, de modo que el admin pueda comparar el funcionamiento del hospital entre distintos períodos realizando consultas sucesivas para rangos distintos.

#### Scenario: Consultas sucesivas de rangos distintos
- **WHEN** el admin consulta un rango A y luego cambia el rango y consulta un rango B
- **THEN** ambas presentaciones usan la misma estructura de la vista y la consulta más reciente reemplaza a la anterior

### Requirement: Transporte seguro y privacidad de los datos

La vista DEBE (MUST) obtener las métricas a través del canal server-side del sistema (BFF) adjuntando el token de la sesión del servidor; el navegador nunca DEBE recibir bearer tokens ni llamar directamente al endpoint del backend, y el token no DEBE registrarse en logs ni URLs. La vista no DEBE mostrar datos de identificación de pacientes: solo agregados y distribuciones. En la URL solo pueden viajar `hospitalId`, `desde` y `hasta`.

#### Scenario: Consulta sin exponer credenciales
- **WHEN** la vista obtiene las métricas del período
- **THEN** la llamada se cursa por el BFF del sistema con el token del servidor y no deja bearer tokens ni datos de pacientes en URLs, enlaces ni almacenamiento del navegador

#### Scenario: Fallo del transporte
- **WHEN** el backend o la red no responden dentro del límite del BFF
- **THEN** la vista muestra un aviso reintenable con mensaje normalizado y no ejecuta reintentos automáticos en bucle
