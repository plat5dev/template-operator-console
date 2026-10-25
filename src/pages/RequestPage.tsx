import { useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { send, type RawResponse } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"
import { PageHead } from "../components/ui"
import { config } from "../config"

const methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]
const withBody = new Set(["POST", "PUT", "PATCH", "DELETE"])

function statusClass(status: number): string {
  return status < 400 ? "" : "badge-danger"
}

/**
 * Any method, any path, through the gateway with your token. For routes without a page,
 * and for seeing exactly what the gateway answers. `?method=&path=` prefills the form.
 */
export function RequestPage() {
  const [params, setParams] = useSearchParams()
  const [method, setMethod] = useState(methods.includes(params.get("method") ?? "") ? params.get("method")! : "GET")
  const [rawTarget, setTarget] = useState(params.get("path") ?? "/nodes?kind=organization")
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<RawResponse | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setRes(null)
    // A pasted full URL on the gateway is fine: keep its path.
    let target = rawTarget.trim()
    if (target.startsWith(config.gatewayUrl)) {
      target = target.slice(config.gatewayUrl.length) || "/"
      setTarget(target)
    }
    if (!target.startsWith("/")) {
      setError(new Error(`Enter a path on the gateway, starting with / (like /nodes), or a URL on ${config.gatewayUrl}`))
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
      <PageHead
        eyebrow="any route"
        title="Request"
        lede="Any method, any path, through the operator gateway with your operator token. For routes without a page, and for seeing exactly what the gateway answers. /as/{member_id} before a path acts as that member, where the route allows it."
      />
      <form className="stack-sm" onSubmit={(e) => void submit(e)}>
        <div className="input-group">
          <select
            className="select auto"
            style={{ width: "7.5rem" }}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            aria-label="Method"
          >
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <span
            className="addon"
            title="The operator gateway. Enter the path after it."
          >
            {config.gatewayUrl}
          </span>
          <input
            className="input mono"
            value={rawTarget}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Path on the gateway"
            placeholder="/nodes"
            spellCheck={false}
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Send
          </button>
        </div>
        {withBody.has(method) && (
          <textarea
            className="textarea mono"
            rows={6}
            placeholder='{ "display_name": "..." }'
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            aria-label="JSON body"
          />
        )}
      </form>

      <ErrorAlert error={error} />
      {res && (
        <div className="card">
          <div className="card-head small">
            <span className="cluster" style={{ gap: "1rem" }}>
              <span className={`badge ${statusClass(res.status)}`}>{res.status}</span>
              <span className="text-2">{res.ms} ms</span>
              {res.requestId && (
                <span className="text-2">
                  request_id <code className="select-all">{res.requestId}</code>
                </span>
              )}
            </span>
            {res.headers.get("Content-Type") && <span className="muted mono">{res.headers.get("Content-Type")}</span>}
          </div>
          <pre className="pre" style={{ maxHeight: "60vh", borderRadius: "0 0 var(--radius) var(--radius)" }}>
            {res.body !== null ? JSON.stringify(res.body, null, 2) : res.text || "(empty)"}
          </pre>
        </div>
      )}
    </>
  )
}
