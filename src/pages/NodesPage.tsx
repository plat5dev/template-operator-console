import { useState, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api, path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { Node, NodeStatus } from "../api/identity"
import { plural, rootKinds } from "../api/kinds"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeTable } from "../components/NodeTable"
import { PageHead } from "../components/ui"

const statuses: [NodeStatus | "", string][] = [
  ["active", "Live"],
  ["deleted", "Deleted"],
  ["purged", "Purged"],
  ["", "Any"],
]

/** The roots of every tree, unfiltered (`GET /nodes?kind=`), by status. `?kind=` and
 *  `?status=` here are the gateway's. */
export function NodesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const kind = params.get("kind") ?? rootKinds[0]!
  const status = params.get("status") ?? "active"
  const q = new URLSearchParams({ kind })
  if (status) q.set("status", status)
  const list = usePaged<Node>(`/nodes?${q}`, "nodes")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<unknown>(null)

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const root = await api<Node>("POST", path`/roots/${kind}`, { display_name: displayName.trim() })
      navigate(path`/nodes/${root.id}`)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHead
        eyebrow={`/nodes?kind=${kind}`}
        title={plural(kind)}
        lede={`Every ${kind} in this deployment: the roots of its trees.`}
      />
      <div className="form-row">
        {rootKinds.length > 1 && (
          <div className="field">
            <label className="small" htmlFor="root_kind">
              Kind
            </label>
            <select
              id="root_kind"
              className="select select-sm"
              value={kind}
              onChange={(e) => setParams({ kind: e.target.value, status })}
            >
              {rootKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label className="small" htmlFor="root_status">
            Status
          </label>
          <select
            id="root_status"
            className="select select-sm"
            value={status}
            onChange={(e) => setParams({ kind, status: e.target.value })}
          >
            {statuses.map(([s, label]) => (
              <option key={label} value={s}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ErrorAlert error={list.error} />
      <NodeTable list={list} empty={`No ${plural(kind).toLowerCase()}.`} />
      <form className="stack-sm" onSubmit={(e) => void create(e)}>
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <div className="input-group" style={{ maxWidth: "32rem" }}>
          <input
            className="input"
            aria-label={`New ${kind}'s display name`}
            placeholder={`New ${kind}'s display name`}
            value={displayName}
            maxLength={128}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <button type="submit" className="btn">
            Create {kind}
          </button>
        </div>
        <p className="small muted">
          Created by an operator, a root has no members. Add the first from its Members tab.
        </p>
      </form>
    </>
  )
}
