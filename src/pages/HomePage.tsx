import { useAuth } from "../auth/AuthContext"
import { Field, Fields } from "../components/ui"
import { config } from "../config"
import { OrganizationsPage } from "./OrganizationsPage"

export function HomePage() {
  const { session } = useAuth()

  // Signed in, home is the organizations list: one click to an org, its members, and its
  // audit log. The connection details sit under it.
  if (session) {
    return (
      <>
        <OrganizationsPage />
        <p className="small text-body-secondary mt-4 mb-0">
          Signed in as {session.email ?? session.sub} · gateway <code>{config.gatewayUrl}</code> · issuer{" "}
          <code>{config.issuer}</code>
        </p>
      </>
    )
  }

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

      <p>Sign in with your staff IdP to start.</p>
    </>
  )
}
