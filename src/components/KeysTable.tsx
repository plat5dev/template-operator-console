import { useState } from "react"
import { api, path } from "../api/client"
import { usePaged } from "../api/hooks"
import type { ApiKey } from "../api/identity"
import { ErrorAlert } from "./ErrorAlert"
import { Empty, LoadMore, Loading, When } from "./ui"

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
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Scopes</th>
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
                <td className="small">{k.scopes?.length ? k.scopes.join(", ") : <span className="text-body-secondary">all</span>}</td>
                <td className="small">
                  <When at={k.created_at} />
                </td>
                <td className="small">
                  <When at={k.revoked_at} />
                </td>
                <td className="text-end">
                  {!k.revoked_at && (
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void revoke(k)}>
                      Revoke
                    </button>
                  )}
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
