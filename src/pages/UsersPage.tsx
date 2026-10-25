import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { path } from "../api/client"
import { useResource } from "../api/hooks"
import type { User } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, Id, Loading, PageHead, Status } from "../components/ui"

/** Find a person by their IdP link (`GET /users?issuer=&subject=`, an exact lookup),
 *  or open one by user id. People aren't listed: find them here, or from a member. */
export function UsersPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [issuer, setIssuer] = useState(params.get("issuer") ?? "")
  const [subject, setSubject] = useState(params.get("subject") ?? "")
  const [userId, setUserId] = useState("")

  function find(e: FormEvent) {
    e.preventDefault()
    setParams({ issuer: issuer.trim(), subject: subject.trim() })
  }

  function open(e: FormEvent) {
    e.preventDefault()
    navigate(path`/users/${userId.trim()}`)
  }

  const asked = params.get("issuer") && params.get("subject")

  return (
    <>
      <PageHead eyebrow="/users" title="Users" lede="Find a person by the IdP that signs them in and their subject there." />
      <form className="form-row" style={{ maxWidth: "52rem" }} onSubmit={find}>
        <input
          className="input grow"
          aria-label="IdP issuer"
          placeholder="IdP issuer"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          required
        />
        <input
          className="input grow"
          aria-label="IdP subject"
          placeholder="IdP subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">
          Find
        </button>
      </form>
      {asked && <Found query={params.toString()} />}

      <form className="input-group" style={{ maxWidth: "32rem" }} onSubmit={open}>
        <input
          className="input mono"
          aria-label="Open a user by id"
          placeholder="user_id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <button type="submit" className="btn">
          Open
        </button>
      </form>
    </>
  )
}

function Found({ query }: { query: string }) {
  const found = useResource<{ users: User[] }>(`/users?${query}`)
  if (found.loading) return <Loading />
  if (!found.data) return <ErrorAlert error={found.error} />
  if (found.data.users.length === 0) return <Empty>Nobody with that IdP link.</Empty>
  return (
    <div className="table-wrap">
      <table className="table hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Id</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {found.data.users.map((u) => (
            <tr key={u.id}>
              <td>
                <Link to={path`/users/${u.id}`}>{u.name ?? <span className="muted">(no name yet)</span>}</Link>
              </td>
              <td className="small">
                <Id value={u.id} />
              </td>
              <td>
                <Status value={u.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
