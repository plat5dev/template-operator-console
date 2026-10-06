// Every call goes to the gateway with the staff token. The path names the target.
import { config } from "../config"
import { readSession } from "../auth/session"

export type ErrorEnvelope = {
  error: {
    type: string
    code: string
    message: string
    request_id: string | null
    details?: unknown
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | null
  readonly body: unknown

  constructor(status: number, message: string, code: string, requestId: string | null, body: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.requestId = requestId
    this.body = body
  }
}

export type RawResponse = {
  status: number
  requestId: string | null
  headers: Headers
  body: unknown
  text: string
  ms: number
}

let onUnauthorized: () => void = () => {}

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn
}

/** Sends one request and returns whatever came back. Never throws on HTTP status. */
export async function send(method: string, path: string, body?: unknown): Promise<RawResponse> {
  const headers = new Headers({ Accept: "application/json" })
  const token = readSession()?.accessToken
  if (token) headers.set("Authorization", `Bearer ${token}`)
  let payload: string | undefined
  if (body !== undefined) {
    headers.set("Content-Type", "application/json")
    payload = typeof body === "string" ? body : JSON.stringify(body)
  }

  const start = performance.now()
  const res = await fetch(`${config.gatewayUrl}${path}`, { method, headers, body: payload })
  const text = await res.text()
  const ms = Math.round(performance.now() - start)

  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }
  if (res.status === 401) onUnauthorized()
  return { status: res.status, requestId: res.headers.get("X-Request-ID"), headers: res.headers, body: parsed, text, ms }
}

/** Sends one request and returns the JSON body. Non-2xx throws ApiError. */
export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await send(method, path, body)
  if (res.status >= 200 && res.status < 300) return res.body as T
  const env = (res.body as ErrorEnvelope | null)?.error
  throw new ApiError(
    res.status,
    env?.message || res.text || `HTTP ${res.status}`,
    env?.code || "HTTP_ERROR",
    env?.request_id ?? res.requestId,
    res.body ?? res.text,
  )
}

/** Builds a path with every interpolated value encoded as one segment. */
export function path(strings: TemplateStringsArray, ...values: string[]): string {
  return strings.reduce((out, s, i) => out + s + (i < values.length ? encodeURIComponent(values[i]) : ""), "")
}
