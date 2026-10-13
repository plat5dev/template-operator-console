import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { User } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, Id, LoadMore, Loading, Status, When } from "../components/ui"

/** Every person in the directory. Staff only: customers cannot list people. */
export function UsersPage() {
  const navigate = useNavigate()
  const list = usePaged<User>("/users", "users")
  const [userId, setUserId] = useState("")

  function open(e: FormEvent) {
    e.preventDefault()
    navigate(path`/users/${userId.trim()}`)
  }

  return (
    <>
      <h1 className="h3 mb-3">Users</h1>
      <form className="d-flex gap-2 mb-3" style={{ maxWidth: "32rem" }} onSubmit={open}>
        <input
          className="form-control form-control-sm"
          placeholder="user_id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-outline-primary btn-sm">
          Open
        </button>
      </form>
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No users.</Empty>
      ) : (
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Id</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link to={path`/users/${u.id}`}>
                    {u.display_name ?? <span className="text-body-secondary">no name</span>}
                  </Link>
                </td>
                <td className="small">
                  <Id value={u.id} />
                </td>
                <td>
                  <Status value={u.status} />
                </td>
                <td className="small">
                  <When at={u.created_at} />
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
