// Plat5 identity, as routed by the operator gateway. Shapes: plat5 docs/identity.md.

export type OrganizationRef = { id: string; name: string; slug: string }

export type Organization = OrganizationRef & { created_at: string; updated_at: string }

export type MemberStatus = "active" | "suspended" | "removed"

export type Member = {
  id: string
  organization_id: string
  principal: "user" | "service_account"
  user_id: string | null
  service_account_id: string | null
  status: MemberStatus
  added_by: string | null
  created_at: string
  updated_at: string
}

export type Membership = { id: string; organization: OrganizationRef; status: "active" }

export type ServiceAccount = {
  id: string
  organization_id: string
  member_id: string
  name: string
  status: MemberStatus
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

export type InviteStatus = "active" | "redeemed" | "revoked" | "expired"

export type Invite = {
  id: string
  organization_id: string
  email: string | null
  token_prefix: string
  status: InviteStatus
  max_uses: number | null
  use_count: number
  expires_at: string
  created_by: string | null
  created_at: string
}

export type ApiKey = {
  id: string
  key_prefix: string
  name: string
  created_at: string
  revoked_at: string | null
}

/** One page of an identity list. The collection key varies; see plat5 docs/lists.md. */
export type Page<K extends string, T> = { [key in K]: T[] } & { has_more: boolean }
