<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
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

- This project uses Next.js 16 and configures the official `next-devtools-mcp` server in `.mcp.json`.
- Start the development server with `npm run dev`; the MCP server discovers the running Next.js instance and communicates with its built-in `/_next/mcp` endpoint.
- Use the MCP runtime tools before and after UI or runtime changes. At minimum, call `get_errors`; use `get_routes`, `get_page_metadata`, `get_project_metadata`, and `get_logs` when relevant.
- Treat the running MCP result as the source of truth for current build, configuration, browser runtime, and hydration errors. A production build alone does not expose browser-session errors.
- If `get_errors` reports a stale-module or unavailable-module-factory error, hard-refresh the affected browser page or clear its browser cache, then query `get_errors` again before changing application code.
- Read `node_modules/next/dist/docs/01-app/02-guides/mcp.md` for the version-matched MCP contract instead of relying on remembered Next.js behavior.

## Verification

- Next.js DevTools MCP `get_errors` returns no configuration, build, or runtime errors.
- npm run typecheck
- npm run lint
- npm run build
