import type { ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthContext"
import { Layout } from "./components/Layout"
import { RequireAuth } from "./components/RequireAuth"
import { CallbackPage } from "./pages/CallbackPage"
import { HomePage } from "./pages/HomePage"
import { MemberPage } from "./pages/MemberPage"
import { NodePage, type NodeTab } from "./pages/NodePage"
import { NodesPage } from "./pages/NodesPage"
import { OperatorLogPage } from "./pages/OperatorLogPage"
import { RequestPage } from "./pages/RequestPage"
import { ServiceAccountPage } from "./pages/ServiceAccountPage"
import { UserPage } from "./pages/UserPage"
import { UsersPage } from "./pages/UsersPage"

const signedIn = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>

// A node's tabs that list one gateway path under it: /nodes/{id}/{tab}.
const nodeTabs: NodeTab[] = ["bindings", "members", "service-accounts", "invites", "roles", "audit-events"]

// Console paths mirror the gateway paths they call, so a URL here names the same target.
// /as/{member_id} before a path acts as that member, on the routes that allow it.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="callback" element={<CallbackPage />} />
            <Route path="nodes" element={signedIn(<NodesPage />)} />
            <Route path="nodes/:nodeId" element={signedIn(<NodePage />)} />
            <Route path="nodes/:nodeId/children/:kind" element={signedIn(<NodePage tab="children" />)} />
            <Route path="as/:memberId/nodes/:nodeId/children/:kind" element={signedIn(<NodePage tab="children" />)} />
            <Route path="environments/:environmentId/tasks" element={signedIn(<NodePage tab="tasks" />)} />
            <Route path="as/:memberId/environments/:environmentId/tasks" element={signedIn(<NodePage tab="tasks" />)} />
            {nodeTabs.map((tab) => (
              <Route key={tab} path={`nodes/:nodeId/${tab}`} element={signedIn(<NodePage tab={tab} />)} />
            ))}
            <Route path="nodes/:nodeId/members/:memberId" element={signedIn(<MemberPage />)} />
            <Route
              path="nodes/:nodeId/service-accounts/:serviceAccountId"
              element={signedIn(<ServiceAccountPage />)}
            />
            <Route path="users" element={signedIn(<UsersPage />)} />
            <Route path="users/:userId" element={signedIn(<UserPage />)} />
            <Route path="users/:userId/nodes" element={signedIn(<UserPage tab="nodes" />)} />
            <Route path="users/:userId/keys" element={signedIn(<UserPage tab="keys" />)} />
            <Route path="users/:userId/audit-events" element={signedIn(<UserPage tab="audit-events" />)} />
            <Route path="operator-audit-events" element={signedIn(<OperatorLogPage />)} />
            <Route path="request" element={signedIn(<RequestPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
