// Plat5 org audit log, as routed by the operator gateway. Shape: plat5 docs/audit.md.

export type AuditEvent = {
  id: string
  occurred_at: string
  request_id: string
  organization_id: string
  actor: {
    member_id: string
    auth_type: string
    key_prefix: string
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
}
