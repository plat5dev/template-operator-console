import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { Field, Fields, Id } from "../components/ui"
import { config } from "../config"

export function HomePage() {
  const { session } = useAuth()

  return (
    <>
      <h1 className="h3 mb-3">Operator Console</h1>
      <p className="text-body-secondary">
        An example client of the operator gateway. Every page is a call to a gateway path with your staff token. The
        gateway logs who did what; this console keeps nothing.
      </p>

      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h6">Connection</h2>
          <Fields>
            <Field label="Gateway"><code>{config.gatewayUrl}</code></Field>
            <Field label="Issuer"><code>{config.issuer}</code></Field>
            <Field label="Client"><code>{config.clientId}</code></Field>
          </Fields>
        </div>
      </div>

      {session ? (
        <div className="card">
          <div className="card-body">
            <h2 className="h6">Signed in</h2>
            <Fields>
              <Field label="Operator id"><Id value={session.sub} /></Field>
              <Field label="Email">{session.email ?? "—"}</Field>
              <Field label="Token expires">{new Date(session.expiresAt).toLocaleString()}</Field>
            </Fields>
            <div className="mt-3 d-flex gap-2">
              <Link className="btn btn-outline-primary btn-sm" to="/organizations">
                Organizations
              </Link>
              <Link className="btn btn-outline-primary btn-sm" to="/users">
                Look up a user
              </Link>
              <Link className="btn btn-outline-secondary btn-sm" to="/request">
                Raw request
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <p>Sign in with your staff IdP to start.</p>
      )}
    </>
  )
}
