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

  if (!error) return <p className="text-body-secondary">Signing in…</p>
  return (
    <>
      <ErrorAlert error={error} />
      <Link to="/">Back</Link>
    </>
  )
}
