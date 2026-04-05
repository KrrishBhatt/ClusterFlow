import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clearAuth, getUserId } from '../utils/auth'
import logo from '../assets/logo.jpeg'

const NAV = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/friends',   label: 'Friends'   },
  { path: '/rooms',     label: 'Rooms'     },
]

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const userId   = getUserId()

  function handleLogout() { clearAuth(); navigate('/') }

  return (
    <header className="topbar">
      <Link to="/dashboard" className="topbar-brand">
        <img src={logo} alt="ClusterFlow" className="topbar-logo" />
        <div className="topbar-brand-text">
          <span className="topbar-brand-name">ClusterFlow</span>
          <span className="topbar-brand-tag">Together, We Compute</span>
        </div>
      </Link>

      <nav className="topbar-nav">
        {NAV.map(n => (
          <Link
            key={n.path}
            to={n.path}
            className={`nav-item${
              location.pathname === n.path ||
              (n.path === '/rooms' && location.pathname.startsWith('/room'))
                ? ' active' : ''
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-right">
        <div className="user-pill">
          <div className="user-avatar">&#128100;</div>
          <span className="user-id">{userId || 'guest'}</span>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button>
      </div>
    </header>
  )
}