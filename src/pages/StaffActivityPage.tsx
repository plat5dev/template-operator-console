import type { StaffAuditEvent } from "../api/audit"
import { usePaged } from "../api/hooks"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, LoadMore, Loading, PageHead, When } from "../components/ui"

/** What staff did through the operator gateway, this console included. */
export function StaffActivityPage() {
  const list = usePaged<StaffAuditEvent>("/operator-audit-events", "audit_events")

  return (
    <>
      <PageHead
        eyebrow="/operator-audit-events"
        title="Staff activity"
        lede="Every call staff made through the operator gateway, newest first. Customers' own actions are in each organization's and person's audit log."
      />
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No staff activity yet.</Empty>
      ) : (
        <div className="table-wrap">
        <table className="table">
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
                <td className="small nowrap text-2">
                  <When at={e.occurred_at} />
                </td>
                <td className="small">{e.actor.email ?? <code>{e.actor.operator_id}</code>}</td>
                <td className="small">
                  <code>
                    {e.method} {e.path ?? e.route}
                  </code>
                </td>
                <td>
                  <span className={`badge ${e.outcome === "pending" || e.outcome === "no_response" ? "badge-dashed" : e.outcome === "rejected" || (e.status ?? 0) >= 400 ? "badge-danger" : ""}`}>
                    {e.outcome}
                    {e.status != null && ` ${e.status}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}
