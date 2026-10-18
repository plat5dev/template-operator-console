import { Link } from "react-router-dom"
import { ApiError, path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { Project } from "../api/projects"
import { ErrorAlert } from "./ErrorAlert"
import { Empty, Id, LoadMore, Loading, When } from "./ui"

/** A 404 on a list is the gateway with no route for it: the deployment has not
 *  given staff this path. */
export function NotRouted({ error, path: p }: { error: unknown; path: string }) {
  if (!(error instanceof ApiError) || error.status !== 404) return <ErrorAlert error={error} />
  return (
    <Empty>
      The operator gateway has no route for <code>{p}</code>. Add the API's paths to the project's{" "}
      <code>operator.routes.yml</code>.
    </Empty>
  )
}

/** An org's projects, from the project's API. */
export function Projects({ base }: { base: string }) {
  const listPath = base + "/projects"
  const list = usePaged<Project>(listPath, "projects")

  if (list.error) return <NotRouted error={list.error} path={listPath} />
  return (
    <>
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No projects.</Empty>
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
              {list.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="list-title" to={base + path`/projects/${p.id}`}>
                      {p.name}
                    </Link>
                    {p.description && <span className="sub">{p.description}</span>}
                  </td>
                  <td className="small">
                    <Id value={p.id} />
                  </td>
                  <td className="small">
                    <When at={p.created_at} />
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
