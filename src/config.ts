// Settings, from /config.js when the container image wrote one at start (see docker/),
// else from the build (VITE_*, see .env.example). Runtime wins, so one image serves any
// deployment. main.tsx refuses to start without the required ones.
type Settings = {
  gatewayUrl?: string
  issuer?: string
  clientId?: string
  scopes?: string
  audience?: string
}

const runtime: Settings = (window as { __CONSOLE_CONFIG__?: Settings }).__CONSOLE_CONFIG__ ?? {}
const env = import.meta.env

function setting(name: keyof Settings, build: string | undefined): string {
  return (runtime[name] || build || "").trim()
}

export const config = {
  gatewayUrl: setting("gatewayUrl", env.VITE_GATEWAY_URL).replace(/\/$/, ""),
  issuer: setting("issuer", env.VITE_AUTH_ISSUER),
  clientId: setting("clientId", env.VITE_AUTH_CLIENT_ID),
  scopes: setting("scopes", env.VITE_AUTH_SCOPES) || "openid email profile",
  audience: setting("audience", env.VITE_AUTH_AUDIENCE),
  redirectUri: `${window.location.origin}/callback`,
} as const

/** Required settings that are empty: the console would point at nothing. */
export const missingSettings = (
  [
    ["gatewayUrl", "GATEWAY_URL"],
    ["issuer", "AUTH_ISSUER"],
    ["clientId", "AUTH_CLIENT_ID"],
  ] as const
)
  .filter(([key]) => !config[key])
  .map(([, name]) => name)
