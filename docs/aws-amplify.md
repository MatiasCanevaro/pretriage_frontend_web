# AWS Amplify Web Deployment

The web app is pinned to Next.js 15.5.28 for the Amplify SSR deployment. The
production build and checks passed in an isolated evaluation before applying the
same changes here. `amplify.yml` at the repository root builds the Next.js SSR
artifact from `.next`; it does not add SPA rewrites.

## Build settings

Amplify uses Node.js 22, runs `npm ci`, and builds the `.next` artifact. Configure
`BACKEND_API_URL` as a non-secret Amplify build environment variable with value
`https://api.pretriage.com.ar`. The build writes that value to `.env.production`
before `next build`, which bakes it into the server bundle for SSR and middleware;
Amplify build variables are not automatically available to the deployed Next.js
server runtime. Do not use a `NEXT_PUBLIC_` prefix for this server-only URL and
do not place credentials or tokens in build settings.

The scoped npm override pins `next`'s nested PostCSS dependency to 8.5.23. This
clears the high finding observed in the Next.js 15 lockfile; `npm audit` still
reports moderate findings, so the dependency tree is not represented as fully
vulnerability-free. Revisit the override and audit when updating Next.js.

## Preview checks

1. Connect the repository and deploy a preview build before configuring the
   production hostname.
2. Confirm the preview builds the SSR artifact and can reach the HTTPS backend.
3. Validate SSR with the anonymous login page, a protected-page redirect, and
   the backend health endpoint. Do not expect successful staff login, token refresh,
   or staff workflows yet: the fresh database and administrator/user bootstrap are
   deferred until later. Recheck cookie rotation and authenticated BFF behavior after
   those records are deliberately created.
4. Do not add a blanket SPA fallback rewrite; it would send server/API paths to
   `index.html`.
5. After preview validation, associate `app.pretriage.com.ar` with Amplify and
   configure only the records Amplify requests for that hostname. DNS ownership
   and the API origin are documented in the backend AWS deployment guide.

The deployment will use a fresh database. Do not seed demonstration records,
administrators, or users during frontend preview validation; that work is deferred
until later.

## Limits

Next.js 15 does not expose the built-in Next.js DevTools MCP endpoint available
in Next.js 16+, so `.mcp.json` cannot provide runtime error or route inspection
for this pin. Use preview browser checks and the repository verification
commands instead. The deployment guide for the backend contains the current
Next.js 16 support boundary and DNS/TLS configuration details.
