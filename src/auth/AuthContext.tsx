import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { setUnauthorizedHandler } from "../api/client"
import { login as startLogin } from "./oidc"
import { clearSession, readSession, type Session } from "./session"

type AuthState = {
  session: Session | null
  login: (returnTo?: string) => Promise<void>
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const refresh = useCallback(() => setSession(readSession()), [])

  // Sign-out is local: the token is dropped. The IdP's own session is left alone.
  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const login = useCallback(async (returnTo?: string) => {
    await startLogin(returnTo ?? window.location.pathname + window.location.search)
  }, [])

  // A 401 from the gateway means this token is done, whatever its exp says.
  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  return (
    <AuthContext.Provider value={{ session, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth outside AuthProvider")
  return ctx
}
