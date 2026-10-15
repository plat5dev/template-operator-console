import { useState } from "react"
import { api, path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { ApiKey } from "../api/identity"
import { ErrorAlert } from "./ErrorAlert"
import { Empty, LoadMore, Loading, Status, When } from "./ui"

/**
 * API keys under a user, member, or service account. Listing and revoking only:
 * this gateway does not route key creation, so operators never hold a customer secret.
 */
export function KeysTable({ base }: { base: string }) {
  const list = usePaged<ApiKey>(base, "keys")
  const [error, setError] = useState<unknown>(null)

  async function revoke(key: ApiKey) {
    if (!window.confirm(`Revoke key "${key.name}" (${key.key_prefix}…)?`)) return
    setError(null)
    try {
      await api("DELETE", base + path`/${key.id}`)
      list.reload()
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <ErrorAlert error={list.error || error} onDismiss={error ? () => setError(null) : undefined} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No API keys.</Empty>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Created</th>
              <th>Revoked</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td>
                  <code>{k.key_prefix}…</code>
                </td>
                <td className="small text-2">
                  <When at={k.created_at} />
                </td>
                <td className="small text-2">
                  {k.revoked_at ? <When at={k.revoked_at} /> : <Status value="active" />}
                </td>
                <td className="actions">
                  {!k.revoked_at && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void revoke(k)}>
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
