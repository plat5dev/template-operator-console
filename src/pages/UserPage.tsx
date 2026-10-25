import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { usePaged, useResource } from "../api/hooks"
import type { Node, User } from "../api/identity"
import { AuditLog } from "../components/AuditLog"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeysTable } from "../components/KeysTable"
import { Empty, Field, Fields, Id, LoadMore, Loading, PageHead, Status, Tabs, When } from "../components/ui"

export type UserTab = "nodes" | "keys" | "audit-events"

/** A person, by user id: status and account deletion, then the nodes they can read,
 *  their personal keys, and their own audit log as tabs, each at its gateway path. */
export function UserPage({ tab = "nodes" }: { tab?: UserTab }) {
  const { userId = "" } = useParams()
  const navigate = useNavigate()
  const base = path`/users/${userId}`
  const user = useResource<User>(base)

  return (
    <>
      <PageHead
        crumbs={
          <>
            <Link to="/users">Users</Link>
            <span>User</span>
          </>
        }
        eyebrow={<Id value={userId} />}
        title={user.data?.name ?? "User"}
        actions={user.data && <Status value={user.data.status} />}
      />

      <Person base={base} user={user} />

      <div className="stack">
        <Tabs
          tabs={[
            ["nodes", "Nodes"],
            ["keys", "Personal keys"],
            ["audit-events", "Audit log"],
          ]}
          current={tab}
          onChange={(t) => navigate(`${base}/${t}`)}
        />
        {tab === "nodes" && <Nodes base={base} />}
        {tab === "keys" && <KeysTable base={base + "/keys"} />}
        {tab === "audit-events" && <AuditLog base={base} />}
      </div>
    </>
  )
}

/** The person: suspend, reactivate, and delete the account. */
function Person({ base, user }: { base: string; user: ReturnType<typeof useResource<User>> }) {
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)

  async function setStatus(status: User["status"]) {
    setError(null)
    try {
      user.setData(await api<User>("PATCH", base + "/status", { status }))
    } catch (err) {
      setError(err)
    }
  }

  async function remove() {
    if (
      !window.confirm(
        "Delete this account? The person is removed from every tree, and their personal keys and IdP links are deleted.",
      )
    )
      return
    setError(null)
    try {
      await api("DELETE", base)
      navigate("/users")
    } catch (err) {
      setError(err)
    }
  }

  if (user.loading && !user.data) return <Loading />
  if (!user.data) return <ErrorAlert error={user.error} />
  const u = user.data

  return (
    <div className="card">
      <div className="card-body">
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <Fields>
          <Field label="Name">{u.name ?? <span className="muted">none yet</span>}</Field>
          <Field label="Status">
            <Status value={u.status} />
          </Field>
        </Fields>
      </div>
      <div className="card-foot">
        {u.status === "active" && (
          <button type="button" className="btn btn-sm" onClick={() => void setStatus("suspended")}>
            Suspend
          </button>
        )}
        {u.status === "suspended" && (
          <button type="button" className="btn btn-sm" onClick={() => void setStatus("active")}>
            Reactivate
          </button>
        )}
        <button type="button" className="btn btn-danger btn-sm end" onClick={() => void remove()}>
          Delete account
        </button>
      </div>
    </div>
  )
}

/** Every node the person can read, across every tree (`GET /users/{user_id}/nodes`). */
function Nodes({ base }: { base: string }) {
  const [deleted, setDeleted] = useState(false)
  const list = usePaged<Node>(base + "/nodes" + (deleted ? "?status=deleted" : ""), "nodes")

  return (
    <>
      <label className="small cluster">
        <input type="checkbox" checked={deleted} onChange={(e) => setDeleted(e.target.checked)} /> Deleted ones
      </label>
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No nodes.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Node</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((n) => (
                <tr key={n.id}>
                  <td>
                    <Link className="list-title" to={path`/nodes/${n.id}`}>
                      {n.display_name}
                    </Link>
                    {n.ancestors.length > 0 && (
                      <span className="sub">in {n.ancestors.map((a) => a.display_name).join(" / ")}</span>
                    )}
                  </td>
                  <td className="small">{n.kind}</td>
                  <td>
                    <Status value={n.status} />
                  </td>
                  <td className="small text-2">
                    <When at={n.created_at} />
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
