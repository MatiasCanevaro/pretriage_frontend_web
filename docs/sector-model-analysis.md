# Sector and specialty model review

## Current behavior

The backend models one specialty per sector (`Sector.especialidad`) and allows
several sectors for the same hospital/specialty. `HospitalConfigurationService`
requires each room's specialty to match its sector. The web reflects this rule.

This is more than a form restriction. `AsignacionSectorService` searches active
sectors of the consultation's hospital and specialty, requires an active room,
and compares waiting patients per sector. Medical queues and capacity are scoped
by hospital, specialty and sector.

## Independent correction: deactivate a hospital specialty

Offering a specialty is a hospital-level association (`Hospital.especialidades`).
Deactivation must not require an arbitrary sector. The previous operation checked
rooms only in the supplied sector but removed the association from the hospital,
allowing another sector's active rooms to be overlooked. It also made deactivation
impossible before the first sector existed.

The corrected operation is
`DELETE /api/admin/hospitales/{hospitalId}/configuracion/especialidades/{especialidadId}`.
It checks that specialty's active rooms across the entire hospital, including
legacy rooms without a sector, and returns a conflict if any remain active.
Otherwise it removes only the hospital association. It preserves the global
catalog, rooms, sectors, clinical history and ongoing attention; it does not close
medical sessions or cancel consultations. Re-enabling remains available.

## Choosing what a sector represents

| Meaning | Appropriate model | Example |
| --- | --- | --- |
| Dedicated attention unit | One specialty per sector; several sectors can share it | Two separate clinical medicine units |
| Physical area | A sector contains rooms of different specialties | North wing with clinical medicine and pediatric rooms |

If sectors represent physical areas, the recommended model is
`Hospital -> Sector -> Sala -> Especialidad`, with the hospital independently
controlling its offered specialties. The specialties supported by a sector should
be derived from its rooms; an additional editable sector-specialty list would
duplicate that state unless there is a separate product need to plan capacity
before rooms exist.

This cardinality decision is separate from hospital specialty deactivation. The
current change fixes deactivation and retains one specialty per sector while the
meaning of a sector is being clarified.

## Scope of a possible physical-area migration

1. Preserve sector/room IDs and historical consultation/session references. Keep
   each existing room's specialty; reconcile legacy missing values before removing
   the scalar sector specialty column.
2. Change sector creation/editing to name and state. Let each room select a
   specialty enabled by its hospital; sector responses can expose derived
   specialties if clients need them.
3. Assign a patient only to an active sector with an active room for the requested
   specialty. Compare waiting load for the hospital + specialty + sector, rather
   than all patients in a mixed-specialty sector.
4. Keep queue ordering, estimates and doctor capacity separated by specialty
   within each sector. Validate medical sessions against the selected room's
   specialty and ensure other specialties cannot contribute capacity.
5. Update web and affected mobile/API consumers together, refresh generated
   OpenAPI/types, and regenerate backend entity documentation.
6. Cover mixed-specialty sectors, unavailable rooms, isolated queues/capacity,
   historical data and hospital-wide specialty deactivation in regression tests.

Changing only the sector form to accept several specialties would leave patient
assignment and capacity calculations inconsistent with the new meaning.
