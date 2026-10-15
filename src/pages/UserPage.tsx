import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ApiError, api, path } from "../api/client"
import { usePaged, useResource } from "../api/hooks"
import type { Membership, Organization, OrganizationRef, User } from "../api/identity"
import { AuditLog } from "../components/AuditLog"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeysTable } from "../components/KeysTable"
import { Empty, Field, Fields, Id, LoadMore, Loading, Status, When } from "../components/ui"

type Tab = "memberships" | "keys" | "audit"

/** A person, with their memberships, user keys, and audit log as tabs. The audit tab
 *  has its own URL (`…/audit-events`), so a link can open it. */
export function UserPage({ audit = false }: { audit?: boolean }) {
  const { userId = "" } = useParams()
  const navigate = useNavigate()
  const base = path`/users/${userId}`
  const [listTab, setListTab] = useState<Exclude<Tab, "audit">>("memberships")
  const tab: Tab = audit ? "audit" : listTab
  function setTab(t: Tab) {
    if (t === "audit") {
      navigate(base + "/audit-events")
      return
    }
    setListTab(t)
    if (audit) navigate(base)
  }

  return (
    <>
      <nav className="small mb-2">
        <Link to="/users">Users</Link>
      </nav>
      <h1 className="h3 mb-3">
        User <Id value={userId} />
      </h1>

      <Person base={base} />

      <ul className="nav nav-tabs mb-3">
        {(
          [
            ["memberships", "Memberships"],
            ["keys", "User API keys"],
            ["audit", "Audit log"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button type="button" className={`nav-link ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          </li>
        ))}
      </ul>
      {tab === "memberships" && <Memberships base={base} />}
      {tab === "keys" && <KeysTable base={base + "/api-keys"} />}
      {tab === "audit" && <AuditLog base={base} person />}
    </>
  )
}

function Memberships({ base }: { base: string }) {
  const memberships = usePaged<Membership>(base + "/memberships", "memberships")
  return (
    <>
      <ErrorAlert error={memberships.error} />
      {memberships.loading && memberships.items.length === 0 ? (
        <Loading />
      ) : memberships.items.length === 0 ? (
        <Empty>No active memberships.</Empty>
      ) : (
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Member</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {memberships.items.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={path`/organizations/${m.organization.id}`}>{m.organization.name}</Link>
                </td>
                <td>
                  <Link to={path`/members/${m.id}`}>
                    <code>{m.id}</code>
                  </Link>
                </td>
                <td>
                  <Status value={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LoadMore show={memberships.hasMore} loading={memberships.loading} onClick={() => void memberships.loadMore()} />
      <CreateOrganization base={base} />
    </>
  )
}

/** The person in the directory: name, status, and account deletion. */
function Person({ base }: { base: string }) {
  const navigate = useNavigate()
  const user = useResource<User>(base)
  const [name, setName] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [handoff, setHandoff] = useState<OrganizationRef[] | null>(null)

  async function update(path: string, body: { status: "active" | "suspended" } | { display_name: string | null }) {
    setError(null)
    try {
      user.setData(await api<User>("PATCH", path, body))
      setName(null)
    } catch (err) {
      setError(err)
    }
  }

  async function remove() {
    if (!window.confirm("Delete this account? Its memberships end and its keys stop working.")) return
    setError(null)
    setHandoff(null)
    try {
      await api("DELETE", base)
      navigate("/users")
    } catch (err) {
      if (err instanceof ApiError && err.code === "ORGANIZATION_HANDOFF_REQUIRED") {
        const body = err.body as { error?: { details?: { organizations?: OrganizationRef[] } } } | null
        setHandoff(body?.error?.details?.organizations ?? [])
        return
      }
      setError(err)
    }
  }

  if (user.loading && !user.data) return <Loading />
  if (!user.data) return <ErrorAlert error={user.error} />
  const u = user.data

  return (
    <div className="card mb-4">
      <div className="card-body">
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <Fields>
          <Field label="Name">
            {name === null ? (
              <>
                {u.display_name ?? <span className="text-body-secondary">none</span>}{" "}
                <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => setName(u.display_name ?? "")}>
                  Edit
                </button>
              </>
            ) : (
              <form
                className="d-flex gap-2"
                style={{ maxWidth: "28rem" }}
                onSubmit={(e) => {
                  e.preventDefault()
                  const v = name.trim()
                  void update(base, { display_name: v === "" ? null : v })
                }}
              >
                <input
                  className="form-control form-control-sm"
                  value={name}
                  maxLength={128}
                  placeholder="Empty clears it"
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm">Save</button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setName(null)}>
                  Cancel
                </button>
              </form>
            )}
          </Field>
          <Field label="Status"><Status value={u.status} /></Field>
          <Field label="Created"><When at={u.created_at} /></Field>
          <Field label="Updated"><When at={u.updated_at} /></Field>
        </Fields>
        {handoff && (
          <div className="alert alert-warning small mt-3 mb-0">
            Not deleted: this person is the last member, or the last holder of the creator role, of these
            organizations. Hand them off or delete them first.
            <ul className="mb-0">
              {handoff.map((o) => (
                <li key={o.id}>
                  <Link to={path`/organizations/${o.id}`}>{o.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-3 pt-3 border-top d-flex gap-2">
          {u.status === "active" && (
            <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => void update(base + "/status", { status: "suspended" })}>
              Suspend
            </button>
          )}
          {u.status === "suspended" && (
            <button type="button" className="btn btn-outline-success btn-sm" onClick={() => void update(base + "/status", { status: "active" })}>
              Reactivate
            </button>
          )}
          <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={() => void remove()}>
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}

/** Creates an organization with this user as its first active member. */
function CreateOrganization({ base }: { base: string }) {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [error, setError] = useState<unknown>(null)

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const org = await api<Organization>("POST", base + "/organizations", { name: name.trim() })
      navigate(path`/organizations/${org.id}`)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form className="mt-3" onSubmit={(e) => void create(e)}>
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <div className="d-flex gap-2" style={{ maxWidth: "32rem" }}>
        <input
          className="form-control form-control-sm"
          placeholder="New organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-outline-primary btn-sm text-nowrap">
          Create for this user
        </button>
      </div>
    </form>
  )
}
