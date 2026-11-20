import { Link } from "react-router-dom"
import { ApiError, asMember, path } from "../api/client"
import { useMemberNames, usePaged } from "../api/hooks"
import type { Node } from "../api/identity"
import type { Task, TaskStatus } from "../api/tasks"
import { ActAs } from "../components/ActAs"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, Id, LoadMore, Loading, When } from "../components/ui"

const taskStatusLabel: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" }

/** The project's tasks, from the starter API. A 404 is the operator gateway with no
 *  route for them: the deployment hasn't routed the API's paths. */
export function TasksTab({ node, memberId }: { node: Node; memberId?: string }) {
  const at = path`/projects/${node.id}/tasks`
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
