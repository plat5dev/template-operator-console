import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { completeLogin } from "../auth/oidc"
import { ErrorAlert } from "../components/ErrorAlert"

export function CallbackPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    completeLogin(window.location.href)
      .then((returnTo) => {
        refresh()
        // Only a path on this origin. Anything else goes home.
        navigate(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/", { replace: true })
      })
      .catch(setError)
  }, [navigate, refresh])

  if (!error) return <div className="loading-page">Signing in…</div>
  return (
    <div className="stack narrow">
      <ErrorAlert error={error} />
      <Link to="/">Back</Link>
    </div>
  )
}
