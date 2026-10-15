// Plat5 audit logs (an org's, a person's), as routed by the operator gateway. Shape: plat5 docs/audit.md.

export type AuditEvent = {
  id: string
  occurred_at: string
  request_id: string
  /** The org's log; in a person's log, the org the service named, else null. */
  organization_id: string | null
  /** Only in a person's log: whose it is. */
  user_id?: string | null
  actor: {
    /** null on a person's event no org was named for. */
    member_id: string | null
    auth_type: string
    /** null for a JWT. */
    key_prefix: string | null
  }
  service: string
  method: string
  route: string
  params: Record<string, string>
  ip: string
  user_agent: string | null
  outcome: string
  status: number | null
  details: unknown
  /** The id a create produced. */
  created_id: string | null
}

/** The staff audit log (operator docs/audit.md): what staff did through the operator gateway. */
export type StaffAuditEvent = {
  id: string
  occurred_at: string
  request_id: string
  actor: { issuer: string; operator_id: string; email: string | null; client_id: string | null }
  upstream: string
  method: string
  route: string
  params: Record<string, string>
  path: string | null
  ip: string
  outcome: string
  status: number | null
  details: unknown
}
