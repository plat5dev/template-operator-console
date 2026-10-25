// The two audit logs this console reads through the operator gateway.

import type { Principal } from "./identity"

/** Plat5's audit log: a node's (`GET /nodes/{node_id}/audit-events`) or a person's
 *  (`GET /users/{user_id}/audit-events`). Shape: plat5 docs/reference/api/audit.md. */
export type AuditEvent = {
  id: string
  occurred_at: string
  request_id: string
  /** The chain's root. null on a user route. */
  root_id: string | null
  nodes: { kind: string; id: string }[]
  actor: {
    member_id: string | null
    /** Only in a person's own log. */
    user_id: string | null
    principal: Principal
    auth_type: "jwt" | "apikey"
    /** null for a JWT. */
    key_id: string | null
  }
  service: string
  method: string
  route: string
  params: Record<string, string>
  ip: string
  user_agent: string | null
  outcome: Outcome
  status: number | null
  details: Record<string, unknown> | null
  /** The id a create produced. */
  created_id: string | null
  /** On a user route, the chain and member the service named. */
  named_node_ids: string[]
  named_member_id: string | null
}

export type Outcome = "pending" | "rejected" | "responded" | "no_response"

/** The operator log (`GET /operator-audit-events`): what operators did through the
 *  operator gateway, this console included. Shape: operator docs/reference/api/operator-audit.md. */
export type OperatorAuditEvent = {
  id: string
  occurred_at: string
  request_id: string
  actor: { issuer: string; operator_id: string; email: string | null; client_id: string | null }
  acting_as: { member_id: string; principal: Principal } | null
  root_id: string | null
  nodes: { kind: string; id: string }[]
  service: string | null
  method: string
  route: string | null
  params: Record<string, string>
  /** Set only when no route matched. */
  path: string | null
  ip: string
  user_agent: string | null
  outcome: Outcome
  status: number | null
  response_bytes: number | null
  details: Record<string, unknown> | null
  created_id: string | null
}
