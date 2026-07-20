# Web/BFF session foundation

## User outcome

The local commercial web path can establish a browser session without exposing the opaque platform credential to client-side JavaScript, list the authenticated user's active organizations, and clear the browser session. The flow remains entirely local and does not deploy to Vercel or AWS.

## Implemented slice

- Added the authenticated platform endpoint `GET /api/v1/me/organizations` behind the global deny-by-default guard.
- Added server-only platform configuration, opaque-session parsing, bounded upstream requests, request correlation, and Zod response validation in the Next.js BFF.
- Added `POST /api/auth/local-session`, restricted to non-production, an explicit feature flag, loopback requests, exact same-origin mutations, and an owner-only regular token file.
- Added `DELETE /api/auth/session` with exact same-origin enforcement.
- Added `GET /api/platform/me/organizations`; the browser never sends the platform credential in JavaScript-visible headers or storage.
- Added `/account` with visible loading, unauthenticated, authenticated, empty, upstream-unavailable, mutation-loading, mutation-success, and mutation-failure states.
- Production accepts only the `__Host-axiom` cookie name. The local cookie is ignored when the local-development feature flag is unavailable.

## Security boundary

The local installer is a development bridge, not a production login mechanism. It refuses production mode, non-loopback URLs, missing or cross-origin `Origin` headers, invalid token shapes, and token files readable by group or other users. The response never contains the token. Both organization reads use `Cache-Control: no-store`.

The future identity adapter must verify a real email/OIDC login before issuing the production `__Host-axiom` cookie with `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/`. Rotation, MFA, recovery, concurrent-session policy, and server-side logout/revocation remain open work.

## Verification evidence — 2026-07-21

- `pnpm lint`: passed.
- `pnpm typecheck`: passed after Next route types were regenerated.
- `pnpm exec vitest run tests/platform-session.test.ts`: 5 tests passed.
- The local Playwright flow passed: unauthenticated account, local session installation, current-user organization read through the BFF, visible `OWNER` membership, and sign-out back to unauthenticated state.
- The wider browser run executed five existing journey tests successfully while first exposing a strict contract mismatch for `ORG-LOCAL-DEVELOPMENT`; the Zod schema then received the exact hyphenated stable-ID regression case.
- `pnpm build`: passed with the documented Webpack production-build fallback.

Next.js 16.2.10's default Turbopack production build remained in `Creating an optimized production build ...` beyond repeated bounded windows. The same application compiled, type-checked, generated all 14 static pages, and collected traces with the installed CLI's supported `--webpack` mode. `pnpm build` now selects that measured fallback; see ADR 0014.

## Next slice

Move organization-scoped project reads from the prototype Next.js routes into the platform API. Require the authenticated organization membership on every repository query and prove same-organization access, cross-organization denial, and no-leak not-found behavior against PostgreSQL before migrating writes.
