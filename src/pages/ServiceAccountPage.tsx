import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { useResource } from "../api/hooks"
import type { ServiceAccount } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeysTable } from "../components/KeysTable"
import { Field, Fields, Id, Loading, PageHead, Status, When } from "../components/ui"

export function ServiceAccountPage() {
  const { organizationId = "", serviceAccountId = "" } = useParams()
  const org = path`/organizations/${organizationId}`
  const base = org + path`/service-accounts/${serviceAccountId}`
  const sa = useResource<ServiceAccount>(base)
  const navigate = useNavigate()
  const [name, setName] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function rename(e: FormEvent) {
    e.preventDefault()
    if (name === null) return
    setError(null)
    try {
      sa.setData(await api<ServiceAccount>("PATCH", base, { name }))
      setName(null)
    } catch (err) {
      setError(err)
    }
  }

  async function remove() {
    if (!window.confirm("Remove this service account? Its member is soft-removed and its keys stop working.")) return
    setError(null)
    try {
      await api("DELETE", base)
      navigate(org, { replace: true })
    } catch (err) {
      setError(err)
    }
  }

  if (sa.loading && !sa.data) return <Loading />
  if (!sa.data) return <ErrorAlert error={sa.error} />
  const s = sa.data

  return (
    <>
      <PageHead
        crumbs={
          <>
            <Link to={org}>Organization</Link>
            <span>Service account</span>
          </>
        }
        eyebrow={<Id value={s.id} />}
        title={s.name}
        actions={<Status value={s.status} />}
      />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="card">
        <div className="card-body">
          <Fields>
            <Field label="Id"><Id value={s.id} /></Field>
            <Field label="Member"><Link to={path`/members/${s.member_id}`}>{s.member_id}</Link></Field>
            <Field label="Status"><Status value={s.status} /></Field>
            <Field label="Created"><When at={s.created_at} /></Field>
            <Field label="Updated"><When at={s.updated_at} /></Field>
          </Fields>
          <p className="small muted">Suspend or reactivate it from its member page.</p>
        </div>
        <form className="card-foot" onSubmit={(e) => void rename(e)}>
            <input
              className="input input-sm auto"
              aria-label="Name"
              style={{ maxWidth: "20rem" }}
              value={name ?? s.name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={name === null || name === s.name}>
              Rename
            </button>
            <button type="button" className="btn btn-danger btn-sm end" onClick={() => void remove()}>
              Remove service account
            </button>
        </form>
      </div>

      <h2 className="section-title">API keys</h2>
      <KeysTable base={base + "/api-keys"} />
    </>
  )
}
