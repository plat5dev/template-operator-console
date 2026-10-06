import { ApiError } from "../api/client"

function reason(body: unknown): string | null {
  const details = (body as { error?: { details?: { reason?: unknown } } } | null)?.error?.details
  return typeof details?.reason === "string" ? details.reason : null
}

const hints: Record<number, string> = {
  403: "Denied by the gateway's authorization policy.",
  503: "The gateway, its IdP keys, or the service behind it is unavailable.",
}

/** Shows the Plat5 error envelope. The request id joins this to the gateway's attribution log. */
export function ErrorAlert({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!error) return null

  if (!(error instanceof ApiError)) {
    const message = error instanceof Error ? error.message : String(error)
    return (
      <div className="alert alert-danger" role="alert">
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
    <div className="alert alert-danger" role="alert">
      <div className="d-flex">
        <div className="flex-grow-1">
          <strong className="me-2">{error.code}</strong>
          {error.message}
          {hints[error.status] && <div className="small mt-1">{hints[error.status]}</div>}
          <div className="small font-monospace mt-1">{meta}</div>
        </div>
        {onDismiss && <button type="button" className="btn-close" aria-label="Close" onClick={onDismiss} />}
      </div>
    </div>
  )
}
