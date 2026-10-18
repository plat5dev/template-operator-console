import { Link, useParams } from "react-router-dom"
import { path } from "../api/client"
import { usePaged, useResource } from "../api/hooks"
import type { Organization } from "../api/identity"
import type { Project, Task, TaskStatus } from "../api/projects"
import { ErrorAlert } from "../components/ErrorAlert"
import { NotRouted } from "../components/Projects"
import { Empty, Field, Fields, Id, LoadMore, Loading, PageHead, When } from "../components/ui"

const statusLabel: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" }

/** One project and its tasks, from the project's API. Read-only: the operator routes
 *  that ship with the starters are GETs. */
export function ProjectPage() {
  const { organizationId = "", projectId = "" } = useParams()
  const org = path`/organizations/${organizationId}`
  const base = org + path`/projects/${projectId}`
  const organization = useResource<Organization>(org)
  const project = useResource<Project>(base)

  if (project.loading && !project.data) return <Loading />
  if (!project.data) return <ErrorAlert error={project.error} />
  const p = project.data

  return (
    <>
      <PageHead
        crumbs={
          <>
            <Link to="/organizations">Organizations</Link>
            <Link to={org}>{organization.data?.name ?? "Organization"}</Link>
            <Link to={org + "/projects"}>Projects</Link>
            <span>{p.name}</span>
          </>
        }
        eyebrow={
          <>
            <Id value={p.id} /> · created <When at={p.created_at} />
          </>
        }
        title={p.name}
        lede={p.description || undefined}
      />

      <div className="card">
        <div className="card-body">
          <Fields>
            <Field label="Id"><Id value={p.id} /></Field>
            <Field label="Organization"><Link to={org}>{organization.data?.name ?? p.organization_id}</Link></Field>
            <Field label="Created"><When at={p.created_at} /></Field>
            <Field label="Updated"><When at={p.updated_at} /></Field>
          </Fields>
        </div>
      </div>

      <Tasks base={base} />
    </>
  )
}

function Tasks({ base }: { base: string }) {
  const listPath = base + "/tasks"
  const list = usePaged<Task>(listPath, "tasks")

  return (
    <div className="stack">
      <h2>Tasks</h2>
      {list.error ? (
        <NotRouted error={list.error} path={listPath} />
      ) : list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No tasks.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Id</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td className="small">{statusLabel[t.status] ?? t.status}</td>
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
    </div>
  )
}
