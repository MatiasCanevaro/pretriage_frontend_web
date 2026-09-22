# Local development

Requirements: Node.js 20+, npm, and the backend at http://localhost:8080.

## Start

1. Copy .env.example to .env.local.
2. Run npm install.
3. Run npm run dev.
4. Open http://localhost:3000.

## Architecture

- app/: routes, layouts, boundaries, and route-local UI.
- components/: shared UI and providers.
- features/: workflows, adapters, schemas, and queries.
- lib/api/: privacy-safe transport and normalized errors.
- contracts/: OpenAPI snapshot and generated transport code.
- proxy.ts: protected-route guard and server-side access-token renewal.
- app/api/staff/: privacy-safe BFF routes. Browser code never receives bearer tokens.
- app/api/auth/: provisional login/logout against the backend.

Reception and doctor sessions recover their authoritative state from the backend after a reload.
An in-attention doctor workspace also refetches the pretriage summary and priority-review state. Finalization stays disabled until that backend-owned review is confirmed or corrected.

Verification: npm run typecheck, npm run lint, npm run build.
Never commit credentials, tokens, or real patient data.

## Continuous integration

GitHub Actions runs `.github/workflows/ci.yml` for pull requests and pushes to
`desarrollo` and `main`. The `Frontend CI / verify` check installs the locked
dependencies with `npm ci`, then runs typecheck, lint, and the production build.

Configure `Frontend CI / verify` as a required status check in the branch
protection rules for `desarrollo` and `main` so a pull request cannot merge while
the check is pending or failing.

## Staff access development

After login, `/api/staff/me` resolves all active hospital workspaces. Existing
reception/doctor records are migrated lazily by the backend. Hospital admins use
`/admin/hospital`; invitation acceptance uses
`/invitaciones/aceptar#<one-time-secret>`. The fragment is removed from browser
history as soon as the page loads and is never persisted by the frontend.

The backend uses `LocalInvitationEmailAdapter` by default and returns the invitation
secret once for local handoff. SMTP mode sends the fragment link and never exposes
the secret in the administrative response. Do not paste invitation secrets into
issue trackers, logs or committed files.

The staff invitation form groups email, additive role permissions and conditional
medical credentials. Medical specialties come from the hospital's enabled catalog,
not manually entered IDs. Inline errors preserve the draft; submission remains
blocked through mutation and authoritative refetch. Delivery feedback distinguishes
sent mail, a one-time local secret, and delivery still pending.

Hospital administration sidebar entries are real in-page links to invitation
creation, configuration, personnel, invitations and audit. Fragment links preserve
the hospital query parameter and unsent form values; the selected destination is
marked with `aria-current="location"`. There is no placeholder “Inicio” entry.
Headings accept keyboard focus and leave space for the sticky navigation on mobile.

The shared staff header shows “Cambiar hospital” only when `/api/staff/me` returns
more than one distinct active hospital with an available staff module. Multiple
roles in the same hospital do not enable this action. The admin heading has no
duplicate “Cambiar espacio” link. Module navigation remains available within the
current hospital.

## Provisional authentication

The login page sends credentials to the server-side route
`POST /api/auth/login`. That route calls backend `POST /api/login` and
stores the returned access token, rotating refresh token, and backend-provided
renewal time in HttpOnly, SameSite=Lax session cookies. Browser JavaScript never
receives the tokens and credentials are not persisted.

Before protected pages and `/api/staff/*` handlers run, `proxy.ts` renews access
through backend `POST /api/renovar` when the current token has at most 60 seconds
remaining. Every successful renewal atomically replaces both cookies because the
backend rotates refresh tokens. An invalid refresh clears the complete session;
a transient renewal failure keeps a still-valid access token and never destroys
the refresh token. Logout clears all three session cookies.

The public `/restablecer-contrasena` flow uses the server-side
`POST /api/auth/password-reset` BFF for token request, validation, and password
change. The one-time token and passwords remain only in component memory while
the page is open; they are never stored in browser storage or added to a URL.

This remains an explicitly temporary Password Realm integration. See
`docs/authentication-hardening-plan.md` before considering it production-ready.

## Hospital sectors and rooms

Hospital administrators use `/admin/hospital` to enable specialties, create/edit
sectors (name, specialty and active state), and manage rooms grouped under each
sector. Room specialty follows the selected sector. Deactivating a sector also
deactivates its rooms; deleting one requires confirmation because its rooms are
deleted as well. Mutations use `/api/staff/admin` and reload authoritative
configuration and audit through TanStack Query.

Creating a sector first opens a confirmation dialog with its name and specialty.
Enabling a hospital specialty also requires confirmation showing its name; cancel
or Escape sends no request. Both flows share pending/error handling and restore
keyboard focus after closing.
Cancel/Escape preserves the draft without sending a request. Confirmation stays
open during the mutation and refetch; an error allows correction or retry. See
`docs/admin-ux-plan.md` for the UX decisions and browser acceptance cases.

Use a backend with the sector-scoped configuration contract documented in
`docs/backend-contract.md`. The old `/configuracion/salas` paths are no longer used.
Verify with synthetic hospital data: empty sectors, creation, duplicate-name and
patient/session conflicts, editing specialty/state, room creation/rename/state,
deletion cancellation and successful deletion, then reload the page. Check that
errors preserve form entries, pending controls cannot submit twice, and sector
deactivation refreshes every affected room. Specialty deactivation must work without
any sectors and must reject active rooms of that specialty anywhere in the hospital;
the form must not request a sector.

## Contract refresh

```powershell
Invoke-WebRequest -UseBasicParsing `
  -Uri http://localhost:8080/v3/api-docs `
  -OutFile contracts/pretriage-openapi.json
npm run contracts:generate
```

## Argentine locations catalog

Reception address fields use the bundled official Georef catalog, grouped as
Province -> City/Locality. Runtime form use does not call an external service or
transmit address fragments. Refresh the snapshot when territorial data changes:

```powershell
npm run georef:update
```

The generated `lib/geo/argentina-locations.json` must be committed together with
the update script. Its source is the public Georef API from Argentina's national
open-data service.
