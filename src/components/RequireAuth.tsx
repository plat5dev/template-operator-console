import { useState, type ReactNode } from "react"
import { useAuth } from "../auth/AuthContext"
import { ErrorAlert } from "./ErrorAlert"

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, login } = useAuth()
  const [error, setError] = useState<unknown>(null)
  if (session) return <>{children}</>

  return (
    <div className="card mx-auto" style={{ maxWidth: "28rem" }}>
      <div className="card-body">
        <h1 className="h5">Sign in</h1>
        <p className="text-body-secondary">This page calls the gateway with your staff token.</p>
        <ErrorAlert error={error} />
        <button type="button" className="btn btn-primary" onClick={() => login().catch(setError)}>
          Sign in with your IdP
        </button>
      </div>
    </div>
  )
}
