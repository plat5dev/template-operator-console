import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { User } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, Id, LoadMore, Loading, PageHead, Status, When } from "../components/ui"

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
      <PageHead
        eyebrow="/users"
        title="Users"
        lede="Every person in the directory. Staff only: customers cannot list people."
      />
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
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No users.</Empty>
      ) : (
        <div className="table-wrap">
        <table className="table hover">
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
                    {u.display_name ?? <span className="muted">(no name yet)</span>}
                  </Link>
                </td>
                <td className="small">
                  <Id value={u.id} />
                </td>
                <td>
                  <Status value={u.status} />
                </td>
                <td className="small text-2">
                  <When at={u.created_at} />
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
