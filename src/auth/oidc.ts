// Authorization code + PKCE against the staff IdP. Public client, no secret.
import * as oauth from "oauth4webapi"
import { config } from "../config"
import { writeSession, type Session } from "./session"

const issuer = new URL(config.issuer)
const client: oauth.Client = { client_id: config.clientId }
const clientAuth = oauth.None()

// oauth4webapi refuses plain http. Allow it for an IdP on this machine only.
const local = issuer.protocol === "http:" && ["localhost", "127.0.0.1"].includes(issuer.hostname)
const httpOptions = local ? { [oauth.allowInsecureRequests]: true } : {}

let server: Promise<oauth.AuthorizationServer> | undefined

function authorizationServer(): Promise<oauth.AuthorizationServer> {
  server ??= oauth
    .discoveryRequest(issuer, httpOptions)
    .then((res) => oauth.processDiscoveryResponse(issuer, res))
    .catch((err: unknown) => {
      server = undefined
      throw err
    })
  return server
}

type PendingLogin = { state: string; nonce: string; verifier: string; returnTo: string }

const PENDING = "operator-console.login"

export async function login(returnTo: string): Promise<void> {
  const as = await authorizationServer()
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

  const as = await authorizationServer()
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
  const result = await oauth.processAuthorizationCodeResponse(as, client, res, {
    expectedNonce: pending.nonce,
    requireIdToken: true,
  })
  const claims = oauth.getValidatedIdTokenClaims(result)!

  const session: Session = {
    accessToken: result.access_token,
    // No expires_in means unknown. Assume an hour; the gateway's 401 is the real answer.
    expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000,
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    name: typeof claims.name === "string" ? claims.name : null,
  }
  writeSession(session)
  return pending.returnTo
}
