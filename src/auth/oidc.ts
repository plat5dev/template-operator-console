// Authorization code + PKCE against the operator IdP. Public client, no secret.
import * as oauth from "oauth4webapi"
import { config } from "../config"
import { writeSession, type Session } from "./session"

const issuer = new URL(config.issuer)
const client: oauth.Client = { client_id: config.clientId }
const clientAuth = oauth.None()

// oauth4webapi refuses plain http. Allow it for an IdP on this machine only.
const local = issuer.protocol === "http:" && ["localhost", "127.0.0.1"].includes(issuer.hostname)
const httpOptions = local ? { [oauth.allowInsecureRequests]: true } : {}

// oidc: the IdP published OIDC discovery, so the token response carries an ID token
// and the nonce is checked.
type Discovered = { as: oauth.AuthorizationServer; oidc: boolean }

let server: Promise<Discovered> | undefined

async function discoverAs(algorithm: "oidc" | "oauth2"): Promise<Discovered> {
  const res = await oauth.discoveryRequest(issuer, { ...httpOptions, algorithm })
  return { as: await oauth.processDiscoveryResponse(issuer, res), oidc: algorithm === "oidc" }
}

// OIDC discovery, else OAuth 2.0 metadata (RFC 8414) for IdPs that only publish that,
// such as Plat5 Auth.
async function discover(): Promise<Discovered> {
  try {
    return await discoverAs("oidc")
  } catch (err) {
    try {
      return await discoverAs("oauth2")
    } catch {
      throw err
    }
  }
}

function authorizationServer(): Promise<Discovered> {
  server ??= discover().catch((err: unknown) => {
    server = undefined
    throw err
  })
  return server
}

// Discovery is fetched when the app loads, so sign-in doesn't wait for it. A failure
// is fetched again, and shown, when sign-in needs it.
authorizationServer().catch(() => {})

type PendingLogin = { state: string; nonce: string; verifier: string; returnTo: string }

const PENDING = "operator-console.login"

export async function login(returnTo: string): Promise<void> {
  const { as } = await authorizationServer()
  if (!as.authorization_endpoint) throw new Error("IdP has no authorization_endpoint")
  const pending: PendingLogin = {
    state: oauth.generateRandomState(),
    nonce: oauth.generateRandomNonce(),
    verifier: oauth.generateRandomCodeVerifier(),
    returnTo,
  }
  sessionStorage.setItem(PENDING, JSON.stringify(pending))

  const url = new URL(as.authorization_endpoint)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", config.scopes)
  url.searchParams.set("state", pending.state)
  url.searchParams.set("nonce", pending.nonce)
  url.searchParams.set("code_challenge", await oauth.calculatePKCECodeChallenge(pending.verifier))
  url.searchParams.set("code_challenge_method", "S256")
  if (config.audience) url.searchParams.set("audience", config.audience)
  window.location.assign(url)
}

// One exchange per callback URL. StrictMode runs effects twice; a code is single use.
const exchanges = new Map<string, Promise<string>>()

export function completeLogin(callbackUrl: string): Promise<string> {
  let p = exchanges.get(callbackUrl)
  if (!p) {
    p = exchange(new URL(callbackUrl))
    exchanges.set(callbackUrl, p)
  }
  return p
}

async function exchange(callbackUrl: URL): Promise<string> {
  const raw = sessionStorage.getItem(PENDING)
  sessionStorage.removeItem(PENDING)
  if (!raw) throw new Error("No sign-in in progress in this tab. Start again.")
  const pending = JSON.parse(raw) as PendingLogin

  const { as, oidc } = await authorizationServer()
  const params = oauth.validateAuthResponse(as, client, callbackUrl, pending.state)
  const res = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    params,
    config.redirectUri,
    pending.verifier,
    httpOptions,
  )
  // An OIDC IdP returns an ID token, checked here. A plain OAuth IdP (Plat5 Auth) does not.
  const result = await oauth.processAuthorizationCodeResponse(
    as,
    client,
    res,
    oidc ? { expectedNonce: pending.nonce, requireIdToken: true } : undefined,
  )
  const who = oauth.getValidatedIdTokenClaims(result) ?? accessTokenClaims(result.access_token)

  const session: Session = {
    accessToken: result.access_token,
    // No expires_in means unknown. Assume an hour; the gateway's 401 is the real answer.
    expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000,
    sub: typeof who.sub === "string" ? who.sub : "",
    email: stringClaim(who, "email"),
    name: stringClaim(who, "name"),
  }
  writeSession(session)
  return pending.returnTo
}

// Without an ID token, the name in the header comes from the access token's claims.
// Display only: unverified here, and the gateway verifies the token on every call.
function accessTokenClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1]
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const claims = JSON.parse(json) as unknown
    return typeof claims === "object" && claims !== null ? (claims as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// A claim at the top level, else under properties (Plat5 Auth's subject properties).
function stringClaim(claims: Record<string, unknown>, name: string): string | null {
  const top = claims[name]
  if (typeof top === "string") return top
  const props = claims.properties
  if (typeof props === "object" && props !== null) {
    const nested = (props as Record<string, unknown>)[name]
    if (typeof nested === "string") return nested
  }
  return null
}
