// Plat5 identity, as routed by the operator gateway: its own paths, by id.
// Shapes: plat5 docs/reference/api/identity.md#shapes. Ids are lowercase ULIDs.

export type Principal = "person" | "service_account"

export type NodeStatus = "active" | "deleted" | "purged"

export type Ancestor = {
  id: string
  kind: string
  slug: string
  display_name: string
}

/** An organization, a project, or any other kind. `ancestors` is root first, without the node. */
export type Node = {
  id: string
  kind: string
  parent_id: string | null
  root_id: string
  slug: string
  display_name: string
  status: NodeStatus
  deleted_at: string | null
  /** When a deleted node is purged; it can be restored until then. */
  purge_after: string | null
  created_at: string
  updated_at: string
  ancestors: Ancestor[]
}

/** A role for a member on one node. `inherited` when it sits on an ancestor of the node listed. */
export type Binding = {
  id: string
  member_id: string
  node_id: string
  role: string
  inherited: boolean
  guest: boolean
  principal: Principal
  name: string | null
  created_at: string
  updated_at: string
}

/** What a member holds on a node (`GET /nodes/{node_id}/memberships/{member_id}`). `*` is every permission. */
export type Membership = {
  member_id: string
  bindings: Binding[]
  permissions: string[]
}

/** A principal's presence in one tree. `name` is null for a person who hasn't signed in. */
export type Member = {
  id: string
  principal: Principal
  name: string | null
  status: "active" | "removed"
  guest: boolean
}

/** A person, by user id. */
export type User = {
  id: string
  name: string | null
  status: "active" | "suspended"
}

/** A role bindable at a node, with its permissions resolved. */
export type Role = {
  slug: string
  permissions: string[]
}

export type RolesList = {
  roles: Role[]
  creator_role: string
}

/** `id` is its member id; `node_id` is where it was born. */
export type ServiceAccount = {
  id: string
  name: string
  node_id: string
  created_at: string
  updated_at: string
}

export type Key = {
  id: string
  name: string
  key_prefix: string
  created_at: string
  revoked_at: string | null
}

export type Grant = {
  node_id: string
  role: string
}

export type InviteStatus = "active" | "redeemed" | "revoked" | "expired"

export type Invite = {
  id: string
  node_id: string
  role: string
  grants: Grant[]
  max_uses: number | "unlimited"
  use_count: number
  status: InviteStatus
  expires_at: string
  token_prefix: string
  created_at: string
}
