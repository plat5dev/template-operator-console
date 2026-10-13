import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { useResource } from "../api/hooks"
import type { Member, MemberUser } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeysTable } from "../components/KeysTable"
import { Field, Fields, Id, Loading, Status, When } from "../components/ui"

export function MemberPage() {
  const { memberId = "" } = useParams()
  const base = path`/members/${memberId}`
  const member = useResource<Member>(base)
  const [error, setError] = useState<unknown>(null)

  async function setStatus(status: "active" | "suspended") {
    setError(null)
    try {
      member.setData(await api<Member>("PATCH", base, { status }))
    } catch (err) {
      setError(err)
    }
  }

  async function remove() {
    if (!window.confirm("Remove this member from the organization?")) return
    setError(null)
    try {
      await api("DELETE", base)
      member.reload()
    } catch (err) {
      setError(err)
    }
  }

  if (member.loading && !member.data) return <Loading />
  if (!member.data) return <ErrorAlert error={member.error} />
  const m = member.data
  const org = path`/organizations/${m.organization_id}`

  return (
    <>
      <nav className="small mb-2">
        <Link to={org}>Organization</Link>
      </nav>
      <h1 className="h3 mb-3">Member</h1>
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="card mb-4">
        <div className="card-body">
          <Fields>
            <Field label="Id"><Id value={m.id} /></Field>
            <Field label="Organization"><Link to={org}>{m.organization_id}</Link></Field>
            <Field label="Principal">
              {m.principal === "user" ? (
                <>
                  user {m.display_name ?? ""} <PersonLink base={base} />
                </>
              ) : (
                <>
                  service account{" "}
                  <Link to={org + path`/service-accounts/${m.service_account_id ?? ""}`}>{m.service_account_id}</Link>
                </>
              )}
            </Field>
            <Field label="Status"><Status value={m.status} /></Field>
            <Field label="Created"><When at={m.created_at} /></Field>
            <Field label="Updated"><When at={m.updated_at} /></Field>
          </Fields>
          <div className="mt-3 pt-3 border-top d-flex gap-2">
            {m.status === "active" && (
              <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => void setStatus("suspended")}>
                Suspend
              </button>
            )}
            {m.status === "suspended" && (
              <button type="button" className="btn btn-outline-success btn-sm" onClick={() => void setStatus("active")}>
                Reactivate
              </button>
            )}
            <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={() => void remove()}>
              Remove member
            </button>
          </div>
        </div>
      </div>

      <h2 className="h5">Member API keys</h2>
      <KeysTable base={base + "/api-keys"} />
    </>
  )
}

/** The person this member is. Gone once the person's account is deleted. */
function PersonLink({ base }: { base: string }) {
  const person = useResource<MemberUser>(base + "/user")
  if (person.loading) return null
  if (!person.data) return <span className="text-body-secondary">(account deleted)</span>
  return <Link to={path`/users/${person.data.user_id}`}>{person.data.user_id}</Link>
}
