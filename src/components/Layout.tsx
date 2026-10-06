import { Link, NavLink, Outlet } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { config } from "../config"

export function Layout() {
  const { session, login, logout } = useAuth()

  return (
    <>
      <nav className="navbar navbar-expand navbar-dark bg-dark mb-4">
        <div className="container">
          <Link className="navbar-brand" to="/">
            Operator Console
          </Link>
          {session && (
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <NavLink className="nav-link" to="/organizations">
                  Organizations
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/users">
                  Users
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/request">
                  Request
                </NavLink>
              </li>
            </ul>
          )}
          <div className="ms-auto d-flex align-items-center gap-3">
            <span className="navbar-text small d-none d-md-inline">{new URL(config.gatewayUrl).host}</span>
            {session ? (
              <>
                <span className="navbar-text small">{session.email ?? session.sub}</span>
                <button type="button" className="btn btn-outline-light btn-sm" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void login("/")}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>
      <main className="container pb-5">
        <Outlet />
      </main>
    </>
  )
}
