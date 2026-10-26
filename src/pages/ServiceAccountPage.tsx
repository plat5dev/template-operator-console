import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { useResource } from "../api/hooks"
import type { Node, ServiceAccount } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { KeysTable } from "../components/KeysTable"
import { NodeCrumbs } from "../components/NodeCrumbs"
import { Field, Fields, Id, Loading, PageHead, When } from "../components/ui"

/** A service account, by the node it belongs to: rename, delete, and its keys. */
export function ServiceAccountPage() {
  const { nodeId = "", serviceAccountId = "" } = useParams()
  const node = useResource<Node>(path`/nodes/${nodeId}`)
  const base = path`/nodes/${nodeId}/service-accounts/${serviceAccountId}`
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
    if (!window.confirm("Delete this service account? Its keys are deleted and its member removed.")) return
    setError(null)
    try {
      await api("DELETE", base)
      navigate(path`/nodes/${nodeId}/service-accounts`, { replace: true })
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
        crumbs={node.data && <NodeCrumbs node={node.data} tail={<span>Service account</span>} />}
        eyebrow={<Id value={s.id} />}
        title={s.name}
      />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="card">
        <div className="card-body">
          <Fields>
            <Field label="Member">
              {node.data ? (
                <Link to={path`/nodes/${node.data.root_id}/members/${s.id}`}>
                  <code>{s.id}</code>
                </Link>
              ) : (
                <Id value={s.id} />
              )}
            </Field>
            <Field label="Belongs to">
              <Link to={path`/nodes/${s.node_id}`}>{node.data?.display_name ?? s.node_id}</Link>
            </Field>
            <Field label="Created">
              <When at={s.created_at} />
            </Field>
            <Field label="Updated">
              <When at={s.updated_at} />
            </Field>
          </Fields>
        </div>
        <form className="card-foot" onSubmit={(e) => void rename(e)}>
          <input
            className="input input-sm auto"
            aria-label="Name"
            style={{ maxWidth: "20rem" }}
            value={name ?? s.name}
            maxLength={128}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={name === null || name === s.name}>
            Rename
          </button>
          <button type="button" className="btn btn-danger btn-sm end" onClick={() => void remove()}>
            Delete service account
          </button>
        </form>
      </div>

      <h2 className="section-title">Keys</h2>
      <KeysTable base={base + "/keys"} />
    </>
  )
}
