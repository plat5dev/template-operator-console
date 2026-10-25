import type { ReactNode } from "react"

export function When({ at }: { at: string | null | undefined }) {
  if (!at) return <span className="muted">—</span>
  return <time dateTime={at} title={at}>{new Date(at).toLocaleString()}</time>
}

export function Id({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="muted">—</span>
  return <code className="select-all">{value}</code>
}

/** State by shape: filled is active, hollow is paused, struck is over. */
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value}</span>
}

/** A two-column list of a resource's fields. Children are <Field>s. */
export function Fields({ children }: { children: ReactNode }) {
  return <dl className="fields">{children}</dl>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

export function Loading() {
  return <div className="loading">Loading…</div>
}

export function LoadMore({ show, loading, onClick }: { show: boolean; loading: boolean; onClick: () => void }) {
  if (!show) return null
  return (
    <div>
      <button type="button" className="btn btn-sm" disabled={loading} onClick={onClick}>
        {loading ? "Loading…" : "Load more"}
      </button>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="list empty">{children}</div>
}

/** A page's title row: crumbs and an eyebrow above, actions on the right. */
export function PageHead({
  title,
  lede,
  eyebrow,
  crumbs,
  actions,
}: {
  title: ReactNode
  lede?: ReactNode
  eyebrow?: ReactNode
  crumbs?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="grow">
        {crumbs && <nav className="crumbs" aria-label="Breadcrumb">{crumbs}</nav>}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

/** Tabs as buttons. The current one is underlined. */
export function Tabs<T extends string>({
  tabs,
  current,
  onChange,
}: {
  tabs: [T, string][]
  current: T
  onChange: (t: T) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={current === key}
          className="tab"
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** A select of a node tree's roles, for a binding, a member or an invite. */
export function RoleSelect({
  roles,
  value,
  onChange,
  small = false,
}: {
  roles: string[]
  value: string
  onChange: (role: string) => void
  small?: boolean
}) {
  return (
    <select
      className={`select auto${small ? " select-sm" : ""}`}
      aria-label="Role"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
    >
      <option value="" disabled>
        Role
      </option>
      {roles.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  )
}
