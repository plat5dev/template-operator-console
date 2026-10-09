import { useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import type { AuditEvent } from "../api/audit"
import { path } from "../api/client"
import { usePaged } from "../api/hooks"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, Field, Fields, Id, LoadMore, Loading, When } from "../components/ui"

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]
const OUTCOMES = ["pending", "rejected", "responded", "no_response"]

type Filters = {
  service: string
  method: string
  outcome: string
  actor: string
  requestId: string
  after: string
  before: string
}

const emptyFilters: Filters = {
  service: "",
  method: "",
  outcome: "",
  actor: "",
  requestId: "",
  after: "",
  before: "",
}

const outcomeClass: Record<string, string> = {
  pending: "text-bg-warning",
  rejected: "text-bg-danger",
  responded: "text-bg-light",
  no_response: "text-bg-secondary",
}

export function AuditEventsPage() {
  const { organizationId = "" } = useParams()
  const base = path`/organizations/${organizationId}`
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const list = usePaged<AuditEvent>(base + "/audit-events" + queryOf(applied), "audit_events")

  function apply(e: FormEvent) {
    e.preventDefault()
    if (!timesOk(draft)) {
      setFilterError("From and before must be valid times.")
      return
    }
    setFilterError(null)
    setOpen(null)
    setApplied(draft)
  }

  function clear() {
    setDraft(emptyFilters)
    setApplied(emptyFilters)
    setFilterError(null)
    setOpen(null)
  }

  return (
    <>
      <nav className="small mb-2">
        <Link to="/organizations">Organizations</Link>
        {" / "}
        <Link to={base}>
          <code>{organizationId}</code>
        </Link>
      </nav>
      <h1 className="h3 mb-1">Audit log</h1>
      <p className="text-body-secondary small">
        Recorded by the customer gateway. Newest first. A staff call through this console is not in it.
      </p>

      <form className="mb-3" onSubmit={apply}>
        {filterError && <div className="alert alert-danger py-2 small">{filterError}</div>}
        <div className="row g-2 align-items-end">
          <TextFilter label="Service" value={draft.service} onChange={(service) => setDraft({ ...draft, service })} />
          <SelectFilter
            label="Method"
            value={draft.method}
            options={METHODS}
            onChange={(method) => setDraft({ ...draft, method })}
          />
          <SelectFilter
            label="Outcome"
            value={draft.outcome}
            options={OUTCOMES}
            onChange={(outcome) => setDraft({ ...draft, outcome })}
          />
          <TextFilter
            label="Actor"
            value={draft.actor}
            placeholder="member_id"
            onChange={(actor) => setDraft({ ...draft, actor })}
          />
          <TextFilter
            label="Request id"
            value={draft.requestId}
            onChange={(requestId) => setDraft({ ...draft, requestId })}
          />
          <TextFilter
            label="From"
            type="datetime-local"
            value={draft.after}
            onChange={(after) => setDraft({ ...draft, after })}
          />
          <TextFilter
            label="Before"
            type="datetime-local"
            value={draft.before}
            onChange={(before) => setDraft({ ...draft, before })}
          />
          <div className="col-auto d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm">
              Filter
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clear}>
              Clear
            </button>
          </div>
        </div>
      </form>

      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>{hasFilter(applied) ? "No audit events match these filters." : "No audit events."}</Empty>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Request</th>
                <th>Service</th>
                <th>Outcome</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.items.map((event) => (
                <EventRows
                  key={event.id}
                  event={event}
                  open={open === event.id}
                  onToggle={() => setOpen(open === event.id ? null : event.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}

function EventRows({ event, open, onToggle }: { event: AuditEvent; open: boolean; onToggle: () => void }) {
  const actor = event.actor
  return (
    <>
      <tr>
        <td className="small text-nowrap">
          <When at={event.occurred_at} />
        </td>
        <td className="small">
          <Link to={path`/members/${actor.member_id}`}>
            <code>{actor.member_id}</code>
          </Link>
          <div className="text-body-secondary">
            {actor.auth_type}
            {actor.key_prefix && ` · ${actor.key_prefix}`}
          </div>
        </td>
        <td className="small">
          <div>
            <code>{event.method}</code> <code>{event.route}</code>
          </div>
          <Id value={event.request_id} />
        </td>
        <td className="small">{event.service}</td>
        <td className="text-nowrap">
          <span className={`badge ${outcomeClass[event.outcome] ?? "text-bg-light"}`}>{event.outcome}</span>
          {event.status !== null && <span className="small ms-1">{event.status}</span>}
        </td>
        <td className="text-end">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onToggle}>
            {open ? "Hide" : "Details"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="bg-body-tertiary">
            <EventDetails event={event} />
          </td>
        </tr>
      )}
    </>
  )
}

function EventDetails({ event }: { event: AuditEvent }) {
  const params = Object.entries(event.params).sort(([a], [b]) => a.localeCompare(b))
  return (
    <Fields>
      <Field label="IP">
        <Id value={event.ip} />
      </Field>
      <Field label="User agent">{event.user_agent ?? "—"}</Field>
      <Field label="Params">
        {params.length === 0
          ? "—"
          : params.map(([name, value]) => (
              <div key={name}>
                <code>{name}</code> {value}
              </div>
            ))}
      </Field>
      <Field label="Details">
        {event.details == null ? (
          "—"
        ) : (
          <pre className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(event.details, null, 2)}
          </pre>
        )}
      </Field>
    </Fields>
  )
}

function TextFilter({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="col-6 col-lg">
      <label className="form-label small mb-1">{label}</label>
      <input
        className="form-control form-control-sm"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="col-6 col-lg">
      <label className="form-label small mb-1">{label}</label>
      <select className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function queryOf(f: Filters): string {
  const q = new URLSearchParams()
  const put = (key: string, value: string) => {
    const v = value.trim()
    if (v) q.set(key, v)
  }
  put("service", f.service)
  put("method", f.method)
  put("outcome", f.outcome)
  put("actor_member_id", f.actor)
  put("request_id", f.requestId)
  const after = toRfc3339(f.after)
  const before = toRfc3339(f.before)
  if (after) q.set("occurred_after", after)
  if (before) q.set("occurred_before", before)
  const s = q.toString()
  return s ? `?${s}` : ""
}

function toRfc3339(local: string): string {
  const v = local.trim()
  if (!v) return ""
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString()
}

function timesOk(f: Filters): boolean {
  return (!f.after.trim() || toRfc3339(f.after) !== "") && (!f.before.trim() || toRfc3339(f.before) !== "")
}

function hasFilter(f: Filters): boolean {
  return Object.values(f).some((v) => v.trim() !== "")
}
