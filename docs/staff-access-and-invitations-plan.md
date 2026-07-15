# Staff access and invitation frontend plan

Status: first membership and hospital-administration vertical slice implemented.
The remaining security and operational work is listed below.

The authoritative domain proposal is maintained in the backend document
`docs/10-staff-identity-memberships-and-invitations.md`.

## Product decisions

- All staff use one authentication flow and one identity.
- After login, the backend returns every active hospital membership and permitted
  workspace.
- The workspace selector always remains available from `Espacios`; it never redirects
  automatically. The user first chooses a hospital and then one of the supported roles
  assigned to them in that hospital.
- Staff roles are granted by invitation and cannot be selected through public
  registration.
- Existing users accept a new hospital membership with their existing credentials.
- New users follow Universal Login and choose their own password.
- Hospital administration and platform administration are distinct workspaces.

## Planned routes

```text
/                         hospital and role selector
/login                    shared authentication
/invitaciones/aceptar     invitation summary and acceptance
/recepcion                reception workflow
/medico                   doctor workflow
/admin/hospital           hospital administration
/admin/plataforma         platform bootstrap and hospital management
```

## Backend contracts required first

- `GET /api/staff/me` with all memberships, roles, and permitted workspaces.
- Hospital staff and invitation administration endpoints.
- Invitation summary and acceptance endpoints with expiry and typed errors.
- Hospital-scoped room, specialty, medical assignment, suspension, and audit
  contracts.
- Platform-only hospital creation and first-admin invitation contracts.

The frontend must not infer authorization by probing unrelated endpoints. The
current `detectStaffRole()` behavior must be replaced after `/api/staff/me` exists.

## Workspace selection

The selector uses two explicit steps: hospital first, then role. Navigation represents
the chosen context, but the route is not authority. Specialty and room selection remain
part of the medical-session start flow. Every BFF call forwards the session to backend
endpoints that validate active membership and resource ownership.

No token, patient identity, DNI, clinical record, or invitation secret is stored in
localStorage. A short-lived server session may retain a non-sensitive workspace
preference, or the user can select it through the route each time.

## Hospital administration screens

### Overview

- Active staff by role.
- Pending and expired invitations.
- Rooms and specialties requiring attention.
- Recent privileged changes.

### Staff

- Search active memberships.
- Invite doctor, receptionist, coordinator, or another hospital admin.
- Suspend and reactivate access.
- Edit hospital-scoped roles without modifying the global identity.
- Prevent removal of the last active hospital admin.

### Doctor invitation

- Email and preliminary display data.
- Professional registration number, type, and jurisdiction.
- One or more specialty assignments.
- Explicit confirmation and invitation expiry.

### Reception invitation

- Email and preliminary display data.
- Hospital-scoped reception role.
- Optional local employee identifier only if the backend later defines it.

### Rooms and specialties

- Hospital admins and medical coordinators can create, activate, deactivate, and
  edit rooms according to backend permissions.
- Ordinary doctors consume assigned rooms but cannot alter hospital configuration.

### Audit

- Actor, timestamp, hospital, action, target, and resulting state.
- Filters for invitations, roles, assignments, rooms, suspensions, and revocations.

## Invitation acceptance UX

1. Show hospital, inviter, requested role, assignments, and expiry before mutation.
2. If unauthenticated, continue through Universal Login and return to acceptance.
3. Verify the authenticated email through the backend.
4. Require confirmation of professional data and terms where applicable.
5. Submit once with pending-state protection.
6. Refetch `/api/staff/me` and enter the newly available workspace.

Expired, revoked, already accepted, wrong-email, and duplicate-membership cases need
distinct accessible messages based on typed backend errors. Raw invitation secrets
must not enter logs, analytics, or client persistence.

## Patient experience

- Digital patients self-register only as patients.
- A reception-created patient may later claim the existing record through a verified
  invitation flow.
- Account claiming requires evidence beyond DNI knowledge and must not create a
  duplicate patient.

## Delivery order

1. Replace provisional authentication according to the hardening plan.
2. Consume `/api/staff/me` and implement multi-workspace routing.
3. Implement platform bootstrap screens after platform contracts exist.
4. Implement hospital staff and invitation administration.
5. Implement invitation acceptance and Universal Login return handling.
6. Implement room, specialty, and medical assignment management.
7. Add patient account claiming.
8. Add accessibility, browser E2E, permission-boundary tests, and audit verification.

## Frontend acceptance criteria

- A dual-role account can choose reception or medicine after one login.
- A doctor added to another hospital reuses the same account and sees both hospitals.
- An unauthorized route redirects without hiding a backend authorization failure.
- An invitation mutation cannot be submitted twice while pending.
- Admin controls are limited to memberships returned for the selected hospital.
- Invitation state survives authentication without exposing secrets to logs or
  persistent browser storage.
- All new routes pass typecheck, lint, production build, and Next.js runtime error
  checks.

## Implemented in this delivery

- `/api/staff/me` replaces reception-first role probing.
- A dual-role or multi-hospital account sees a workspace selector after login.
- Reception, medicine and hospital administration authorize from active scoped
  memberships.
- `/admin/hospital` lists personnel, invitations and recent audit activity; it can
  invite staff, suspend/reactivate memberships and revoke pending invitations.
- Medical invitations capture registration number, national/provincial type and
  issuing jurisdiction. Provincial jurisdiction uses the bundled Argentine
  province catalog; national credentials are sent as `NACION`.
- `/invitaciones/aceptar` consumes the one-time secret from the URL fragment, moves
  it immediately into memory and removes it from browser history. New users choose
  their password; existing users accept with their authenticated account.
- Browser calls use privacy-safe BFF routes and TanStack Query owns admin remote
  state.

The current development backend has no mail provider. The panel therefore displays
the secret once so a developer can construct `/invitaciones/aceptar#<secreto>`.
Production must send that fragment link through a configured mail adapter and must
remove the manual secret display. Authorization Code + PKCE, access-token audience,
MFA, mail delivery, platform screens, room/specialty administration and patient
claiming remain pending.
