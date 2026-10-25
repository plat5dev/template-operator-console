import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { path } from "../api/client"
import type { Node } from "../api/identity"
import { plural } from "../api/kinds"

/** A node's chain as crumbs, from its `ancestors`: the roots list, each ancestor, then
 *  the node. `tail` follows the node, as a link to it, for a page under it. */
export function NodeCrumbs({ node, tail }: { node: Node; tail?: ReactNode }) {
  const rootKind = node.ancestors[0]?.kind ?? node.kind
  return (
    <>
      <Link to={`/nodes?kind=${encodeURIComponent(rootKind)}`}>{plural(rootKind)}</Link>
      {node.ancestors.map((a) => (
        <Link key={a.id} to={path`/nodes/${a.id}`}>
          {a.display_name}
        </Link>
      ))}
      {tail ? (
        <>
          <Link to={path`/nodes/${node.id}`}>{node.display_name}</Link>
          {tail}
        </>
      ) : (
        <span>{node.display_name}</span>
      )}
    </>
  )
}
