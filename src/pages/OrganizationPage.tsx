import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { usePaged, useResource } from "../api/hooks"
import type { Invite, Member, Organization, ServiceAccount } from "../api/identity"
import { AuditLog } from "../components/AuditLog"
import { ErrorAlert } from "../components/ErrorAlert"
import { initials } from "../components/initials"
import { Empty, Id, LoadMore, Loading, PageHead, Status, Tabs, When } from "../components/ui"

type Tab = "members" | "invites" | "service-accounts" | "audit"

/** An org, with its members, invites, service accounts, and audit log as tabs. The
 *  audit tab has its own URL (`…/audit-events`), so a link can open it. */
export function OrganizationPage({ audit = false }: { audit?: boolean }) {
  const { organizationId = "" } = useParams()
  const navigate = useNavigate()
  const base = path`/organizations/${organizationId}`
  const org = useResource<Organization>(base)
  const [listTab, setListTab] = useState<Exclude<Tab, "audit">>("members")
  const tab: Tab = audit ? "audit" : listTab
  function setTab(t: Tab) {
    if (t === "audit") {
      navigate(base + "/audit-events")
      return
    }
    setListTab(t)
    if (audit) navigate(base)
  }

  if (org.loading && !org.data) return <Loading />
  if (!org.data) return <ErrorAlert error={org.error} />

  return (
    <>
      <PageHead
        crumbs={
          <>
            <Link to="/organizations">Organizations</Link>
            <span>{org.data.name}</span>
          </>
        }
        eyebrow={
          <>
            <Id value={org.data.id} /> · created <When at={org.data.created_at} />
          </>
        }
        title={org.data.name}
      />

      <EditOrganization base={base} org={org.data} onSaved={org.setData} />

      <div className="stack">
        <Tabs
          tabs={[
            ["members", "Members"],
            ["invites", "Invites"],
            ["service-accounts", "Service accounts"],
            ["audit", "Audit log"],
          ]}
          current={tab}
          onChange={setTab}
        />
        {tab === "members" && <Members base={base} />}
        {tab === "invites" && <Invites base={base} />}
        {tab === "service-accounts" && <ServiceAccounts base={base} />}
        {tab === "audit" && <AuditLog base={base} person={false} />}
      </div>
    </>
  )
}

function EditOrganization({ base, org, onSaved }: { base: string; org: Organization; onSaved: (o: Organization) => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState(org.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSaved(await api<Organization>("PATCH", base, { name }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const typed = window.prompt(
      `Delete ${org.name}? This hard-deletes its members, invites, service accounts, and keys.\n\nType the name "${org.name}" to confirm.`,
    )
    if (typed !== org.name) return
    setError(null)
    try {
      await api("DELETE", base)
      navigate("/organizations", { replace: true })
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form className="card" onSubmit={(e) => void save(e)}>
      <div className="card-body">
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <div className="form-row">
          <div className="field">
            <label htmlFor="org_name">Name</label>
            <input id="org_name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || name === org.name}>
            Save
          </button>
          <button type="button" className="btn btn-danger end" onClick={() => void remove()}>
            Delete organization
          </button>
        </div>
      </div>
    </form>
  )
}

function Members({ base }: { base: string }) {
  const list = usePaged<Member>(base + "/members", "members")
  const [issuer, setIssuer] = useState("")
  const [subject, setSubject] = useState("")
  const [error, setError] = useState<unknown>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api("POST", base + "/members", { idp: { issuer: issuer.trim(), subject: subject.trim() } })
      setSubject("")
      list.reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <ErrorAlert error={list.error || error} onDismiss={error ? () => setError(null) : undefined} />
      <form className="form-row" style={{ maxWidth: "44rem" }} onSubmit={(e) => void add(e)}>
        <input
          className="input grow"
          aria-label="IdP issuer"
          placeholder="IdP issuer"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          required
        />
        <input
          className="input grow"
          aria-label="IdP subject"
          placeholder="IdP subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <button type="submit" className="btn">
          Add member
        </button>
      </form>
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No members.</Empty>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Principal</th>
              <th>Role</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((m) => (
              <tr key={m.id}>
                <td>
                  <span className="who">
                    <span className={`avatar${m.principal === "user" ? "" : " square"}`}>
                      {m.principal === "user" ? initials(m.display_name ?? "?") : "SA"}
                    </span>
                    <span>
                      <Link className="list-title" to={path`/members/${m.id}`}>
                        {m.display_name ?? <span className="muted">(no name yet)</span>}
                      </Link>
                      <span className="sub mono">{m.id}</span>
                    </span>
                  </span>
                </td>
                <td className="small">
                  {m.principal === "user" ? (
                    "person"
                  ) : (
                    <Link to={base + path`/service-accounts/${m.service_account_id ?? ""}`}>service account</Link>
                  )}
                </td>
                <td className="small">{m.role ?? <span className="muted">none</span>}</td>
                <td>
                  <Status value={m.status} />
                </td>
                <td className="small">
                  <When at={m.created_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}

function Invites({ base }: { base: string }) {
  const list = usePaged<Invite>(base + "/invites", "invites")
  const [error, setError] = useState<unknown>(null)

  async function revoke(inv: Invite) {
    if (!window.confirm(`Revoke invite ${inv.token_prefix}…?`)) return
    setError(null)
    try {
      await api("DELETE", base + path`/invites/${inv.id}`)
      list.reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <ErrorAlert error={list.error || error} onDismiss={error ? () => setError(null) : undefined} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No invites.</Empty>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Prefix</th>
              <th>Email</th>
              <th>Status</th>
              <th>Uses</th>
              <th>Expires</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <code>{inv.token_prefix}…</code>
                </td>
                <td className="small">{inv.email ?? <span className="muted">any</span>}</td>
                <td>
                  <Status value={inv.status} />
                </td>
                <td className="small">
                  {inv.use_count}
                  {inv.max_uses !== null && ` / ${inv.max_uses}`}
                </td>
                <td className="small">
                  <When at={inv.expires_at} />
                </td>
                <td className="actions">
                  {inv.status === "active" && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void revoke(inv)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}

function ServiceAccounts({ base }: { base: string }) {
  const list = usePaged<ServiceAccount>(base + "/service-accounts", "service_accounts")

  return (
    <>
      <ErrorAlert error={list.error} />
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No service accounts.</Empty>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Id</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((sa) => (
              <tr key={sa.id}>
                <td>
                  <Link to={base + path`/service-accounts/${sa.id}`}>{sa.name}</Link>
                </td>
                <td className="small">
                  <Id value={sa.id} />
                </td>
                <td>
                  <Status value={sa.status} />
                </td>
                <td className="small">
                  <When at={sa.created_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}
