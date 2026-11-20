import { Link, useNavigate } from "react-router-dom"
import { asMember, path } from "../api/client"
import { useMemberNames, useResource } from "../api/hooks"
import type { Member, Node } from "../api/identity"

/** Acting as a member, for the routes that allow it: the member is in the URL
 *  (`/as/{member_id}/…`), so leaving the tab or the page stops it. */
export function ActAs({ node, memberId, at }: { node: Node; memberId?: string; at: string }) {
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
