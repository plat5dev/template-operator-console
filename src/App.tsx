import type { ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthContext"
import { Layout } from "./components/Layout"
import { RequireAuth } from "./components/RequireAuth"
import { AuditEventsPage } from "./pages/AuditEventsPage"
import { CallbackPage } from "./pages/CallbackPage"
import { HomePage } from "./pages/HomePage"
import { MemberPage } from "./pages/MemberPage"
import { OrganizationPage } from "./pages/OrganizationPage"
import { OrganizationsPage } from "./pages/OrganizationsPage"
import { RequestPage } from "./pages/RequestPage"
import { ServiceAccountPage } from "./pages/ServiceAccountPage"
import { UserPage } from "./pages/UserPage"
import { UsersPage } from "./pages/UsersPage"

const signedIn = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>

// Console paths mirror the gateway paths they call, so a URL here names the same target.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="callback" element={<CallbackPage />} />
            <Route path="organizations" element={signedIn(<OrganizationsPage />)} />
            <Route path="organizations/:organizationId" element={signedIn(<OrganizationPage />)} />
            <Route path="organizations/:organizationId/audit-events" element={signedIn(<AuditEventsPage />)} />
            <Route
              path="organizations/:organizationId/service-accounts/:serviceAccountId"
              element={signedIn(<ServiceAccountPage />)}
            />
            <Route path="members/:memberId" element={signedIn(<MemberPage />)} />
            <Route path="users" element={signedIn(<UsersPage />)} />
            <Route path="users/:userId" element={signedIn(<UserPage />)} />
            <Route path="request" element={signedIn(<RequestPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
