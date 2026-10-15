import type { StaffAuditEvent } from "../api/audit"
import { usePaged } from "../api/hooks"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, LoadMore, Loading, When } from "../components/ui"

/** What staff did through the operator gateway, this console included. */
export function StaffActivityPage() {
  const list = usePaged<StaffAuditEvent>("/operator-audit-events", "audit_events")

  return (
    <>
      <h1 className="h3 mb-1">Staff activity</h1>
      <p className="text-body-secondary small">
        Every call staff made through the operator gateway, newest first. Customers' own actions are in each
        organization's and person's audit log.
      </p>
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No staff activity yet.</Empty>
      ) : (
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Request</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((e) => (
              <tr key={e.id}>
                <td className="small text-nowrap">
                  <When at={e.occurred_at} />
                </td>
                <td className="small">{e.actor.email ?? <code>{e.actor.operator_id}</code>}</td>
                <td className="small">
                  <code>
                    {e.method} {e.path ?? e.route}
                  </code>
                </td>
                <td className="small">
                  {e.outcome}
                  {e.status != null && ` ${e.status}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}
