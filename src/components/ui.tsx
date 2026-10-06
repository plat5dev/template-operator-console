import type { ReactNode } from "react"

export function When({ at }: { at: string | null | undefined }) {
  if (!at) return <span className="text-body-secondary">—</span>
  return <time dateTime={at} title={at}>{new Date(at).toLocaleString()}</time>
}

export function Id({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-body-secondary">—</span>
  return <code className="user-select-all">{value}</code>
}

const statusClass: Record<string, string> = {
  active: "text-bg-success",
  suspended: "text-bg-warning",
  removed: "text-bg-secondary",
  redeemed: "text-bg-info",
  revoked: "text-bg-secondary",
  expired: "text-bg-secondary",
}

export function Status({ value }: { value: string }) {
  return <span className={`badge ${statusClass[value] ?? "text-bg-light"}`}>{value}</span>
}

/** A two-column list of a resource's fields. Children are <Field>s. */
export function Fields({ children }: { children: ReactNode }) {
  return <dl className="row mb-0">{children}</dl>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="col-sm-3 text-body-secondary fw-normal">{label}</dt>
      <dd className="col-sm-9">{children}</dd>
    </>
  )
}

export function Loading() {
  return <div className="text-body-secondary small py-2">Loading…</div>
}

export function LoadMore({ show, loading, onClick }: { show: boolean; loading: boolean; onClick: () => void }) {
  if (!show) return null
  return (
    <button type="button" className="btn btn-outline-secondary btn-sm" disabled={loading} onClick={onClick}>
      {loading ? "Loading…" : "Load more"}
    </button>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-body-secondary small mb-0">{children}</p>
}
