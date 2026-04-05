import React from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getUserId } from '../utils/auth'

export default function DashboardPage() {
  const userId = getUserId()

  return (
    <div className="app-shell">
      <Topbar />
      <div className="page-content">

        <div className="page-header">
          <h1 className="page-title">
            Welcome back<span className="page-title-accent">.</span>
          </h1>
          <p className="page-subtitle">// {userId} &nbsp;·&nbsp; ClusterFlow node online</p>
        </div>

        {/* STAT CARDS */}
        <div className="stats-grid">
          {[
            { label: 'Network',   value: 'Active', sub: 'system online',   color: 'var(--green-bright)' },
            { label: 'Your Node', value: userId,   sub: 'your cluster ID', color: 'var(--amber-bright)', mono: true, small: true },
            { label: 'Platform',  value: 'v1.0',   sub: 'ClusterFlow',      color: 'var(--green-mid)' },
            { label: 'Status',    value: 'Ready',  sub: 'awaiting task',    color: 'var(--text-secondary)' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div
                className={s.mono ? 'mono' : ''}
                style={{
                  color: s.color,
                  fontSize: s.small ? '1rem' : '2rem',
                  fontWeight: s.small ? 500 : undefined,
                  lineHeight: 1,
                  marginBottom: '0.35rem',
                  marginTop: s.small ? '0.2rem' : undefined,
                  overflowWrap: 'break-word',
                }}>
                {s.value}
              </div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* QUICK ACTIONS — only 2 cards, no dashed dataset card */}
        <div className="section-label" style={{ marginBottom: '1rem' }}>What would you like to do?</div>
        <div className="grid-2" style={{ marginBottom: '2rem', maxWidth: 680 }}>

          <Link to="/rooms" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.85rem' }}>&#128421;</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>Rooms</div>
              <div className="text-muted" style={{ fontSize: '0.84rem', lineHeight: 1.65 }}>
                Create a cluster room or accept invites to join one. Upload datasets and track processing inside.
              </div>
            </div>
          </Link>

          <Link to="/friends" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '0.85rem' }}>&#128101;</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>Friends</div>
              <div className="text-muted" style={{ fontSize: '0.84rem', lineHeight: 1.65 }}>
                Build your network. Send requests, accept connections, and invite collaborators to your rooms.
              </div>
            </div>
          </Link>

        </div>

        {/* HOW IT WORKS */}
        <div className="section-label" style={{ marginBottom: '1rem' }}>How ClusterFlow works</div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem' }}>
            {[
              { n: '01', title: 'Add Friends',         desc: 'Build your network — find collaborators via their user ID.' },
              { n: '02', title: 'Create or Join Room', desc: 'Host creates a room and invites friends. Members accept invites.' },
              { n: '03', title: 'Distribute Dataset',  desc: 'Host uploads a CSV. Auto-split into chunks — one per member.' },
              { n: '04', title: 'Collect Results',     desc: 'Each worker submits their chunk. Host downloads the final file.' },
            ].map(s => (
              <div key={s.n}>
                <div className="mono" style={{ fontSize: '1.6rem', color: 'var(--green-dim)', opacity: 0.6, marginBottom: '0.5rem', fontWeight: 300 }}>{s.n}</div>
                <div style={{ fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.9rem' }}>{s.title}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}