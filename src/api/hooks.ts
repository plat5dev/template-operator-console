import { useCallback, useEffect, useState } from "react"
import { api } from "./client"

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

/** Walks an identity list a page at a time: `starting_after` is the last id seen. */
export function usePaged<T extends { id: string }>(path: string, collection: string) {
  const [version, setVersion] = useState(0)
  const key = `${path}#${version}`
  const [result, setResult] = useState<PageResult<T> | null>(null)
  const [more, setMore] = useState(false)

  const fetchPage = useCallback(
    async (after?: string) => {
      const q = after ? `?starting_after=${encodeURIComponent(after)}` : ""
      const page = await api<Record<string, unknown>>("GET", path + q)
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
      setResult((r) => r && { ...r, data: [...(r.data ?? []), ...p.items], hasMore: p.hasMore })
    } catch (error) {
      setResult((r) => r && { ...r, error })
    } finally {
      setMore(false)
    }
  }, [fetchPage, lastId])

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
