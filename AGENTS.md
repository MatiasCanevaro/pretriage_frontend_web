<!-- BEGIN:nextjs-agent-rules -->

## Version-matched Next.js guidance

This project uses Next.js 15.5.28. Read the official Next.js 15 documentation
(https://nextjs.org/docs/15) before changing framework APIs. Use bundled guides
under node_modules/next/dist/docs/ when present; this directory and Next.js 16's
generated agent guidance are not guaranteed to exist in Next.js 15.

<!-- END:nextjs-agent-rules -->

# Pretriage Staff Frontend

Read docs/development.md and docs/backend-contract.md before changing code.

## Sources of truth

- Backend implementation and generated OpenAPI own paths, DTOs, authorization, and transitions.
- TanStack Query owns remote state; do not duplicate it in global stores.
- Priority and queue ordering are backend-owned and read-only.
- Only reception triage drafts may use sessionStorage, keyed by admission ID.
- Never store tokens, DNI, patient identity, or clinical data in localStorage, logs, analytics, or URLs.
- Disable mutations while pending and refetch authoritative state afterward.

## Working rules

- Build one vertical workflow at a time, beginning with reception.
- Do not invent missing contracts; record blockers in docs/backend-contract.md.
- Keep Server Components as the default.
- Update docs when routes, contracts, environment variables, or verification commands change.

## Next.js DevTools MCP

- This project uses Next.js 15.5.28. `.mcp.json` retains the `next-devtools-mcp` utility, but the built-in `/_next/mcp` endpoint exists only in Next.js 16 and later. Runtime MCP inspection is unavailable with this pinned version.
- Do not require `get_errors` or other Next.js MCP runtime tools. Use typecheck, lint, contract tests and production build; validate browser behavior in an Amplify preview.
- Read version-matched documentation before changing framework APIs. If `node_modules/next/dist/docs/` is absent in this Next.js 15 installation, use the official Next.js 15 documentation.

## Verification

- `npm run test:contracts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
