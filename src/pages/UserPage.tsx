import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { Membership, Organization } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeysTable } from "../components/KeysTable"
import { Empty, Id, LoadMore, Loading, Status } from "../components/ui"

export function UserPage() {
  const { userId = "" } = useParams()
  const base = path`/users/${userId}`
  const memberships = usePaged<Membership>(base + "/memberships", "memberships")

  return (
    <>
      <nav className="small mb-2">
        <Link to="/users">Users</Link>
      </nav>
      <h1 className="h3 mb-3">
        User <Id value={userId} />
      </h1>

      <h2 className="h5">Memberships</h2>
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

      <h2 className="h5 mt-4">User API keys</h2>
      <KeysTable base={base + "/api-keys"} />
    </>
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
