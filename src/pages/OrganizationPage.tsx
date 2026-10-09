import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api, path } from "../api/client"
import { usePaged, useResource } from "../api/hooks"
import type { Invite, Member, Organization, ServiceAccount } from "../api/identity"
import { ErrorAlert } from "../components/ErrorAlert"
import { Empty, Field, Fields, Id, LoadMore, Loading, Status, When } from "../components/ui"

type Tab = "members" | "invites" | "service-accounts"

export function OrganizationPage() {
  const { organizationId = "" } = useParams()
  const base = path`/organizations/${organizationId}`
  const org = useResource<Organization>(base)
  const [tab, setTab] = useState<Tab>("members")

  if (org.loading && !org.data) return <Loading />
  if (!org.data) return <ErrorAlert error={org.error} />

  return (
    <>
      <nav className="small mb-2">
        <Link to="/organizations">Organizations</Link>
      </nav>
      <div className="d-flex align-items-baseline justify-content-between mb-3">
        <h1 className="h3 mb-0">{org.data.name}</h1>
        <Link to={path`/organizations/${organizationId}/audit-events`}>Audit log</Link>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <Fields>
            <Field label="Id"><Id value={org.data.id} /></Field>
            <Field label="Slug">{org.data.slug}</Field>
            <Field label="Created"><When at={org.data.created_at} /></Field>
            <Field label="Updated"><When at={org.data.updated_at} /></Field>
          </Fields>
          <EditOrganization base={base} org={org.data} onSaved={org.setData} />
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        {(
          [
            ["members", "Members"],
            ["invites", "Invites"],
            ["service-accounts", "Service accounts"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <li className="nav-item" key={key}>
            <button type="button" className={`nav-link ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
            </button>
          </li>
        ))}
      </ul>
      {tab === "members" && <Members base={base} />}
      {tab === "invites" && <Invites base={base} />}
      {tab === "service-accounts" && <ServiceAccounts base={base} />}
    </>
  )
}

function EditOrganization({ base, org, onSaved }: { base: string; org: Organization; onSaved: (o: Organization) => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState(org.name)
  const [slug, setSlug] = useState(org.slug)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSaved(await api<Organization>("PATCH", base, { name, slug }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const typed = window.prompt(
      `Delete ${org.name}? This hard-deletes its members, invites, service accounts, and keys.\n\nType the slug "${org.slug}" to confirm.`,
    )
    if (typed !== org.slug) return
    setError(null)
    try {
      await api("DELETE", base)
      navigate("/organizations", { replace: true })
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form className="mt-3 pt-3 border-top" onSubmit={(e) => void save(e)}>
      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      <div className="row g-2 align-items-end">
        <div className="col-md-4">
          <label className="form-label small">Name</label>
          <input className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="col-md-4">
          <label className="form-label small">Slug</label>
          <input className="form-control form-control-sm" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div className="col-md-4 d-flex gap-2">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={busy || (name === org.name && slug === org.slug)}
          >
            Save
          </button>
          <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={() => void remove()}>
            Delete organization
          </button>
        </div>
      </div>
    </form>
  )
}

function Members({ base }: { base: string }) {
  const list = usePaged<Member>(base + "/members", "members")
  const [userId, setUserId] = useState("")
  const [error, setError] = useState<unknown>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api("POST", base + "/members", { user_id: userId.trim() })
      setUserId("")
      list.reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <ErrorAlert error={list.error || error} onDismiss={error ? () => setError(null) : undefined} />
      <form className="d-flex gap-2 mb-3" style={{ maxWidth: "32rem" }} onSubmit={(e) => void add(e)}>
        <input
          className="form-control form-control-sm"
          placeholder="user_id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-outline-primary btn-sm text-nowrap">
          Add member
        </button>
      </form>
      {list.loading && list.items.length === 0 ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty>No members.</Empty>
      ) : (
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Member</th>
              <th>Principal</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={path`/members/${m.id}`}>
                    <code>{m.id}</code>
                  </Link>
                </td>
                <td className="small">
                  {m.user_id ? (
                    <>
                      user <Link to={path`/users/${m.user_id}`}>{m.user_id}</Link>
                    </>
                  ) : (
                    <>
                      service account{" "}
                      <Link to={base + path`/service-accounts/${m.service_account_id ?? ""}`}>
                        {m.service_account_id}
                      </Link>
                    </>
                  )}
                </td>
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
        <table className="table table-sm align-middle">
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
                <td className="small">{inv.email ?? <span className="text-body-secondary">any</span>}</td>
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
                <td className="text-end">
                  {inv.status === "active" && (
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void revoke(inv)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <table className="table table-sm align-middle">
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
      )}
      <LoadMore show={list.hasMore} loading={list.loading} onClick={() => void list.loadMore()} />
    </>
  )
}
