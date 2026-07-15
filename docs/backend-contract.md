# Backend contract

- Local repository: `C:\Users\valen\Documents\Facultad\Proyecto\pretriage_backend`
- Base URL: `http://localhost:8080`
- Live OpenAPI: `http://localhost:8080/v3/api-docs`
- Exported snapshot: `contracts/pretriage-openapi.json`
- Snapshot date: 2026-07-15
- Snapshot SHA-256: `8add6437af6a78a0b1e8ece34161aaa9384e04332d1d518485b84b9f29fc9863`
- OpenAPI version: 3.1.0
- API title/version: Pretriage API / v1
- Snapshot size: 61 paths and 53 schemas

The running backend, its source, and the exported OpenAPI are authoritative. Do not pin frontend work to a backend commit and never invent missing contracts.

## Refresh the snapshot

With the backend running locally:

```powershell
New-Item -ItemType Directory -Force -Path contracts | Out-Null
Invoke-WebRequest -UseBasicParsing `
  -Uri http://localhost:8080/v3/api-docs `
  -OutFile contracts/pretriage-openapi.json
```

Validate that the file parses as JSON before generating transport types.

## Delivery order

1. Authentication, identity probes, API errors, and privacy-safe logging.
2. Reception bootstrap and active-session recovery.
3. Patient lookup/creation and admission creation.
4. Reception triage draft, finalization, cancellation, and result recovery.
5. Backend-supported doctor session and queue actions.
6. Doctor recovery, clinical detail, and priority validation after contracts exist.
7. Contract tests, E2E, accessibility, and visual regression.

## Authentication and identity

- `POST /api/login` and `POST /api/register` are public.
- All staff workflow endpoints require an issuer-validated bearer JWT.
- The backend identifies the caller through the JWT `sub` and resolves the corresponding `Recepcionista` or `Medico` in its own database.
- Spring Security currently requires authentication globally but does not authorize staff routes from JWT role claims. Role and ownership checks happen in the service layer through the authenticated subject.
- The provisional frontend calls backend `POST /api/login` through a server-side Next.js route and stores its returned ID token in an HttpOnly cookie.
- This temporary ID-token-as-bearer contract is known to be incorrect for production. The migration requirements are recorded in `docs/authentication-hardening-plan.md`.
- Tokens must never be written to localStorage, logs, analytics, or URLs.

## Reception contract

The current backend supports the complete assisted-admission lifecycle:

```http
GET  /api/recepcion/hospitales
GET  /api/recepcion/sesiones/activa
POST /api/recepcion/sesiones
POST /api/recepcion/sesiones/{sesionId}/cerrar
GET  /api/recepcion/pacientes/{dni}?sesionId={sesionId}
GET  /api/recepcion/admisiones?sesionId={sesionId}
POST /api/recepcion/admisiones
GET  /api/recepcion/admisiones/{admisionId}
POST /api/recepcion/admisiones/{admisionId}/finalizar
POST /api/recepcion/admisiones/{admisionId}/cancelar
```

Rules relevant to the frontend:

- A receptionist can have only one active session.
- Hospitals are limited to assignments for the authenticated receptionist.
- DNI is normalized to digits and must contain seven or eight digits.
- An existing patient is reused by DNI; otherwise the admission request creates a reception-origin patient.
- Reception captures and persists the complete structured address: street, number, optional floor, city, province, and postal code. Submitting an admission also updates the address of an existing patient with the verified values.
- A patient cannot have another active consultation.
- Patient lookup returns `atencionEnCurso` and `estadoAtencionEnCurso`. Reception must show this before admission entry and disable creation while it is true; the create endpoint remains the authoritative concurrency guard.
- Specialty must belong to the session hospital.
- The receptionist completes one structured clinical form. `motivoConsulta` is
  the required patient-language main complaint; `sintomas` contains only
  optional additional symptoms. Pain is a repeatable `dolores` list with one
  location and 0-10 intensity per entry.
- The backend generates priority; reception cannot submit or modify it.
- Open admissions can be listed, resumed from their metadata, or cancelled.
- Finalized and cancelled admissions are terminal.
- A reception session cannot close while it owns an unfinished admission.
- Finalization returns the anonymous call code, generated priority, and dynamic estimate.
- The current estimator populates `fechaHoraAtencionEstimada`. Reception also
  accepts the optional `fechaHoraAtencionEstimadaDesde/Hasta` range and prefers
  it when the backend provides it.
- Admission detail intentionally omits the stored clinical form and raw triage JSON.

Only reception triage drafts may use `sessionStorage`, keyed by admission ID. Clear the draft after successful finalization or cancellation.

Reception finalization may invoke the backend AI provider. The backend bounds that provider call and falls back to its deterministic classifier when the provider is unavailable. As a final guard, the frontend BFF aborts backend calls after 60 seconds and returns a retryable `504`; the admission draft remains in `sessionStorage`, so the receptionist can retry without re-entering symptoms.

## Doctor contract currently available

```http
GET  /api/medico/asignaciones
GET  /api/hospitales/{hospitalId}/salas?codigoEspecialidad={codigo}
GET  /api/medico/sesiones/actual
POST /api/medico/sesiones
POST /api/medico/sesiones/{sesionId}/pausar
POST /api/medico/sesiones/{sesionId}/reanudar
POST /api/medico/sesiones/{sesionId}/cerrar
GET  /api/medico/sesiones/{sesionId}/pacientes-disponibles
POST /api/medico/sesiones/{sesionId}/llamar-proximo
POST /api/medico/sesiones/{sesionId}/consultas/{consultaId}/presente
POST /api/medico/sesiones/{sesionId}/consultas/{consultaId}/ausente
GET  /api/medico/sesiones/{sesionId}/consultas/{consultaId}/pretriaje
PUT  /api/medico/sesiones/{sesionId}/consultas/{consultaId}/revision-prioridad
POST /api/medico/sesiones/{sesionId}/consultas/{consultaId}/finalizar
GET  /api/medico/atenciones
```

The API supports the complete planned medical-session flow. During `EN_ATENCION`, the frontend retrieves the normalized pretriage summary and requires the doctor to review priority before finalization. `CONFIRMAR` is one click. `CORREGIR` requires a different priority and accepts an optional reason of at most 500 characters. A genuine change is audited; an identical retry is idempotent. The review can be changed while attention remains open, and finalization is rejected with `409` while it is pending.

## Doctor blockers

The confirmed product flow also requires the following contracts, which are not present in the current OpenAPI:

- Return explicit backend-owned relative-order and wait-time fields for each queue row. Priority, patient name, surname and calling code are available to the authorized doctor; the frontend never recalculates queue order.
- Define whether notes and vital signs belong to this release; no request DTO currently accepts them.
- Define typed `404` and `409` error bodies for recovery and concurrency cases. The OpenAPI currently documents statuses but not a shared error schema.

`ConsultaLlamadaDTO` remains a compact queue/call projection. Clinical detail and priority review intentionally use their own consultation-scoped contract.

## Pending frontend contract work

- Generate TypeScript types and a transport client from `contracts/pretriage-openapi.json`.
- Add a contract sync/check command so CI detects drift from the running backend export.
- Replace the provisional backend-login session according to `docs/authentication-hardening-plan.md`.
- Keep doctor UI limited to backend-supported behavior until the blocker contracts above are implemented.

## Staff membership contract

The backend now exposes `/api/staff/me` and hospital-scoped membership/invitation
administration. The frontend no longer infers one global role by probing reception
and medicine endpoints. See `docs/staff-access-and-invitations-plan.md` for routes,
implemented scope and the remaining Universal Login/mail hardening work.
