import { Link } from "react-router-dom"
import { path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { Organization } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { initials } from "../components/initials"
import { Empty, Id, LoadMore, Loading, PageHead, When } from "../components/ui"

export function OrganizationsPage() {
  const list = usePaged<Organization>("/organizations", "organizations")

  return (
    <>
      <PageHead eyebrow="/organizations" title="Organizations" lede="Every organization in this deployment." />
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No organizations.</Empty>
      ) : (
        <div className="table-wrap">
        <table className="table hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Id</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className="who">
                    <span className="avatar square">{initials(o.name)}</span>
                    <Link className="list-title" to={path`/organizations/${o.id}`}>{o.name}</Link>
                  </span>
                </td>
                <td className="small">
                  <Id value={o.id} />
                </td>
                <td className="small text-2">
                  <When at={o.created_at} />
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
