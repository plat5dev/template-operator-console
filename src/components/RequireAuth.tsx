import { useState, type ReactNode } from "react"
import { useAuth } from "../auth/AuthContext"
import { ErrorAlert } from "./ErrorAlert"

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, login } = useAuth()
  const [error, setError] = useState<unknown>(null)
  if (session) return <>{children}</>

  return (
    <div className="center">
      <div className="card">
        <div className="card-body">
          <h1 className="section-title" style={{ fontSize: "1.25rem" }}>Staff sign-in</h1>
          <p className="section-lede">This page calls the operator gateway with your staff token.</p>
          <ErrorAlert error={error} />
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => login().catch(setError)}>
            Sign in with your staff IdP
          </button>
        </div>
      </div>
    </div>
  )
}
