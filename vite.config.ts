import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

// A console built without these would point at nothing. Fail the build instead,
// unless the build is for the container image (--mode runtime), which reads them
// from /config.js at start.
const required = ["VITE_GATEWAY_URL", "VITE_AUTH_ISSUER", "VITE_AUTH_CLIENT_ID"]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const missing = required.filter((name) => !env[name])
  if (mode !== "runtime" && missing.length > 0) {
    throw new Error(`Missing ${missing.join(", ")}. See .env.example.`)
  }
  return { plugins: [react()] }
})
