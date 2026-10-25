import { Link } from "react-router-dom"
import { path } from "../api/client"
import type { usePaged } from "../api/hooks"
import type { Node } from "../api/identity"
import { initials } from "./initials"
import { Empty, Id, LoadMore, Loading, Status, When } from "./ui"

/** A list of nodes, each a link to its page. */
export function NodeTable({
  list,
  empty,
}: {
  list: ReturnType<typeof usePaged<Node>>
  empty: string
}) {
  if (list.loading && list.items.length === 0) return <Loading />
  if (list.items.length === 0) return <Empty>{empty}</Empty>
  return (
    <>
      <div className="table-wrap">
        <table className="table hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Id</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="who">
                    <span className="avatar square">{initials(c.display_name)}</span>
                    <Link className="list-title" to={path`/nodes/${c.id}`}>
                      {c.display_name}
                    </Link>
                  </span>
                </td>
                <td className="small">
                  <code>{c.slug}</code>
                </td>
                <td>
                  <Status value={c.status} />
                </td>
                <td className="small">
                  <Id value={c.id} />
                </td>
                <td className="small text-2">
                  <When at={c.created_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}
