import { useState } from "react"
import { useAuth } from "../auth/AuthContext"
import { ErrorAlert } from "../components/ErrorAlert"
import { Field, Fields } from "../components/ui"
import { config } from "../config"
import { NodesPage } from "./NodesPage"

export function HomePage() {
  const { session, login } = useAuth()
  const [error, setError] = useState<unknown>(null)

  // Signed in, home is the roots list: one click to an organization, its tree, its
  // members, and its audit log. The connection details sit under it.
  if (session) {
    return (
      <>
        <NodesPage />
        <p className="small muted">
          Signed in as {session.email ?? session.sub} · gateway <code>{config.gatewayUrl}</code> · issuer{" "}
          <code>{config.issuer}</code>
        </p>
      </>
    )
  }

  return (
    <>
      <section className="hero">
        <p className="eyebrow">operator console</p>
        <h1>Every tree and person, for the people who run this deployment</h1>
        <p>
          Every page is a call to the operator gateway with your operator token. The gateway records who did what
          in the operator log; this console keeps nothing.
        </p>
        <div className="cluster">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => login("/").catch(setError)}>
            Sign in with your operator IdP
          </button>
        </div>
        <ErrorAlert error={error} />
      </section>

      <section className="card narrow">
        <div className="card-head">
          <h2>Connection</h2>
        </div>
        <div className="card-body">
          <Fields>
            <Field label="Gateway"><code>{config.gatewayUrl}</code></Field>
            <Field label="Issuer"><code>{config.issuer}</code></Field>
            <Field label="Client"><code>{config.clientId}</code></Field>
          </Fields>
        </div>
      </section>
    </>
  )
}
