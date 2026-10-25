# Design

## Context

See `proposal.md` for motivation and `specs/staff/password-change/spec.md` for the behavior contract. The relevant current state:

- The staff web is a Next.js App Router app with HttpOnly session cookies (access, refresh, renewal marker), server-side token renewal in `proxy.ts`, and same-origin BFF routes under `app/api/staff/` that attach the bearer token with `backendRequest`.
- The backend endpoint `POST /api/auth/cambio-contrasenia/actual` already exists and is protected. It returns `200` on success, `400` with `{ error }` for wrong current password, equal passwords, Auth0 rejection, or Bean Validation field maps, and `423` with `{ error }` while locked. The third failed attempt returns `400` and sets the 24-hour lock; the next attempt returns `423`.
- The public token-based reset flow (`features/auth/password-reset-flow.tsx`) is not reusable: it has different strength rules (8–72, digit and special) and does not ask for the current password.
- The mobile patient app already implements this flow; this change is staff-web-only.
- The repository has no automated test runner configured. Verification is `npm run typecheck`, `npm run lint`, `npm run build`, and the Next.js DevTools MCP error check.

## Goals / Non-Goals

**Goals:**

- One authenticated staff surface for changing the password, usable by every staff role, with rules mirrored from the backend and backend-owned attempt/lock behavior.
- Keep passwords out of persisted or inspectable client surfaces and keep bearer tokens out of the browser.
- Close the session atomically with the successful response and require a fresh login.

**Non-Goals:**

- Patient web UI, backend changes, or Auth0 token revocation.
- Client-side attempt counting or lock timers.
- Regenerating the OpenAPI snapshot; the endpoint and DTO are already documented.
- Reusing the public reset flow or its validation rules.

## Decisions

### D1. Standalone page at `/cuenta/contrasena`

The page lives outside `StaffShell` because the shell requires `hospitalId`, `hospitalName`, and hospital roles, while the page must also work for platform admins and users with zero or multiple memberships. A server component calls `getSession()` and redirects to `/login` when absent, then renders the client form inside the existing public card styles.

The page does not include a "Volver" button (product decision). The user leaves with the browser's back navigation or by using the header link again from a workspace.

Alternative considered: embedding the form in each workspace. Rejected because it duplicates the page and ties a global account action to a hospital context.

### D2. BFF route `POST /api/staff/account/password`

The route accepts `{ contraseniaActual, contraseniaNueva }`, validates both as non-empty strings capped at 256 characters with Zod, and forwards them to the backend with `backendRequest`, which attaches the session bearer. The body is never logged.

On success it returns the backend payload and calls `clearSessionCookies(response)` on the same response, so the access token, refresh token, and renewal cookie are removed atomically with the successful change. It also applies the existing no-store headers.

On error it returns `apiErrorResponse(error)`. If the error is a `BackendApiError` with status `401`, it also clears the session cookies before responding, preventing a redirect loop where `/login` would still see a locally valid session.

Alternatives considered:

- Client calls `/api/auth/logout` after success: rejected because it adds a second round trip and leaves a window with a live session if the logout call fails.
- Browser calls the backend directly: rejected because it would expose bearer tokens to the browser.

### D3. Client form uses a plain submit handler, not `useMutation`

`features/auth/password-change-form.tsx` keeps the three field values in component state and submits with a plain `fetch` to the BFF, following the existing `LoginForm` precedent. This keeps passwords out of TanStack Query's mutation cache and devtools. TanStack Query remains responsible for remote state elsewhere; this is a one-shot sensitive action followed by navigation.

On success the form clears the query cache and `sessionStorage` (consistent with the logout button), then calls `window.location.replace("/login?cambio=exito")`. A full navigation makes the cleared cookies authoritative and replaces the history entry so "Volver" does not reopen the form with stale client state.

Inputs use `autoComplete="current-password"` and `"new-password"`, `spellCheck={false}`, and no visibility toggle, matching the existing login form.

Alternative considered: `useMutation` with `void` variables. Rejected as unnecessary indirection for a form that redirects on success.

### D4. Shared password policy module

`features/auth/password-policy.ts` is the single source for the checklist and submit gating:

- Length uses `Array.from(value).length`, matching the backend's code-point counting.
- Uppercase and lowercase use `\p{Lu}` and `\p{Ll}` with the `u` flag.
- Digit-or-special uses `(\p{Nd}|[^\p{L}\p{Nd} \t\n\u000B\f\r])`, mirroring Java's `\p{Nd}` and its ASCII-only `\s`.
- A rule compares the new password with the current one so an equal password is blocked before consuming an attempt.

The module exposes an ordered list of `{ id, label, valid }` rules plus `isNewPasswordValid`. The form renders the list live and disables submit while any rule fails, the repetition does not match, the current password is empty, or a request is pending.

Alternative considered: HTML `pattern` attributes. Rejected because the regex dialect differs from Java, the rules cannot be presented as a live checklist, and the equal-to-current rule needs both fields.

### D5. Error and lock handling

- `400`: show the message returned by the BFF in an alert region; keep the form usable. Clear only the current-password field and focus it, so an accidental second submission with the same wrong value is less likely.
- `423`: show the backend message (which includes the remaining minutes) and set a local `blocked` flag that disables inputs and submit for the current view. Refreshing the page rebuilds the form, but the backend still returns `423`; the client never computes the lock.
- `401`: full navigation to `/login`.
- `502`/`504`/`5xx`: show the transport message and keep the form usable. Attempts, including internal errors, are counted only by the backend.
- The static 3-attempt/24-hour notice is always visible before the first submit.

The third failure nuance is deliberate: the backend returns `400` on the attempt that reaches the limit, so the UI cannot know the lock is active until the next attempt returns `423`. The design does not infer it.

### D6. Login success banner

`app/login/page.tsx` reads `searchParams` (a Promise in this Next.js version) and, when `cambio === "exito"`, renders a success notice above the form: the password was updated and the user must sign in with the new one. The flag is not sensitive, is not persisted, and disappears on the next navigation.

Alternative considered: a dedicated success page. Rejected because it duplicates the login screen and adds a route with no additional information.

### D7. Entry links

- `components/staff-shell.tsx`: add a `Link` labelled "Cambiar contraseña" in the `topbar-account` group, using the existing `logout-link` link style, next to "Salir".
- `features/admin/platform-admin-workspace.tsx`: add the same link to `acciones-admin-plataforma`, using the existing `button button-secondary` style next to the logout button.
- No link in the workspace selector (product decision).

Alternative considered: a sidebar navigation item. Rejected because a rare account action does not need a permanent navigation slot.

### D8. Proxy matcher

Add `"/cuenta/:path*"` to the `proxy.ts` matcher. Without it, a page request with an expired access token but a valid refresh token would be redirected to login instead of renewing the session. `/api/staff/:path*` already covers the new BFF route.

### D9. Field-keyed 400 normalization

Extend `safeMessage` in `lib/api/server.ts`: after checking `message` and `error`, if the payload is an object, use the first own enumerable string value as a candidate, subject to the existing trim, length, and technical-details filters. This surfaces Bean Validation messages such as `{ "contraseniaNueva": "La contraseña debe..." }` instead of the generic fallback.

Alternative considered: handling it inside the new BFF. Rejected because `BackendApiError` has already collapsed the payload by then; carrying the raw payload would be a larger change to the shared transport.

Trade-off: a payload with multiple field errors has no guaranteed order, so any of the rule messages may be shown. That is acceptable for this form because the client mirrors the rules and should prevent these responses in normal use.

### D10. Documentation

Update `docs/backend-contract.md` with the staff-web usage of the endpoint, the real error shapes (`{ error }` for service errors, field maps for Bean Validation), the `423` behavior, and the fact that success discards the cookies but does not revoke the Auth0 grant. Note the absence of a backend logout/revoke endpoint as a known limitation, not as a blocker for H0019.

## Risks / Trade-offs

- **Client rules drift from the backend** → keep them in one policy module, use Unicode property escapes and code-point length, and keep the backend as the final authority with field-message normalization as a safety net.
- **Third failed attempt returns `400` while the lock is already set** → show the backend message, do not infer the lock, and let the next attempt return `423`. The static notice explains the policy.
- **No Auth0-side revocation** → the browser loses the refresh token, but a previously exfiltrated token could remain valid until expiry or rotation. Documented; a real revocation requires a backend change.
- **Passwords in React state** → unavoidable for controlled inputs; they are never persisted, the component unmounts on redirect, and no passwords enter the query cache. Clearing the current-password field on `400` reduces accidental repeated attempts.
- **Back/bfcache after success** → `location.replace`, the proxy's no-store headers, and the server-side session guard prevent the form from reappearing with the old session.
- **Lock state only lives in the current view** → a refresh re-enables the form visually, but the backend still rejects with `423`; duplicating the lock in client storage would violate the backend-owned rule.
- **Password managers and autofill** → use the standard `current-password` and `new-password` autocomplete tokens.

## Migration Plan

1. Add the policy module, the BFF route, the page, and the form.
2. Add the entry links and the proxy matcher in the same deploy so the links never point to a missing route.
3. Update `docs/backend-contract.md`.
4. Verify with `npm run typecheck`, `npm run lint`, `npm run build`, the Next.js DevTools MCP error check, and manual flows: success, wrong current password, weak password, equal passwords, blocked account (3 failures on a disposable account), and expired session.

Rollback is a frontend revert; the backend, database, and OpenAPI snapshot are unaffected. No feature flag is needed because the route is additive and the links are the only entry points.
