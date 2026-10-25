import { useCallback, useEffect, useState } from "react"
import { api, path } from "./client"
import type { Member } from "./identity"

// Each hook keeps the result of its latest request with the key it was made for.
// Loading is "the result is for a different key", so effects never reset state up front.

type Result<T> = { key: string; path: string; data?: T; error?: unknown }

/** GETs one resource. `reload` fetches it again. */
export function useResource<T>(path: string) {
  const [version, setVersion] = useState(0)
  const key = `${path}#${version}`
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    let live = true
    api<T>("GET", path)
      .then((data) => live && setResult({ key, path, data }))
      .catch((error: unknown) => live && setResult({ key, path, error }))
    return () => {
      live = false
    }
  }, [key, path])

  const current = result?.path === path ? result : null
  const setData = useCallback((data: T) => setResult((r) => r && { ...r, data, error: undefined }), [])
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return {
    data: current?.data ?? null,
    error: current?.key === key ? current.error : null,
    loading: current?.key !== key,
    setData,
    reload,
  }
}

type PageResult<T> = Result<T[]> & { hasMore: boolean }

function withCursor(path: string, after?: string): string {
  if (!after) return path
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}starting_after=${encodeURIComponent(after)}`
}

/** Walks a list a page at a time. `starting_after` is the last id seen.
 *  A query string already on `path` is kept; the cursor is appended. */
export function usePaged<T extends { id: string }>(path: string, collection: string) {
  const [version, setVersion] = useState(0)
  const key = `${path}#${version}`
  const [result, setResult] = useState<PageResult<T> | null>(null)
  const [more, setMore] = useState(false)

  const fetchPage = useCallback(
    async (after?: string) => {
      const page = await api<Record<string, unknown>>("GET", withCursor(path, after))
      return { items: (page[collection] as T[] | undefined) ?? [], hasMore: page.has_more === true }
    },
    [path, collection],
  )

  useEffect(() => {
    let live = true
    fetchPage()
      .then((p) => live && setResult({ key, path, data: p.items, hasMore: p.hasMore }))
      .catch((error: unknown) => live && setResult({ key, path, error, hasMore: false }))
    return () => {
      live = false
    }
  }, [fetchPage, key, path])

  const current = result?.path === path ? result : null
  const items = current?.data ?? []
  const lastId = items.at(-1)?.id

  const loadMore = useCallback(async () => {
    if (!lastId) return
    setMore(true)
    try {
      const p = await fetchPage(lastId)
      setResult((r) => {
        if (!r || r.path !== path) return r
        return { ...r, data: [...(r.data ?? []), ...p.items], hasMore: p.hasMore }
      })
    } catch (error) {
      setResult((r) => (r && r.path === path ? { ...r, error } : r))
    } finally {
      setMore(false)
    }
  }, [fetchPage, lastId, path])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return {
    items,
    hasMore: current?.hasMore ?? false,
    error: current?.error ?? null,
    loading: current?.key !== key || more,
    loadMore,
    reload,
  }
}

/** What a member is called: its name, or for a person who hasn't signed in, null. */
export type MemberName = { name: string | null; serviceAccount: boolean }

/** A member to name: its id and its tree's root. */
export type MemberRef = { rootId: string; memberId: string }

// Names by member, shared across pages. A member's name rarely changes while
// operators look, and a reload clears it.
const memberNames = new Map<string, Promise<MemberName>>()

function memberName(rootId: string, memberId: string): Promise<MemberName> {
  const key = `${rootId}/${memberId}`
  let p = memberNames.get(key)
  if (!p) {
    p = api<Member>("GET", path`/nodes/${rootId}/members/${memberId}`)
      .then((m) => ({ name: m.name, serviceAccount: m.principal === "service_account" }))
      .catch(() => ({ name: null, serviceAccount: false }))
    memberNames.set(key, p)
  }
  return p
}

/** Names for these members, looked up once each, by member id. Ids still loading are absent. */
export function useMemberNames(refs: MemberRef[]): Map<string, MemberName> {
  const [names, setNames] = useState(() => new Map<string, MemberName>())
  const key = [...new Set(refs.map((r) => `${r.rootId}/${r.memberId}`))].sort().join(",")

  useEffect(() => {
    let live = true
    for (const ref of key ? key.split(",") : []) {
      const [rootId, memberId] = ref.split("/") as [string, string]
      void memberName(rootId, memberId).then((n) => {
        if (live) setNames((prev) => (prev.get(memberId) === n ? prev : new Map(prev).set(memberId, n)))
      })
    }
    return () => {
      live = false
    }
  }, [key])

  return names
}
