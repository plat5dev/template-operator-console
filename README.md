# Operator Console

An example console for the [operator gateway](https://github.com/plat5dev/operator). Fork it, point it at your gateway and staff IdP, deploy it to Cloudflare Pages.

It is a static SPA. It signs staff in with OIDC (authorization code + PKCE), then calls gateway paths with the staff token. It has no backend, no secrets, and keeps nothing. The gateway authenticates, authorizes, and logs who did what.

Not part of the gateway. Not required. Write your own, or use none.

Stack: Vite · React · TypeScript · Bootstrap · [oauth4webapi](https://github.com/panva/oauth4webapi).

## What it needs

| | |
|--|--|
| A gateway | `VITE_GATEWAY_URL`. The gateway's `ALLOWED_ORIGINS` includes this console's origin |
| A staff IdP | `VITE_AUTH_ISSUER`. Equal to the gateway's `AUTH_ISSUER`, character for character |
| A public client at that IdP | `VITE_AUTH_CLIENT_ID`. No secret, PKCE, redirect URI `<console origin>/callback` |
| An audience the gateway accepts | The access token's `aud` is in the gateway's `AUTH_AUDIENCES` |

The console sends the **access token**. The ID token only supplies the name shown in the header.

## Settings

Build-time. Vite inlines them, so each deployment is its own build. The build fails if a required one is missing.

| Variable | |
|----------|--|
| `VITE_GATEWAY_URL` | Required. Gateway origin, e.g. `https://operator.example.com` |
| `VITE_AUTH_ISSUER` | Required. Issuer URL |
| `VITE_AUTH_CLIENT_ID` | Required. Public client id |
| `VITE_AUTH_SCOPES` | Optional. Default `openid email profile` |
| `VITE_AUTH_AUDIENCE` | Optional. Sent as `audience` on `/authorize`, for IdPs that use it (Auth0) |

The redirect URI is always `<origin>/callback`.

## Deploy to Cloudflare Pages

1. Fork this repo.
2. Pages → Create → Connect to Git → pick the fork.
3. Build command `bun run build`. Output directory `dist`.
4. Environment variables: the settings above, plus `BUN_VERSION` (e.g. `1.3.14`). The Pages default Bun can be too old for `bun.lock`.
5. Deploy. Note the production origin, e.g. `https://operator-console.pages.dev`.
6. At the IdP, add `<origin>/callback` as a redirect URI on the client.
7. On the gateway, add the origin to `ALLOWED_ORIGINS`.

Pages serves `index.html` for unknown paths, so deep links work. `public/_headers` stops framing and indexing.

**Preview deployments** get their own origins (`<hash>.<project>.pages.dev`). Sign-in and gateway calls fail there unless that origin is registered at the IdP and the gateway. Either register a stable branch alias or use production only.

**Access**: the console is public static files; the gateway is the boundary. Put Cloudflare Access in front of the Pages project if you also want to hide the UI.

## IdP notes

| IdP | |
|-----|--|
| Okta | SPA app integration, PKCE. Use a custom authorization server so access tokens are JWTs; its audience (e.g. `api://operator`) goes in `AUTH_AUDIENCES`. Issuer is the authorization server's, e.g. `https://example.okta.com/oauth2/default` |
| Dex | Static client with `public: true` and the redirect URI. Add the console origin to `web.allowedOrigins` so the browser can call `/token`. Access token `aud` is the client id |
| Auth0 | SPA application. Set `VITE_AUTH_AUDIENCE` to the API identifier; the same value goes in `AUTH_AUDIENCES` |

Plain `http` issuers are refused except on `localhost` and `127.0.0.1`.

## Run locally

```bash
bun install
cp .env.example .env.local   # point at a running gateway and IdP
bun run dev                  # http://localhost:5173
```

The IdP client needs `http://localhost:5173/callback`, and the gateway needs `http://localhost:5173` in `ALLOWED_ORIGINS`.

```bash
bun run lint
bun run build
```

## Behaviour

- **Token**: kept in `sessionStorage`. It survives a reload, not a closed tab. No cookies, no refresh tokens. When it expires, or the gateway answers 401, sign in again.
- **Sign out** drops the token. The IdP's own session is left alone.
- **Paths**: console URLs mirror the gateway paths they call. `/organizations/{id}` here calls `GET /organizations/{id}` there.
- **Errors** show the Plat5 envelope and the `X-Request-ID`. That id finds the request in the gateway's attribution log and in the service's log.
- **Request** page: any method and path through the gateway, with the raw response. For routes without a page. `?method=&path=` prefills it.
- **API keys** are listed and revoked, never created. The gateway does not route key creation, so operators never hold a customer secret.

## Pages

| Console path | Gateway calls |
|--------------|---------------|
| `/organizations` | `GET /organizations` |
| `/organizations/{id}` | `GET PATCH DELETE /organizations/{id}`; members, invites, service accounts under it |
| `/organizations/{id}/service-accounts/{id}` | `GET PATCH DELETE`, and its API keys |
| `/members/{id}` | `GET PATCH DELETE /members/{id}`, and its API keys |
| `/users/{id}` | memberships, API keys, `POST /users/{id}/organizations` |
| `/request` | anything |

These follow the identity routes in the gateway's default `routes.yml`. If your gateway routes more, add a page or use Request.

## Layout

```
src/
  config.ts          settings
  auth/              OIDC (oidc.ts), token storage (session.ts), React context
  api/               fetch wrapper (client.ts), list hooks, identity types
  components/        layout, error envelope, keys table
  pages/             one per console path
```
