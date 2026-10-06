import { useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { send, type RawResponse } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"
import { config } from "../config"

const methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]
const withBody = new Set(["POST", "PUT", "PATCH", "DELETE"])

function statusClass(status: number): string {
  if (status < 300) return "text-bg-success"
  if (status < 500) return "text-bg-warning"
  return "text-bg-danger"
}

/**
 * Any method, any path, through the gateway with your token. For routes without a page,
 * and for seeing exactly what the gateway answers. `?method=&path=` prefills the form.
 */
export function RequestPage() {
  const [params, setParams] = useSearchParams()
  const [method, setMethod] = useState(methods.includes(params.get("method") ?? "") ? params.get("method")! : "GET")
  const [target, setTarget] = useState(params.get("path") ?? "/organizations")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<RawResponse | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setRes(null)
    if (!target.startsWith("/")) {
      setError(new Error("Path must start with /"))
      return
    }
    let payload: string | undefined
    if (withBody.has(method) && body.trim() !== "") {
      try {
        JSON.parse(body)
      } catch {
        setError(new Error("Body is not valid JSON"))
        return
      }
      payload = body
    }
    setParams({ method, path: target }, { replace: true })
    setBusy(true)
    try {
      setRes(await send(method, target, payload))
    } catch (err) {
      // fetch only throws when there is no response: network, DNS, or CORS.
      setError(new Error(`No response from ${config.gatewayUrl}. Is it up, and is this origin in its ALLOWED_ORIGINS?`))
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">Request</h1>
      <form onSubmit={(e) => void submit(e)}>
        <div className="input-group mb-2">
          <select
            className="form-select flex-grow-0"
            style={{ width: "8rem" }}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            aria-label="Method"
          >
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <span className="input-group-text font-monospace small">{config.gatewayUrl}</span>
          <input
            className="form-control font-monospace"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Path"
            spellCheck={false}
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Send
          </button>
        </div>
        {withBody.has(method) && (
          <textarea
            className="form-control font-monospace small mb-2"
            rows={6}
            placeholder='{ "name": "..." }'
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            aria-label="JSON body"
          />
        )}
      </form>

      <ErrorAlert error={error} />
      {res && (
        <div className="card mt-3">
          <div className="card-header d-flex flex-wrap gap-3 align-items-center small">
            <span className={`badge ${statusClass(res.status)}`}>{res.status}</span>
            <span>{res.ms} ms</span>
            {res.requestId && (
              <span>
                request_id <code className="user-select-all">{res.requestId}</code>
              </span>
            )}
            {res.headers.get("Content-Type") && <span className="text-body-secondary">{res.headers.get("Content-Type")}</span>}
          </div>
          <pre className="card-body mb-0 small" style={{ maxHeight: "60vh", overflow: "auto" }}>
            {res.body !== null ? JSON.stringify(res.body, null, 2) : res.text || <span className="text-body-secondary">(empty)</span>}
          </pre>
        </div>
      )}
    </>
  )
}
