import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import type { AuditEvent } from "../api/audit"
import { path } from "../api/client"
import { useMemberNames, usePaged } from "../api/hooks"
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
  createdId: string
  after: string
  before: string
}

const emptyFilters: Filters = {
  service: "",
  method: "",
  outcome: "",
  actor: "",
  requestId: "",
  createdId: "",
  after: "",
  before: "",
}

// Pending is unknown, never success: dashed. Refused: red.
const outcomeClass: Record<string, string> = {
  pending: "badge-dashed",
  rejected: "badge-danger",
  responded: "",
  no_response: "badge-dashed",
}

/** An org's log, or a person's: `base` is `/organizations/{id}` or `/users/{id}`. */
export function AuditLog({ base, person }: { base: string; person: boolean }) {
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const list = usePaged<AuditEvent>(base + "/audit-events" + queryOf(applied), "audit_events")
  const names = useMemberNames(list.items.flatMap((e) => (e.actor.member_id ? [e.actor.member_id] : [])))

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
      <p className="section-lede">
        {person
          ? "What this person did with their account, through user routes. What they did inside an org is in that org's log. "
          : ""}
        Recorded by the customer gateway. Newest first. A staff call through this console is not in it: that is
        under <Link to="/staff-activity">Staff activity</Link>.
      </p>

      <form className="inset" onSubmit={apply}>
        {filterError && <div className="alert alert-error">{filterError}</div>}
        <div className="form-row">
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
            label="Created id"
            value={draft.createdId}
            onChange={(createdId) => setDraft({ ...draft, createdId })}
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
          <div className="cluster">
            <button type="submit" className="btn btn-primary btn-sm">
              Filter
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
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
        <div className="table-wrap">
          <table className="table">
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
                  name={event.actor.member_id ? names.get(event.actor.member_id) : undefined}
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

function EventRows({
  event,
  name,
  open,
  onToggle,
}: {
  event: AuditEvent
  name?: { name: string | null; serviceAccount: boolean }
  open: boolean
  onToggle: () => void
}) {
  const actor = event.actor
  return (
    <>
      <tr>
        <td className="small nowrap text-2">
          <When at={event.occurred_at} />
        </td>
        <td className="small">
          {actor.member_id ? (
            <Link to={path`/members/${actor.member_id}`} title={actor.member_id}>
              {name?.name ?? <code>{actor.member_id}</code>}
            </Link>
          ) : (
            "the person"
          )}
          <div className="sub">
            {name?.serviceAccount && "service account · "}
            {actor.auth_type}
            {actor.key_prefix && ` · ${actor.key_prefix}`}
          </div>
        </td>
        <td className="small">
          <div>
            <code>{event.method}</code> <code>{event.route}</code>
          </div>
          <span className="sub mono">{event.request_id}</span>
        </td>
        <td className="small">{event.service}</td>
        <td className="nowrap">
          <span className={`badge ${outcomeClass[event.outcome] ?? ""}`}>
            {event.outcome}
            {event.status !== null && ` ${event.status}`}
          </span>
        </td>
        <td className="actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onToggle}>
            {open ? "Hide" : "Details"}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="detail">
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
      {event.user_id && event.organization_id && (
        <Field label="Organization">
          <Link to={path`/organizations/${event.organization_id}`}>
            <code>{event.organization_id}</code>
          </Link>
        </Field>
      )}
      {event.created_id && (
        <Field label="Created">
          <Id value={event.created_id} />
        </Field>
      )}
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
          <pre className="pre wrap">
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
    <div className="field">
      <label className="small">{label}</label>
      <input
        className="input input-sm"
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
    <div className="field">
      <label className="small">{label}</label>
      <select className="select select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
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
  put("created_id", f.createdId)
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
