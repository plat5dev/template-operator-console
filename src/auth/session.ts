// The staff token lives in sessionStorage: it survives a reload, not a closed tab. No cookies.
export type Session = {
  accessToken: string
  expiresAt: number
  sub: string
  email: string | null
  name: string | null
}

const KEY = "operator-console.session"

export function readSession(): Session | null {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as Session
    if (s.expiresAt > Date.now()) return s
  } catch {
    // Unreadable is the same as absent.
  }
  sessionStorage.removeItem(KEY)
  return null
}

export function writeSession(s: Session): void {
  sessionStorage.setItem(KEY, JSON.stringify(s))
}

export function clearSession(): void {
  sessionStorage.removeItem(KEY)
}
