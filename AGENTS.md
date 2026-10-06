# Operator Console — agent contract

An example client of the operator gateway. A static SPA for Cloudflare Pages. The gateway's `docs/` are law for anything it does; this repo only calls it.

## Locked

| Invariant | |
|-----------|--|
| Static files only. No server, no functions, no secrets | Deployable by forking to Pages |
| Login is authorization code + PKCE with a public client | `src/auth/oidc.ts` |
| The access token goes to the gateway and nowhere else | `src/api/client.ts` |
| Token in `sessionStorage`. No cookies, no refresh tokens | `src/auth/session.ts` |
| Settings are build-time `VITE_*`. Required ones fail the build | `vite.config.ts` |
| Console paths mirror the gateway paths they call | `src/App.tsx` |
| Errors show the envelope and `X-Request-ID` | `src/components/ErrorAlert.tsx` |

## Stop conditions

- Authorization in the console: hiding, filtering, or role checks. The gateway decides; a 403 is shown as a 403
- Calling a service, the IdP's admin API, or anything but the gateway and the IdP's OIDC endpoints
- Creating customer credentials (API keys, member sessions), even if a gateway routes it
- Storing anything beyond the session token and the in-flight login
- Dev stacks, compose files, or IdP config in this repo. Local stacks live in the CLI and toolbox
- Changes to operator, plat5, or Auth for this repo's convenience

## Working here

1. `bun run lint && bun run build` before calling it done.
2. Don't commit unless asked.
