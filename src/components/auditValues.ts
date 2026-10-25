// The values both audit logs' filters share.
import type { Outcome } from "../api/audit"

export const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]
export const OUTCOMES: Outcome[] = ["pending", "rejected", "responded", "no_response"]

// Pending is unknown, never success: dashed. Refused: red.
export const outcomeClass: Record<Outcome, string> = {
  pending: "badge-dashed",
  rejected: "badge-danger",
  responded: "",
  no_response: "badge-dashed",
}

/** A datetime-local value as RFC 3339 UTC, or "" when empty or not a time. */
export function toRfc3339(local: string): string {
  const v = local.trim()
  if (!v) return ""
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString()
}
