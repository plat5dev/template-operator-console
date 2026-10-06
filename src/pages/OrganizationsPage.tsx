import { Link } from "react-router-dom"
import { path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { Organization } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, Id, LoadMore, Loading, When } from "../components/ui"

export function OrganizationsPage() {
  const list = usePaged<Organization>("/organizations", "organizations")

  return (
    <>
      <h1 className="h3 mb-3">Organizations</h1>
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No organizations.</Empty>
      ) : (
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Id</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link to={path`/organizations/${o.id}`}>{o.name}</Link>
                </td>
                <td>{o.slug}</td>
                <td className="small">
                  <Id value={o.id} />
                </td>
                <td className="small">
                  <When at={o.created_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}
