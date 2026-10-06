import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { path } from "../api/client"

/** There is no user directory. A person is a path parameter, so start from their id. */
export function UsersPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState("")

  function open(e: FormEvent) {
    e.preventDefault()
    navigate(path`/users/${userId.trim()}`)
  }

  return (
    <>
      <h1 className="h3 mb-3">Users</h1>
      <p className="text-body-secondary">
        Identity has no user list. Enter a user id from the customer IdP, or follow one from a member.
      </p>
      <form className="d-flex gap-2" style={{ maxWidth: "32rem" }} onSubmit={open}>
        <input
          className="form-control"
          placeholder="user_id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">
          Open
        </button>
      </form>
    </>
  )
}
