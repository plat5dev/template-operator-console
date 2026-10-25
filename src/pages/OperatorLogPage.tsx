import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import type { OperatorAuditEvent } from "../api/audit"
import { path } from "../api/client"
import { useMemberNames, usePaged, type MemberName } from "../api/hooks"
import { NodeIds } from "../components/AuditLog"
import { ErrorAlert } from "../components/ErrorAlert"
import { METHODS, OUTCOMES, outcomeClass, toRfc3339 } from "../components/auditValues"
import { SelectFilter, TextFilter } from "../components/filters"
import { Empty, Field, Fields, Id, LoadMore, Loading, PageHead, When } from "../components/ui"

/** The text filters, by their query param on `GET /operator-audit-events`. */
const textFilters: [string, string][] = [
  ["node_id", "Node"],
  ["operator_id", "Operator"],
  ["acting_as_member_id", "Acting as"],
  ["service", "Service"],
  ["route", "Route"],
  ["request_id", "Request id"],
  ["created_id", "Created id"],
]

/** The operator log: every authenticated call through the operator gateway, this
 *  console's included, newest first. Its filters are the read's own query params, so
 *  `?node_id=` here is the log for that node and everything below it. */
export function OperatorLogPage() {
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d = Object.fromEntries(params)
    for (const key of ["occurred_after", "occurred_before"]) if (d[key]) d[key] = toLocal(d[key])
    return d
  })
  const [open, setOpen] = useState<string | null>(null)
  const query = params.toString()
  const list = usePaged<OperatorAuditEvent>("/operator-audit-events" + (query ? `?${query}` : ""), "audit_events")
  const names = useMemberNames(
    list.items.flatMap((e) => (e.acting_as && e.root_id ? [{ rootId: e.root_id, memberId: e.acting_as.member_id }] : [])),
  )

  const set = (key: string) => (value: string) => setDraft({ ...draft, [key]: value })

  function apply(e: FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(draft)) {
      const v = key.startsWith("occurred_") ? toRfc3339(value) : value.trim()
      if (v) next.set(key, v)
    }
    setOpen(null)
    setParams(next)
  }

  function clear() {
    setDraft({})
    setOpen(null)
    setParams({})
  }

  return (
    <>
      <PageHead
        eyebrow="/operator-audit-events"
        title="Operator log"
        lede="Every call an operator made through the operator gateway, newest first. Customers' own requests are in each node's and person's audit log."
      />

      <form className="inset" onSubmit={apply}>
        <div className="form-row">
          {textFilters.map(([key, label]) => (
            <TextFilter key={key} label={label} value={draft[key] ?? ""} onChange={set(key)} />
          ))}
          <SelectFilter label="Method" value={draft.method ?? ""} options={METHODS} onChange={set("method")} />
          <SelectFilter label="Outcome" value={draft.outcome ?? ""} options={OUTCOMES} onChange={set("outcome")} />
          <TextFilter
            label="From"
            type="datetime-local"
            value={draft.occurred_after ?? ""}
            onChange={set("occurred_after")}
          />
          <TextFilter
            label="Before"
            type="datetime-local"
            value={draft.occurred_before ?? ""}
            onChange={set("occurred_before")}
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
        <Empty>{query ? "No operator audit events match these filters." : "No operator audit events yet."}</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Operator</th>
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
                  name={event.acting_as ? names.get(event.acting_as.member_id) : undefined}
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
  event: OperatorAuditEvent
  name?: MemberName
  open: boolean
  onToggle: () => void
}) {
  const { actor, acting_as } = event
  return (
    <>
      <tr>
        <td className="small nowrap text-2">
          <When at={event.occurred_at} />
        </td>
        <td className="small">
          {actor.email ?? <code>{actor.operator_id}</code>}
          {actor.client_id && <div className="sub">{actor.client_id}</div>}
          {acting_as && event.root_id && (
            <div className="sub">
              as{" "}
              <Link to={path`/nodes/${event.root_id}/members/${acting_as.member_id}`} title={acting_as.member_id}>
                {name?.name ?? acting_as.member_id}
              </Link>
            </div>
          )}
        </td>
        <td className="small">
          <div>
            <code>{event.method}</code> <code>{event.route ?? event.path}</code>
          </div>
          <span className="sub mono">{event.request_id}</span>
        </td>
        <td className="small">{event.service ?? <span className="muted">no route</span>}</td>
        <td className="nowrap">
          <span className={`badge ${outcomeClass[event.outcome]}`}>
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

function EventDetails({ event }: { event: OperatorAuditEvent }) {
  const params = Object.entries(event.params).sort(([a], [b]) => a.localeCompare(b))
  return (
    <Fields>
      {event.nodes.length > 0 && (
        <Field label="Nodes">
          <NodeIds nodes={event.nodes} />
        </Field>
      )}
      <Field label="Issuer">
        <code>{event.actor.issuer}</code>
      </Field>
      <Field label="Operator id">
        <Id value={event.actor.operator_id} />
      </Field>
      {event.created_id && (
        <Field label="Created">
          <Id value={event.created_id} />
        </Field>
      )}
      <Field label="IP">
        <Id value={event.ip} />
      </Field>
      <Field label="User agent">{event.user_agent ?? "—"}</Field>
      <Field label="Response bytes">{event.response_bytes ?? "—"}</Field>
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
        {event.details == null ? "—" : <pre className="pre wrap">{JSON.stringify(event.details, null, 2)}</pre>}
      </Field>
    </Fields>
  )
}

/** An RFC 3339 time as a datetime-local value, for the form. */
function toLocal(rfc3339: string): string {
  const d = new Date(rfc3339)
  if (Number.isNaN(d.getTime())) return ""
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
