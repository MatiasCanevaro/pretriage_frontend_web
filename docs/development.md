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
- proxy.ts: optimistic cookie-presence redirect for protected staff pages.
- app/api/staff/: privacy-safe BFF routes. Browser code never receives bearer tokens.
- app/api/auth/: provisional login/logout against the backend.

Reception and doctor sessions recover their authoritative state from the backend after a reload.

Verification: npm run typecheck, npm run lint, npm run build.
Never commit credentials, tokens, or real patient data.

## Staff access development

After login, `/api/staff/me` resolves all active hospital workspaces. Existing
reception/doctor records are migrated lazily by the backend. Hospital admins use
`/admin/hospital`; invitation acceptance uses
`/invitaciones/aceptar#<one-time-secret>`. The fragment is removed from browser
history as soon as the page loads and is never persisted by the frontend.

The development backend currently returns the invitation secret once because no
mail adapter is configured. Do not paste real invitation secrets into issue
trackers, logs or committed files.

## Provisional authentication

The login page sends credentials to the server-side route
`POST /api/auth/login`. That route calls backend `POST /api/login` and
stores the returned token in an HttpOnly, SameSite=Lax cookie. Browser
JavaScript never receives the token and credentials are not persisted.

This is an explicitly temporary integration because the backend returns an
ID token and uses the Password Realm grant. See
`docs/authentication-hardening-plan.md` before considering it production-ready.

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
