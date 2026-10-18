// The project's API, as routed by the operator gateway: its own listen paths, with the
// org in the path. Every template-*-api starter serves these; operator.routes.yml routes
// them for staff.

export type Project = {
  id: string
  organization_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export type TaskStatus = "todo" | "in_progress" | "done"

export type Task = {
  id: string
  organization_id: string
  project_id: string
  title: string
  status: TaskStatus
  created_at: string
  updated_at: string
}
