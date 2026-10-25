import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { useResource } from "../api/hooks"
import type { Member, Membership, Node, User } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { NodeCrumbs } from "../components/NodeCrumbs"
import { Empty, Field, Fields, Id, Loading, PageHead, Status } from "../components/ui"

/** A member of a tree, by its root: who it is, what it holds at the root, and removal. */
export function MemberPage() {
  const { nodeId = "", memberId = "" } = useParams()
  const root = useResource<Node>(path`/nodes/${nodeId}`)
  const base = path`/nodes/${nodeId}/members/${memberId}`
  const member = useResource<Member>(base)
  const [error, setError] = useState<unknown>(null)

  async function remove() {
    if (!window.confirm("Remove this member from the tree? Its bindings are deleted. Removal is final.")) return
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

  return (
    <>
      <PageHead
        crumbs={root.data && <NodeCrumbs node={root.data} tail={<span>Member</span>} />}
        eyebrow={<Id value={m.id} />}
        title={m.name ?? "Member"}
        actions={<Status value={m.status} />}
      />
      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="card">
        <div className="card-body">
          <Fields>
            <Field label="Id">
              <Id value={m.id} />
            </Field>
            <Field label="Principal">
              {m.principal === "person" ? (
                <>
                  person <PersonLink memberId={m.id} />
                </>
              ) : (
                "service account"
              )}
            </Field>
            <Field label="Guest">{m.guest ? "yes: bound only below the root" : "no"}</Field>
            <Field label="Status">
              <Status value={m.status} />
            </Field>
          </Fields>
        </div>
        {m.status === "active" && m.principal === "person" && (
          <div className="card-foot">
            <button type="button" className="btn btn-danger btn-sm end" onClick={() => void remove()}>
              Remove member
            </button>
          </div>
        )}
      </div>

      {m.status === "active" && <AtRoot rootId={nodeId} memberId={m.id} />}
    </>
  )
}

/** The person behind a member (`GET /members/{member_id}/user`). Gone once the
 *  person's account is deleted. */
function PersonLink({ memberId }: { memberId: string }) {
  const person = useResource<User>(path`/members/${memberId}/user`)
  if (person.loading) return null
  if (!person.data) return <span className="muted">(account deleted)</span>
  return <Link to={path`/users/${person.data.id}`}>{person.data.name ?? person.data.id}</Link>
}

/** What the member holds at the root (`GET /nodes/{root_id}/memberships/{member_id}`). */
function AtRoot({ rootId, memberId }: { rootId: string; memberId: string }) {
  const membership = useResource<Membership>(path`/nodes/${rootId}/memberships/${memberId}`)
  if (membership.loading && !membership.data) return <Loading />
  if (!membership.data) return <ErrorAlert error={membership.error} />
  const { bindings, permissions } = membership.data

  return (
    <section className="stack-sm">
      <h2 className="section-title">At the root</h2>
      {bindings.length === 0 ? (
        <Empty>No binding at the root. Its bindings below are on each node's Bindings tab.</Empty>
      ) : (
        <Fields>
          <Field label="Roles">
            {bindings.map((b) => (
              <code key={b.id} className="chip">
                {b.role}
              </code>
            ))}
          </Field>
          <Field label="Permissions">
            {permissions.map((p) => (
              <code key={p} className="chip">
                {p}
              </code>
            ))}
          </Field>
        </Fields>
      )}
    </section>
  )
}
