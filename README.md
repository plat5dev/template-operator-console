# Operator console

A console for your operators, on the [operator gateway](https://github.com/plat5dev/operator): every tree of nodes and every person, their bindings, members, service accounts, keys, invites, tasks and audit logs, the operator log, and a raw request page for anything else.

It is a static SPA. It signs operators in with OIDC (authorization code + PKCE), then calls the gateway's paths, by node id, with the operator token. It has no backend, no secrets, and keeps nothing. The gateway authenticates and records who did what in the operator log.

`plat5 init` copies it into a project's `operator-console/` folder, beside the API starter, as the CLI's [starters](https://github.com/plat5dev/cli#starters) section says; `--no-operator-console` leaves it out. It is a starting point the project owns: change anything.

The deployment's kinds are declared in `src/api/kinds.ts`, as its `plat5.yml` declares them: each kind's parent, and what its nodes are called. A node's page has a tab for each kind of child. A project's Tasks tab calls the starter API, not Plat5: `GET /projects/{project_id}/tasks`, which every `template-*-api` starter serves and routes for operators, read-only, in its `routes.operator.yml`. Without that route the tab says so; with a starter of your own, change `src/api/tasks.ts` and the tab to its shapes.

To add a page: a file in `src/pages/`, a route in `src/App.tsx`, a link in `src/components/Layout.tsx`. Read with `useResource` / `usePaged` (`src/api/hooks.ts`), write with `api()` (`src/api/client.ts`). The path must be in the operator gateway's routes: the project's `operator.routes.yml`.

Stack: Vite · React · TypeScript · [oauth4webapi](https://github.com/panva/oauth4webapi), with plain CSS: design tokens (`src/styles/tokens.css`) and components (`src/styles/ui.css`), no UI framework.

It wears the operator plane's look: plat5.com's paper and ink with an amber accent, an amber bar across the top that names who is signed in, and an `operator` tag beside the wordmark. The customer console is violet and Plat5 itself is blue, so nobody mistakes the operator plane for the product. Light or dark follows the system; the console stores no choice.

## Run

`plat5 start` runs it at `http://localhost:5412` with the CLI's [operator module](https://github.com/plat5dev/cli#what-plat5-start-runs), with this folder mounted into the Vite dev server: edit a file and the page reloads. Sign in as `operator@example.com` / `password`. The module runs what the console calls: the operator gateway, on the project's `operator.routes.yml`, and the operator IdP, by default at `:5410` and `:5411`. `plat5 start` passes them to `docker-compose.yml` as `PLAT5_OPERATOR_URL`, `PLAT5_OPERATOR_AUTH_URL` and `PLAT5_OPERATOR_CLIENT_ID` (`operator-console`), and both allow the console's origin, `operator.console.web` in `plat5.dev.yml`.

With the module off (`modules.operator: false` in `plat5.dev.yml`), or for a run with `plat5 start -x operator`, the folder stays and `plat5 start` doesn't run it.

On your own machine instead, against a running stack (`plat5 start -x app`):

```bash
bun install
cp .env.example .env.local   # plat5 start's gateway, IdP and client
bun run dev --port 5412      # http://localhost:5412
```

Keep `:5412`: the operator IdP and the operator gateway allow only `operator.console.web`'s origin. Against any other gateway and IdP, put their [settings](#settings) in `.env.local`; `bun run dev` alone serves `http://localhost:5173`, and the IdP client then needs `http://localhost:5173/callback`, and the gateway `http://localhost:5173` in `ALLOWED_ORIGINS`.

```bash
bun run lint
bun run build
```

## What it needs

| | |
|--|--|
| A gateway | `VITE_GATEWAY_URL`. The gateway's `ALLOWED_ORIGINS` includes this console's origin |
| An operator IdP | `VITE_AUTH_ISSUER`. Equal to the gateway's `AUTH_ISSUER`, character for character |
| A public client at that IdP | `VITE_AUTH_CLIENT_ID`. No secret, PKCE, redirect URI `<console origin>/callback` |
| An audience the gateway accepts | The access token's `aud` is in the gateway's `AUTH_AUDIENCES` |

`plat5 start`'s operator module sets all four up for the console it runs.

The console sends the **access token**. The ID token, when the IdP returns one, only supplies the name shown in the header.

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

## Build an image

The Dockerfile's last stage serves the console with nginx on `:8080`. Its settings are the container's environment, read at start, so one image serves any deployment:

```bash
docker build -t operator-console .
docker run -p 5412:8080 \
  -e GATEWAY_URL=http://localhost:5410 \
  -e AUTH_ISSUER=http://localhost:5411 \
  -e AUTH_CLIENT_ID=operator-console \
  operator-console
```

`AUTH_SCOPES` and `AUTH_AUDIENCE` are optional, like their `VITE_` twins.

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
| Plat5 Auth | Publishes OAuth 2.0 metadata, not OIDC, and returns no ID token: the console falls back to both, and shows the email from the access token (`properties.email`, with `AUTH_TOKEN_EMAIL=true` on the issuer). Add the client id to `AUTH_ALLOWED_CLIENTS`, `<origin>/callback` to `AUTH_ALLOWED_REDIRECT_URIS`, and the origin to `AUTH_ALLOWED_ORIGINS`. Access token `aud` is the client id |

Plain `http` issuers are refused except on `localhost` and `127.0.0.1`.

## Behaviour

- **Token**: kept in `sessionStorage`. It survives a reload, not a closed tab. No cookies, no refresh tokens. When it expires, or the gateway answers 401, sign in again.
- **Sign out** drops the token. The IdP's own session is left alone.
- **Paths**: console URLs mirror the gateway paths they call. `/nodes/{id}/bindings` here calls `GET /nodes/{id}/bindings` there.
- **Acting as a member**: a node's children and a project's tasks can be listed acting as a member of the tree, picked on the tab. The console path becomes `/as/{member_id}/…`, the gateway path it calls; a child created there gives that member the creator role. Leaving the tab stops it. Access is still the operator's.
- **Errors** show the Plat5 envelope and the `X-Request-ID`. That id finds the request in the operator log and in the service's log.
- **Request** page: any method and path through the gateway, with the raw response. For routes without a page. `?method=&path=` prefills it.
- **Keys** are listed and revoked, never created. The gateway doesn't route key creation, so operators never hold a customer secret. Invites are listed and revoked too, never created: their tokens are secrets as well.

## Pages

| Console path | Gateway calls |
|--------------|---------------|
| `/nodes?kind=organization` | `GET /nodes?kind=&status=`; `POST /roots/{kind}` |
| `/nodes/{id}` | `GET PATCH DELETE /nodes/{id}`, `POST …/restore`, `POST …/release-slug` (a purged root), and its first tab |
| `/nodes/{id}/children/{kind}` | `GET /nodes?parent_id=&kind=&status=`; `POST /nodes/{id}/children/{kind}` |
| `/as/{member_id}/nodes/{id}/children/{kind}` | `GET POST /as/{member_id}/nodes/{id}/children/{kind}` |
| `/projects/{id}/tasks`, `/as/{member_id}/projects/{id}/tasks` | The starter API's `GET /projects/{id}/tasks` |
| `/nodes/{id}/bindings` | `GET POST /nodes/{id}/bindings`, `PATCH DELETE …/{binding_id}` |
| `/nodes/{id}/members` | `GET POST /nodes/{root_id}/members` (a root) |
| `/nodes/{root_id}/members/{member_id}` | `GET DELETE`, `GET /members/{member_id}/user`, `GET /nodes/{root_id}/memberships/{member_id}` |
| `/nodes/{id}/service-accounts`, `…/{service_account_id}` | `GET PATCH DELETE`, and its keys: `GET`, `DELETE …/keys/{key_id}` |
| `/nodes/{id}/invites` | `GET`, `DELETE …/{invite_id}` |
| `/nodes/{id}/roles` | `GET /nodes/{id}/roles` |
| `/nodes/{id}/audit-events` | Plat5 audit's `GET /nodes/{id}/audit-events` |
| `/users?issuer=&subject=` | `GET /users?issuer=&subject=` |
| `/users/{id}`, `…/nodes`, `…/keys`, `…/audit-events` | `GET DELETE /users/{id}`, `PATCH …/status`, `GET …/nodes`, `GET DELETE …/keys`, audit's `GET …/audit-events` |
| `/operator-audit-events` | `GET /operator-audit-events`, its filters as the query (`?node_id=`) |
| `/request` | anything |

These follow the operator gateway's shipped `routes.yml` and the starters' `routes.operator.yml`. If your gateway routes more, add a page or use Request.

## Layout

```
src/
  config.ts          settings
  auth/              OIDC (oidc.ts), token storage (session.ts), React context
  api/               fetch wrapper (client.ts), list hooks, the kinds, identity, audit and task types
  components/        layout, error envelope, node crumbs and tables, keys table, audit log
  pages/             one per console path
```
