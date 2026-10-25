import { ApiError } from "../api/client"

function reason(body: unknown): string | null {
  const details = (body as { error?: { details?: { reason?: unknown } } } | null)?.error?.details
  return typeof details?.reason === "string" ? details.reason : null
}

const hints: Record<number, string> = {
  502: "The service behind the gateway didn't answer.",
  503: "The gateway's IdP keys, the operator log, identity, or the service behind it is unavailable.",
}

/** Shows the Plat5 error envelope. The request id joins this to the operator log and the service's log. */
export function ErrorAlert({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!error) return null

  if (!(error instanceof ApiError)) {
    const message = error instanceof Error ? error.message : String(error)
    return (
      <div className="alert alert-error" role="alert">
        {message}
      </div>
    )
  }

  const meta = [
    `HTTP ${error.status}`,
    reason(error.body) && `reason=${reason(error.body)}`,
    error.requestId && `request_id=${error.requestId}`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className={`alert alert-error${onDismiss ? " has-close" : ""}`} role="alert">
      <div>
        <span className="alert-title">{error.code}</span> {error.message}
      </div>
      {hints[error.status] && <div className="small">{hints[error.status]}</div>}
      <div className="alert-meta">{meta}</div>
      {onDismiss && (
        <button type="button" className="alert-close" aria-label="Close" onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  )
}
