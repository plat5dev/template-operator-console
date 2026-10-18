import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { config } from "../config"
import { Icon, type IconName } from "./icons"
import { Wordmark } from "./Wordmark"

// The staff plane: an amber bar that never scrolls away, and the same sidebar shell as
// the customer console, so nobody mistakes one for the other.
export function Layout() {
  const { session, login, logout } = useAuth()
  // The drawer is open for the page it was opened on, so navigating closes it.
  const location = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.pathname
  const setOpen = (v: boolean) => setOpenOn(v ? location.pathname : null)
  const bar = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState(0)

  // The sidebar sits under the bar, which wraps on narrow screens.
  useEffect(() => {
    const el = bar.current
    if (!el) return
    const ro = new ResizeObserver(() => setBarHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const gateway = new URL(config.gatewayUrl).host

  return (
    <div
      className="shell has-bar"
      data-open={open}
      style={{ ["--bar-h" as string]: `${barHeight}px` }}
    >
      <div className="topbar" ref={bar}>
        <span>
          <b>staff</b> · operator plane · {gateway}
        </span>
        <span>
          {session
            ? `${session.email ?? session.sub} · every request is in the staff audit log`
            : "not signed in"}
        </span>
      </div>

      <div className="mobile-bar">
        <Brand />
        <button type="button" className="icon-btn" aria-label="Menu" onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside className="side">
        <div className="side-top">
          <Brand />
        </div>

        {session && (
          <>
            <nav className="nav-group" aria-label="Directory">
              <h2>directory</h2>
              <Item to="/organizations" icon="orgs">Organizations</Item>
              <Item to="/users" icon="profile">Users</Item>
            </nav>
            <nav className="nav-group" aria-label="Staff">
              <h2>staff</h2>
              <Item to="/staff-activity" icon="audit">Staff activity</Item>
              <Item to="/request" icon="terminal">Request</Item>
            </nav>
          </>
        )}

        <div className="side-foot">
          {session ? (
            <>
              <div className="me">
                <span className="avatar" style={{ borderColor: "var(--accent)", color: "var(--accent-text)", background: "var(--accent-wash)" }}>
                  {(session.email ?? session.sub).slice(0, 2)}
                </span>
                <span>{session.email ?? session.sub}</span>
              </div>
              <button type="button" className="btn btn-sm" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void login("/")}>
              Sign in
            </button>
          )}
          <div className="mono" style={{ fontSize: "0.6875rem", lineHeight: 1.6 }}>
            <div className="break">gateway {config.gatewayUrl}</div>
            <div className="break">issuer {config.issuer}</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Home">
      <Wordmark />
      <span className="plane">operator</span>
    </Link>
  )
}

function Item({ to, icon, children }: { to: string; icon: IconName; children: string }) {
  return (
    <NavLink to={to} className="nav-link">
      <Icon name={icon} />
      {children}
    </NavLink>
  )
}
