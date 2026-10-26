import { useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ApiError, api, asMember, path } from "../api/client"
import { useMemberNames, usePaged, useResource } from "../api/hooks"
import type { Binding, Invite, Member, Node, NodeStatus, RolesList, ServiceAccount } from "../api/identity"
import { childKinds, plural } from "../api/kinds"
import { tasksKind, type Task, type TaskStatus } from "../api/tasks"
import { AuditLog } from "../components/AuditLog"
import { ErrorAlert } from "../components/ErrorAlert"
import { initials } from "../components/initials"
import { NodeCrumbs } from "../components/NodeCrumbs"
import { NodeTable } from "../components/NodeTable"
import { Empty, Field, Fields, Id, LoadMore, Loading, PageHead, RoleSelect, Status, Tabs, When } from "../components/ui"

export type NodeTab =
  | "children"
  | "tasks"
  | "bindings"
  | "members"
  | "service-accounts"
  | "invites"
  | "roles"
  | "audit-events"

/** Each tab's console path, which is the gateway path it lists. */
function tabPath(node: Node, tab: NodeTab, kind?: string): string {
  if (tab === "children") return path`/nodes/${node.id}/children/${kind ?? ""}`
  if (tab === "tasks") return path`/environments/${node.id}/tasks`
  return path`/nodes/${node.id}/` + tab
}

/** The tab `/nodes/{id}` opens on: its first kind of children, else its tasks, else its bindings. */
function defaultTab(node: Node): { tab: NodeTab; kind?: string } {
  const kinds = childKinds(node.kind)
  if (kinds.length > 0) return { tab: "children", kind: kinds[0] }
  if (node.kind === tasksKind) return { tab: "tasks" }
  return { tab: "bindings" }
}

/** A node of any kind, by id: its fields and lifecycle actions, then its children,
 *  tasks, bindings, members (on a root), service accounts, invites, roles and audit log
 *  as tabs. Children and tasks can be listed acting as a member: `/as/{member_id}`. */
export function NodePage({ tab: routed }: { tab?: NodeTab }) {
  const { nodeId, environmentId, kind: routedKind, memberId } = useParams()
  const id = nodeId ?? environmentId ?? ""
  const navigate = useNavigate()
  const base = path`/nodes/${id}`
  const node = useResource<Node>(base)

  if (node.loading && !node.data) return <Loading />
  if (!node.data) return <ErrorAlert error={node.error} />
  const n = node.data
  const fallback = defaultTab(n)
  const tab = routed ?? fallback.tab
  const kind = routedKind ?? fallback.kind
  const root = n.parent_id === null

  const tabs: [string, string][] = [
    ...childKinds(n.kind).map((k): [string, string] => [`children/${k}`, plural(k)]),
    ...(n.kind === tasksKind ? [["tasks", "Tasks"] as [string, string]] : []),
    ["bindings", "Bindings"],
    ...(root ? [["members", "Members"] as [string, string]] : []),
    ["service-accounts", "Service accounts"],
    ["invites", "Invites"],
    ["roles", "Roles"],
    ["audit-events", "Audit log"],
  ]
  const current = tab === "children" ? `children/${kind}` : tab

  function open(key: string) {
    const [t, k] = key.split("/") as [NodeTab, string | undefined]
    navigate(tabPath(n, t, k))
  }

  return (
    <>
      <PageHead
        crumbs={<NodeCrumbs node={n} />}
        eyebrow={
          <>
            {n.kind} · <Id value={n.id} />
          </>
        }
        title={n.display_name}
        actions={<Status value={n.status} />}
      />

      <NodeCard node={n} onChanged={node.setData} reload={node.reload} />

      <div className="stack">
        <Tabs tabs={tabs} current={current} onChange={open} />
        {tab === "children" && kind && <Children node={n} kind={kind} memberId={memberId} />}
        {tab === "tasks" && <Tasks node={n} memberId={memberId} />}
        {tab === "bindings" && <Bindings node={n} />}
        {tab === "members" && <Members node={n} />}
        {tab === "service-accounts" && <ServiceAccounts node={n} />}
        {tab === "invites" && <Invites node={n} />}
        {tab === "roles" && <Roles node={n} />}
        {tab === "audit-events" && (
          <>
            <AuditLog base={base} rootId={n.root_id} />
            <p className="small">
              <Link to={`/operator-audit-events?node_id=${encodeURIComponent(n.id)}`}>The operator log for this node</Link>{" "}
              and the nodes below it.
            </p>
          </>
        )}
      </div>
    </>
  )
}

/** The node's fields, rename, and its lifecycle: delete, restore, and on a purged root,
 *  releasing its slug. */
function NodeCard({ node, onChanged, reload }: { node: Node; onChanged: (n: Node) => void; reload: () => void }) {
  const base = path`/nodes/${node.id}`
  const [name, setName] = useState<string | null>(null)
  const [error, setError] = useState<unknown>(null)

  async function run(work: () => Promise<void>) {
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err)
    }
  }

  const rename = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      onChanged(await api<Node>("PATCH", base, { display_name: name }))
      setName(null)
    })
  }

  const remove = () => {
    const typed = window.prompt(
      `Delete ${node.display_name} and every node below it? It can be restored until it's purged.\n\nType its slug "${node.slug}" to confirm.`,
    )
    if (typed !== node.slug) return
    void run(async () => {
      await api("DELETE", base)
      reload()
    })
  }

  const restore = () => void run(async () => onChanged(await api<Node>("POST", base + "/restore")))

  const releaseSlug = () => {
    if (!window.confirm(`Release the slug "${node.slug}"? A new root can take it.`)) return
    void run(async () => onChanged(await api<Node>("POST", base + "/release-slug")))
  }

  return (
    <div className="card">
      <div className="card-body">
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <Fields>
          <Field label="Kind">{node.kind}</Field>
          <Field label="Slug">
            <code>{node.slug}</code>
          </Field>
          <Field label="Display name">
            {name === null ? (
              <>
                {node.display_name}{" "}
                <button type="button" className="btn-link small" onClick={() => setName(node.display_name)}>
                  Rename
                </button>
              </>
            ) : (
              <form className="cluster" style={{ maxWidth: "28rem" }} onSubmit={rename}>
                <input
                  className="input input-sm grow"
                  aria-label="Display name"
                  value={name}
                  maxLength={128}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={name === node.display_name}>
                  Save
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setName(null)}>
                  Cancel
                </button>
              </form>
            )}
          </Field>
          <Field label="Status">
            <Status value={node.status} />
          </Field>
          {node.deleted_at && (
            <Field label="Deleted">
              <When at={node.deleted_at} />
            </Field>
          )}
          {node.purge_after && (
            <Field label="Purge after">
              <When at={node.purge_after} />
            </Field>
          )}
          <Field label="Created">
            <When at={node.created_at} />
          </Field>
          <Field label="Updated">
            <When at={node.updated_at} />
          </Field>
        </Fields>
      </div>
      <div className="card-foot">
        {node.status === "deleted" && (
          <button type="button" className="btn btn-sm" onClick={restore}>
            Restore
          </button>
        )}
        {node.status === "purged" && node.parent_id === null && (
          <button type="button" className="btn btn-sm" onClick={releaseSlug}>
            Release slug
          </button>
        )}
        {node.status === "active" && (
          <button type="button" className="btn btn-danger btn-sm end" onClick={remove}>
            Delete {node.kind}
          </button>
        )}
      </div>
    </div>
  )
}

/** Acting as a member, for the routes that allow it: the member is in the URL
 *  (`/as/{member_id}/…`), so leaving the tab or the page stops it. */
function ActAs({ node, memberId, at }: { node: Node; memberId?: string; at: string }) {
  const navigate = useNavigate()
  const members = useResource<{ members: Member[] }>(path`/nodes/${node.root_id}/members` + "?limit=100")
  const names = useMemberNames(memberId ? [{ rootId: node.root_id, memberId }] : [])

  if (memberId) {
    const name = names.get(memberId)?.name
    return (
      <div className="alert alert-warn">
        <div>
          Acting as{" "}
          <Link to={path`/nodes/${node.root_id}/members/${memberId}`}>{name ?? <code>{memberId}</code>}</Link>: these
          requests go to <code>/as/{memberId}</code>, and the service is told that member. Access is still yours.{" "}
          <button type="button" className="btn-link" onClick={() => navigate(at)}>
            Stop
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-row">
      <div className="field">
        <label className="small" htmlFor="act_as">
          Act as a member
        </label>
        <select
          id="act_as"
          className="select select-sm"
          value=""
          onChange={(e) => e.target.value && navigate(asMember(e.target.value, at))}
        >
          <option value="">Nobody</option>
          {(members.data?.members ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.id}
              {m.principal === "service_account" ? " (service account)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

const childStatuses: [NodeStatus, string][] = [
  ["active", "Live"],
  ["deleted", "Deleted"],
  ["purged", "Purged"],
]

/** The node's children of one kind. Plainly, every child (`GET /nodes?parent_id=`).
 *  Acting as a member, identity's children list, filtered to what that member can
 *  read, and a create gives that member the creator role. */
function Children({ node, kind, memberId }: { node: Node; kind: string; memberId?: string }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState<NodeStatus>("active")
  const children = path`/nodes/${node.id}/children/${kind}`
  const listPath = memberId
    ? asMember(memberId, children) + (status === "deleted" ? "?status=deleted" : "")
    : `/nodes?parent_id=${encodeURIComponent(node.id)}&kind=${encodeURIComponent(kind)}&status=${status}`
  const list = usePaged<Node>(listPath, "nodes")
  const [displayName, setDisplayName] = useState("")
  const [slug, setSlug] = useState("")
  const [error, setError] = useState<unknown>(null)
  const statuses = memberId ? childStatuses.filter(([s]) => s !== "purged") : childStatuses

  async function create(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const body = slug.trim() ? { display_name: displayName.trim(), slug: slug.trim() } : { display_name: displayName.trim() }
      const created = await api<Node>("POST", asMember(memberId, children), body)
      navigate(path`/nodes/${created.id}`)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <ActAs node={node} memberId={memberId} at={children} />
      <div className="form-row">
        <div className="field">
          <label className="small" htmlFor="child_status">
            Status
          </label>
          <select
            id="child_status"
            className="select select-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as NodeStatus)}
          >
            {statuses.map(([s, label]) => (
              <option key={s} value={s}>
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
        <div className="form-row" style={{ maxWidth: "44rem" }}>
          <input
            className="input grow"
            aria-label="Display name"
            placeholder={`New ${kind}'s display name`}
            value={displayName}
            maxLength={128}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <input
            className="input mono"
            aria-label="Slug"
            placeholder="slug (optional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <button type="submit" className="btn">
            Create {kind}
            {memberId ? " as this member" : ""}
          </button>
        </div>
      </form>
    </>
  )
}

const taskStatusLabel: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" }

/** The environment's tasks, from the starter API. A 404 is the operator gateway with no
 *  route for them: the deployment hasn't routed the API's paths. */
function Tasks({ node, memberId }: { node: Node; memberId?: string }) {
  const at = path`/environments/${node.id}/tasks`
  const list = usePaged<Task>(asMember(memberId, at), "tasks")
  const names = useMemberNames(list.items.map((t) => ({ rootId: node.root_id, memberId: t.created_by })))

  return (
    <>
      <ActAs node={node} memberId={memberId} at={at} />
      {list.error instanceof ApiError && list.error.status === 404 ? (
        <Empty>
          The operator gateway has no route for <code>{at}</code>. Add the API's <code>routes.operator.yml</code> to
          the project's <code>operator.routes.yml</code>.
        </Empty>
      ) : (
        <ErrorAlert error={list.error} />
      )}
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        !list.error && <Empty>No tasks.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Created by</th>
                <th>Id</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td className="small">{taskStatusLabel[t.status]}</td>
                  <td className="small">
                    <Link to={path`/nodes/${node.root_id}/members/${t.created_by}`}>
                      {names.get(t.created_by)?.name ?? <code>{t.created_by}</code>}
                    </Link>
                  </td>
                  <td className="small">
                    <Id value={t.id} />
                  </td>
                  <td className="small">
                    <When at={t.updated_at} />
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

/** The roles bindable at this node, for the role pickers. */
function useRoles(node: Node): string[] {
  const roles = useResource<RolesList>(path`/nodes/${node.id}/roles`)
  return roles.data?.roles.map((r) => r.slug) ?? []
}

/** Run one write, keeping its error for an alert. */
function useWrite() {
  const [error, setError] = useState<unknown>(null)
  async function run(work: () => Promise<void>) {
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err)
    }
  }
  return { error, clear: () => setError(null), run }
}

/** Every binding that counts here: this node's own, and its ancestors' (inherited),
 *  which are changed on their own node. */
function Bindings({ node }: { node: Node }) {
  const base = path`/nodes/${node.id}/bindings`
  const list = usePaged<Binding>(base, "bindings")
  const roles = useRoles(node)
  const members = useResource<{ members: Member[] }>(path`/nodes/${node.root_id}/members` + "?limit=100")
  const write = useWrite()
  const [memberId, setMemberId] = useState("")
  const [role, setRole] = useState("")
  const where = new Map(node.ancestors.map((a) => [a.id, a.display_name]))

  const add = (e: FormEvent) => {
    e.preventDefault()
    void write.run(async () => {
      await api("POST", base, { member_id: memberId, role })
      setMemberId("")
      list.reload()
    })
  }

  const change = (b: Binding, to: string) =>
    void write.run(async () => {
      await api("PATCH", base + path`/${b.id}`, { role: to })
      list.reload()
    })

  const remove = (b: Binding) => {
    if (!window.confirm(`Remove ${b.name ?? b.member_id}'s ${b.role} binding here?`)) return
    void write.run(async () => {
      await api("DELETE", base + path`/${b.id}`)
      list.reload()
    })
  }

  return (
    <>
      <ErrorAlert error={list.error || write.error} onDismiss={write.error ? write.clear : undefined} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No bindings.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>On</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.items.map((b) => (
                <tr key={b.id}>
                  <td>
                    <MemberCell rootId={node.root_id} id={b.member_id} name={b.name} principal={b.principal}>
                      {b.guest && <span className="badge">guest</span>}
                    </MemberCell>
                  </td>
                  <td className="small">
                    {b.inherited ? (
                      b.role
                    ) : (
                      <RoleSelect small roles={roles.length ? roles : [b.role]} value={b.role} onChange={(r) => change(b, r)} />
                    )}
                  </td>
                  <td className="small">
                    {b.inherited ? (
                      <Link to={path`/nodes/${b.node_id}/bindings`}>{where.get(b.node_id) ?? b.node_id}</Link>
                    ) : (
                      "this node"
                    )}
                  </td>
                  <td className="small text-2">
                    <When at={b.created_at} />
                  </td>
                  <td className="actions">
                    {!b.inherited && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(b)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
      <form className="form-row" style={{ maxWidth: "44rem" }} onSubmit={add}>
        <select
          className="select grow"
          aria-label="Member"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          required
        >
          <option value="" disabled>
            Member of the tree
          </option>
          {(members.data?.members ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.id}
              {m.principal === "service_account" ? " (service account)" : ""}
            </option>
          ))}
        </select>
        <RoleSelect roles={roles} value={role} onChange={setRole} />
        <button type="submit" className="btn">
          Add binding
        </button>
      </form>
    </>
  )
}

/** A member with its avatar and name, linking to its page in the tree. */
function MemberCell({
  rootId,
  id,
  name,
  principal,
  children,
}: {
  rootId: string
  id: string
  name: string | null
  principal: Member["principal"]
  children?: ReactNode
}) {
  const person = principal === "person"
  return (
    <span className="who">
      <span className={`avatar${person ? "" : " square"}`}>{person ? initials(name ?? "?") : "SA"}</span>
      <span>
        <Link className="list-title" to={path`/nodes/${rootId}/members/${id}`}>
          {name ?? <span className="muted">(no name yet)</span>}
        </Link>{" "}
        {children}
        <span className="sub mono">{id}</span>
      </span>
    </span>
  )
}

/** A root's active members. Adding one resolves the person by IdP link, creating them
 *  if the subject is new, and binds a role at the root. */
function Members({ node }: { node: Node }) {
  const base = path`/nodes/${node.id}/members`
  const list = usePaged<Member>(base, "members")
  const roles = useRoles(node)
  const write = useWrite()
  const [issuer, setIssuer] = useState("")
  const [subject, setSubject] = useState("")
  const [role, setRole] = useState("")

  const add = (e: FormEvent) => {
    e.preventDefault()
    void write.run(async () => {
      await api("POST", base, { idp: { issuer: issuer.trim(), subject: subject.trim() }, role })
      setSubject("")
      list.reload()
    })
  }

  return (
    <>
      <ErrorAlert error={list.error || write.error} onDismiss={write.error ? write.clear : undefined} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No members.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Principal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <MemberCell rootId={node.id} id={m.id} name={m.name} principal={m.principal}>
                      {m.guest && <span className="badge">guest</span>}
                    </MemberCell>
                  </td>
                  <td className="small">{m.principal === "person" ? "person" : "service account"}</td>
                  <td>
                    <Status value={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
      <form className="form-row" style={{ maxWidth: "52rem" }} onSubmit={add}>
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
        <RoleSelect roles={roles} value={role} onChange={setRole} />
        <button type="submit" className="btn">
          Add member
        </button>
      </form>
    </>
  )
}

/** Service accounts that belong to this node. Customers create them and their keys (the
 *  operator gateway doesn't route key creation); here they're renamed, deleted, and
 *  their keys revoked. */
function ServiceAccounts({ node }: { node: Node }) {
  const base = path`/nodes/${node.id}/service-accounts`
  const list = usePaged<ServiceAccount>(base, "service_accounts")

  return (
    <>
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No service accounts belong here.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Id</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((sa) => (
                <tr key={sa.id}>
                  <td>
                    <Link to={base + path`/${sa.id}`}>{sa.name}</Link>
                  </td>
                  <td className="small">
                    <Id value={sa.id} />
                  </td>
                  <td className="small">
                    <When at={sa.created_at} />
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

/** Invites to this node. Listing and revoking only: an invite's token is a secret
 *  shown once, like a key, and operators don't hold customer secrets. */
function Invites({ node }: { node: Node }) {
  const base = path`/nodes/${node.id}/invites`
  const list = usePaged<Invite>(base, "invites")
  const write = useWrite()

  const revoke = (inv: Invite) => {
    if (!window.confirm(`Revoke invite ${inv.token_prefix}…?`)) return
    void write.run(async () => {
      await api("DELETE", base + path`/${inv.id}`)
      list.reload()
    })
  }

  return (
    <>
      <ErrorAlert error={list.error || write.error} onDismiss={write.error ? write.clear : undefined} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No invites.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Prefix</th>
                <th>Role</th>
                <th>Status</th>
                <th>Uses</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.items.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <code>{inv.token_prefix}…</code>
                  </td>
                  <td className="small">
                    {inv.role}
                    {inv.grants.length > 0 && (
                      <span className="sub">
                        {inv.grants.length} grant{inv.grants.length === 1 ? "" : "s"} below
                      </span>
                    )}
                  </td>
                  <td>
                    <Status value={inv.status} />
                  </td>
                  <td className="small">
                    {inv.use_count} / {inv.max_uses}
                  </td>
                  <td className="small">
                    <When at={inv.expires_at} />
                  </td>
                  <td className="actions">
                    {inv.status === "active" && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => revoke(inv)}>
                        Revoke
                      </button>
                    )}
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

/** The roles bindable at this node's kind, with what each grants. */
function Roles({ node }: { node: Node }) {
  const roles = useResource<RolesList>(path`/nodes/${node.id}/roles`)
  if (roles.loading && !roles.data) return <Loading />
  if (!roles.data) return <ErrorAlert error={roles.error} />
  const { creator_role } = roles.data

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Permissions</th>
          </tr>
        </thead>
        <tbody>
          {roles.data.roles.map((r) => (
            <tr key={r.slug}>
              <td>
                <code>{r.slug}</code> {r.slug === creator_role && <span className="badge">creator role</span>}
              </td>
              <td className="small">
                {r.permissions.map((p) => (
                  <code key={p} className="chip">
                    {p}
                  </code>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
