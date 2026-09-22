# Hospital administration UX improvements

## Scope

Improve staff invitations and add an explicit review step before sector creation.
The existing hospital, sector and invitation contracts remain unchanged. All form
drafts and delivery secrets stay in component memory.

## Staff invitation

- Use one form with clear groups: recipient, roles/permissions, and conditional
  professional details.
- Represent reception, medicine and hospital administration as labeled checkbox
  cards with short descriptions. Multiple roles remain supported.
- Show registration type, number, province and specialties only when medicine is
  selected. National registration sends `NACION`; provincial registration requires
  an explicit province.
- Select specialties by name from the hospital's enabled catalog instead of typing
  IDs. Require at least one for medical invitations. Explain an empty catalog and
  link to hospital configuration.
- Validate the current selections against authoritative configuration before
  submission, including after a refresh removes a previously enabled specialty.
- Present field errors next to inputs, move focus to the first invalid control,
  and preserve entered values on request failure.
- Prevent duplicate requests and keep controls disabled until mutation and query
  refresh finish. Distinguish successful email delivery from local handoff.

## Sector confirmation

- The first submission validates the form and opens a modal without a request.
- Show the normalized name, specialty name, and initial active state.
- Allow returning to the form or cancelling with Escape without losing values.
- Confirm against a snapshot of the reviewed data, verifying that its specialty
  remains enabled. Submit only once, even under repeated clicks or keyboard input.
- Keep the dialog open and prevent cancellation while the request and refresh are
  pending. Show request errors inside it so users can retry or return to editing.
- Close and reset only after success; announce creation and restore keyboard focus.

## Specialty confirmation and email copy

- The recipient field has one visible label, “Correo electrónico”, with helper
  text below the input; no repeated heading/label.
- Enabling a specialty opens the same confirmation dialog pattern, showing its
  name and the effect within the current hospital. Cancel/Escape sends no request;
  confirmation disables repeated submission through mutation and refresh. Errors
  remain in the dialog for retry. Success restores focus to the configuration
  heading because the enabling button becomes an enabled-specialty badge.
- Enabling a specialty does not clear an unfinished sector draft.

## Visual and accessibility requirements

Use existing colors, typography, buttons and spacing with scoped styles. Role cards
stack on narrow screens. Inputs and dialog content must fit at 320px width. The
dialog has a bounded height and scrolls internally on short screens. Preserve
visible focus, native checkbox semantics, accessible group labels and error
descriptions. Put initial dialog focus on the return action and contain Tab focus.

## Verification

Check reception-only, administration-only, medical and combined roles; national
and provincial registration; empty and changed specialty catalogs; invalid input;
pending, error and success states. Cancellation must send zero sector mutations;
repeated confirmation must send one. Check desktop/mobile layout and keyboard
navigation, including Escape, focus restoration and Tab containment.

Use intercepted test responses for invitation submission so validation does not
send email or create staff access. Keep real credentials out of fixtures, logs and
screenshots. Run typecheck, lint, build and Next.js MCP runtime error checks.

## Verification completed (2026-09-21)

- Chrome with intercepted admin responses: sector review/cancel sends zero
  mutations; repeated confirmation sends one request; failed creation can retry;
  success clears the form after refresh. Tab wraps inside the dialog, Escape
  preserves values, and focus falls back to the configuration heading when the
  selected specialty becomes unavailable.
- Invitation checks cover reception, administration, combined medical roles,
  national/provincial credentials, duplicate clicks, request failure, local handoff,
  sent mail and pending delivery. Catalog changes block stale selections and offer
  explicit removal; an empty catalog links to configuration.
- Visual inspection at desktop and 320px width confirmed scoped styles, stacked
  role cards and dialog actions, and no horizontal overflow in either component.
- Typecheck, lint and production build passed. Next.js MCP returned empty
  configuration/session error arrays; Chrome reported no uncaught page errors.
- Test submissions used synthetic intercepted responses; no real invitation or
  configuration mutation was sent to the backend.
