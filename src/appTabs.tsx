import type { ReactNode } from "react"
import { path } from "./api/client"
import type { Node } from "./api/identity"
import { tasksKind } from "./api/tasks"
import { TasksTab } from "./pages/TasksTab"

export type AppNodeTab = {
  /** Tab key (unique across tabs on a node). */
  key: string
  /** Which kind in `KINDS` (`src/api/kinds.ts`) gets this tab. */
  kind: string
  label: string
  /** Console & gateway route pattern (use `:nodeId` for the node's id). */
  routePath: string
  /** Also mount `/as/:memberId/<routePath>` for acting as a member. */
  asMember?: boolean
  /** Concrete console path for a given node. */
  nodePath: (node: Node) => string
  render: (props: { node: Node; memberId?: string }) => ReactNode
}

/**
 * Your API's tabs on a node. Replace or remove the `tasks` entry when swapping out
 * the starter API for your own domain — `App.tsx` and `NodePage.tsx` read this list.
 */
export const APP_NODE_TABS: AppNodeTab[] = [
  {
    key: "tasks",
    kind: tasksKind,
    label: "Tasks",
    routePath: "projects/:nodeId/tasks",
    asMember: true,
    nodePath: (node) => path`/projects/${node.id}/tasks`,
    render: ({ node, memberId }) => <TasksTab node={node} memberId={memberId} />,
  },
]
