# Handoff backend: completar el flujo médico web

## Objetivo

Extender el backend para que el frontend médico pueda recuperarse después de
una recarga, mostrar la cola autoritativa y permitir confirmar o corregir la
prioridad preliminar antes de finalizar la atención.

No modificar el orden de cola desde el frontend. Toda prioridad, orden,
transición y autorización sigue siendo responsabilidad del backend.

## Estado actualmente disponible

El backend ya permite:

- Obtener asignaciones y salas.
- Iniciar, pausar, reanudar y cerrar una sesión médica.
- Listar referencias básicas de pacientes disponibles.
- Llamar al próximo paciente.
- Marcar presente o ausente.
- Finalizar una consulta.

El DTO de llamado sólo contiene IDs, código anónimo, sala y estado. No contiene
prioridad, espera, identidad autorizada ni resumen clínico.

## Contratos requeridos

### 1. Recuperar sesión médica

```http
GET /api/medico/sesiones/activa
```

- Responder `204` cuando no exista una sesión activa o pausada.
- Responder `200 SesionMedicaDetalleDTO` cuando exista.
- La búsqueda se realiza por el `sub` autenticado, nunca por un ID de médico
  recibido del cliente.

```text
SesionMedicaDetalleDTO
- id
- hospitalId
- hospitalNombre
- codigoEspecialidad
- especialidadNombre
- salaId
- salaNombre
- estado: ACTIVA | PAUSADA
- fechaHoraInicio
- consultaActual: ConsultaOperativaDTO | null
```

`consultaActual` debe representar tanto un paciente `LLAMADO` como una
consulta `EN_ATENCION`, para reconstruir la pantalla exacta después de una
recarga.

### 2. Cola médica enriquecida

```http
GET /api/medico/sesiones/{sesionId}/cola
```

Respuesta ordenada por el mismo criterio que usa `llamar-proximo`:

```text
FilaColaMedicaDTO
- consultaId
- posicion
- prioridad
- codigoLlamado
- pacienteNombre
- pacienteApellido
- tiempoEsperaMinutos
- fechaHoraIngresoCola
- estadoConsulta
```

La identidad sólo se expone a un médico autorizado para esa sesión, hospital y
especialidad. No incluir DNI completo en la cola.

### 3. Detalle clínico autorizado

```http
GET /api/medico/sesiones/{sesionId}/consultas/{consultaId}
```

```text
ConsultaMedicaDetalleDTO
- consultaId
- paciente: PacienteClinicoDTO
- codigoLlamado
- hospital
- especialidad
- sala
- estadoConsulta
- prioridadPreliminar
- prioridadValidada
- validacionPrioridad
- resumenPretriage: TriageResultDTO
```

No devolver JSON clínico crudo. Deserializarlo y responder un DTO explícito.
Limitar los datos personales a lo necesario para la atención.

### 4. Confirmar prioridad

```http
POST /api/medico/sesiones/{sesionId}/consultas/{consultaId}/prioridad/confirmar
```

- Requiere consulta `EN_ATENCION`.
- Persiste quién confirmó, cuándo, prioridad preliminar y prioridad final.
- Debe ser idempotente si se repite la misma confirmación.
- Devuelve `ConsultaMedicaDetalleDTO`.

### 5. Corregir prioridad

```http
POST /api/medico/sesiones/{sesionId}/consultas/{consultaId}/prioridad/corregir
Content-Type: application/json

{
  "prioridad": "URGENTE",
  "motivo": "Evaluación presencial y signos observados"
}
```

- `prioridad` es obligatoria y usa `NivelDeGravedad`.
- `motivo` es obligatorio, con longitud mínima y máxima definida.
- Persiste valores anterior/nuevo, médico, fecha y motivo para auditoría.
- Reordena la cola únicamente si el dominio permite corregir antes de iniciar
  atención; si la consulta ya está en atención, registra la prioridad clínica
  final sin reinsertarla.
- Devuelve `ConsultaMedicaDetalleDTO`.

## Regla de finalización

`POST .../finalizar` debe devolver `409` si la prioridad no fue confirmada o
corregida. La validación es un requisito de negocio, no una comprobación visual
del frontend.

Notas y signos vitales no forman parte de este alcance. No agregarlos al
contrato salvo una nueva decisión de producto.

## Errores tipados

Agregar un esquema compartido:

```text
ApiErrorDTO
- timestamp
- status
- code
- message
- fieldErrors: { field, message }[]
```

Códigos mínimos:

- `MEDICAL_SESSION_NOT_FOUND` — 404.
- `CONSULTATION_NOT_FOUND` — 404.
- `SESSION_OWNERSHIP_VIOLATION` — 403.
- `INVALID_SESSION_STATE` — 409.
- `INVALID_CONSULTATION_STATE` — 409.
- `PRIORITY_VALIDATION_REQUIRED` — 409.
- `PRIORITY_ALREADY_VALIDATED` — 409 cuando la operación no sea idempotente.

## Persistencia y auditoría

Crear una entidad o estructura auditable para la validación:

- consulta médica.
- médico.
- prioridad preliminar.
- prioridad final.
- tipo `CONFIRMADA | CORREGIDA`.
- motivo de corrección nullable sólo para confirmación.
- fecha y hora.

Evitar sobrescribir la prioridad preliminar sin conservar su valor original.

## Concurrencia y autorización

- Verificar que la sesión pertenezca al médico autenticado.
- Verificar hospital, especialidad y sala en cada operación.
- Bloquear transiciones incompatibles con `409`.
- Aplicar locking o control optimista al llamado y validación para impedir que
  dos solicitudes modifiquen la misma consulta.
- No aceptar orden, posición ni identidad del paciente desde el cliente.

## Orden de implementación sugerido

1. DTO de error compartido y mapeo de excepciones.
2. Recuperación de sesión y consulta actual.
3. Cola médica enriquecida y pruebas de orden.
4. Detalle clínico autorizado.
5. Persistencia de validación de prioridad.
6. Confirmación y corrección.
7. Regla de finalización.
8. OpenAPI, documentación y E2E.

## Pruebas de aceptación

- Una recarga recupera sesión activa, paciente llamado o atención en curso.
- Un médico no puede leer ni operar sesiones de otro médico.
- La cola devuelta conserva exactamente el orden usado por `llamar-proximo`.
- Confirmar prioridad no cambia el valor y deja auditoría.
- Corregir prioridad exige motivo y conserva ambos valores.
- No se puede finalizar sin validación.
- Repeticiones y carreras devuelven resultados idempotentes o `409` tipado.
- El OpenAPI describe cuerpos, respuestas y errores de todos los endpoints.

Al finalizar, ejecutar las pruebas del backend, iniciar la aplicación y volver a
exportar `/v3/api-docs` en el frontend antes de regenerar los tipos.
