// The starter API's tasks, as routed by the operator gateway: its own paths, by
// environment node id (`GET /environments/{environment_id}/tasks`). Every template-*-api starter
// serves them, and its routes.operator.yml routes them for operators, read-only and
// with as_member. With a starter of your own, change this file and the tasks tab.

/** The kind whose nodes have tasks. */
export const tasksKind = "environment"

export type TaskStatus = "todo" | "in_progress" | "done"

/** `created_by` is the member id of whoever created it. */
export type Task = {
  id: string
  environment_id: string
  title: string
  status: TaskStatus
  created_by: string
  created_at: string
  updated_at: string
}
