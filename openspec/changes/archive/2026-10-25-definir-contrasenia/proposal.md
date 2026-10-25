# Proposal

## Why

H0019 requires that an authenticated user can define a new password. The staff web (receptionists, doctors, hospital admins, and platform admins) currently has no way to do it: the only password flow is the public token-based reset for forgotten passwords, which uses different strength rules and does not ask for the current password. The backend already exposes `POST /api/auth/cambio-contrasenia/actual` with JWT protection, strength validation, attempt counting, and a 3-attempt/24-hour lock, so the missing piece is the authenticated staff experience.

## What Changes

- Add a protected page at `/cuenta/contrasena` with current password, new password, repeat-new-password, a live rule checklist, and a static notice about the 3-attempt/24-hour lock.
- Add a BFF route `POST /api/staff/account/password` that forwards the request to the backend using the session bearer token. Passwords stay in memory: they are never written to storage, URLs, logs, or analytics.
- On success, the BFF clears the access-token, refresh-token, and renewal cookies in the same response; the client redirects to `/login?cambio=exito`, where the login page shows a success notice and asks the user to sign in with the new password.
- On failure, show the backend message: `400` for wrong current password, equal passwords, or Auth0 rejection; `423` for the active lock, which also disables the form; `401` redirects to login.
- Mirror the backend strength rules in the browser (8–32 code points, at least one uppercase, one lowercase, one digit or special character, and different from the current password) so that invalid strengths are blocked before consuming an attempt. The backend remains the authority.
- Add a "Cambiar contraseña" link in the `StaffShell` account area (reception, doctor, hospital admin) and in the platform-admin header.
- Extend the `proxy.ts` matcher with `/cuenta/:path*` so token renewal applies to the new page; `/api/staff/:path*` already covers the BFF route.
- Improve `lib/api/server.ts` so a field-keyed Bean Validation `400` surfaces its message instead of the generic fallback.
- Scope is staff web only. The patient flow already exists in the mobile app and is not duplicated here. No backend, database, or OpenAPI changes are required.

## Capabilities

### New Capabilities

- `staff/password-change`: authenticated staff password change page, client-side rule mirror, backend error/lock handling, and session closure after success.

### Modified Capabilities

None.

## Impact

- New routes: `app/cuenta/contrasena/page.tsx` and `app/api/staff/account/password/route.ts`.
- New feature code: form component and shared password-policy module under `features/auth/`.
- Modified: `components/staff-shell.tsx`, `features/admin/platform-admin-workspace.tsx`, `proxy.ts`, `app/login/page.tsx`, `app/globals.css`, `lib/api/server.ts`, and project docs.
- No new dependencies. The committed OpenAPI snapshot already documents the endpoint and request DTO.
- Security: passwords are never persisted client-side; the session cookies are HttpOnly; the refresh token is discarded on success; attempts and lock state are owned exclusively by the backend.
