// Build-time settings. vite.config.ts refuses to build without the required ones. See .env.example.
const env = import.meta.env

export const config = {
  gatewayUrl: (env.VITE_GATEWAY_URL as string).replace(/\/$/, ""),
  issuer: env.VITE_AUTH_ISSUER as string,
  clientId: env.VITE_AUTH_CLIENT_ID as string,
  scopes: (env.VITE_AUTH_SCOPES as string | undefined) || "openid email profile",
  audience: (env.VITE_AUTH_AUDIENCE as string | undefined) || "",
  redirectUri: `${window.location.origin}/callback`,
} as const
