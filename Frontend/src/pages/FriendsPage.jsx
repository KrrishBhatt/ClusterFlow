import React, { useEffect, useState, useCallback } from 'react'
import Topbar from '../components/Topbar'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { friendsService, usersService } from '../services'

function Avatar({ name, size = '' }) {
  return <div className={`avatar ${size}`}>{(name || '?')[0].toUpperCase()}</div>
}

export default function FriendsPage() {
  const { toast, success, error, info } = useToast()
  const [friends, setFriends]   = useState([])
  const [requests, setRequests] = useState([])
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const setAL = (k, v) => setActionLoading(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        friendsService.getAll(),
        friendsService.getRequests(),
      ])
      setFriends(Array.isArray(f) ? f : [])
      setRequests(Array.isArray(r) ? r : [])
    } catch { error('Failed to load friends data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchId.trim()) return
    try {
      const d = await usersService.findById(searchId.trim())
      if (d.userId) { setSearchResult(d) }
      else { setSearchResult(null); error('User not found') }
    } catch { error('User not found'); setSearchResult(null) }
  }

  async function handleSend(receiverId) {
    setAL('send_' + receiverId, true)
    try {
      const d = await friendsService.sendRequest(receiverId)
      success(d.message || 'Request sent')
      setSearchResult(null); setSearchId('')
    } catch (e) { error(e.message) }
    finally { setAL('send_' + receiverId, false) }
  }

  async function handleAccept(requestId) {
    setAL('acc_' + requestId, true)
    try {
      const d = await friendsService.accept(requestId)
      success(d.message); load()
    } catch (e) { error(e.message) }
    finally { setAL('acc_' + requestId, false) }
  }

  async function handleReject(requestId) {
    setAL('rej_' + requestId, true)
    try {
      const d = await friendsService.reject(requestId)
      info(d.message); load()
    } catch (e) { error(e.message) }
    finally { setAL('rej_' + requestId, false) }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <div className="page-content">
        <Toast toast={toast} />

        <div className="page-header">
          <h1 className="page-title">Friends<span className="page-title-accent">.</span></h1>
          <p className="page-subtitle">// manage your cluster network</p>
        </div>

        <div className="grid-2">

          {/* SEARCH & ADD */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Find and Add User</div>
            </div>
            <p className="text-muted" style={{ fontSize: '0.83rem', marginBottom: '1rem', lineHeight: 1.6 }}>
              Search by User ID — e.g. <span className="mono text-green">CF-482910</span>
            </p>
            <form onSubmit={handleSearch}>
              <div className="form-row">
                <div className="form-group">
                  <input className="form-input" type="text"
                    value={searchId}
                    onChange={e => { setSearchId(e.target.value); setSearchResult(null) }}
                    placeholder="CF-XXXXXX" />
                </div>
                <button type="submit" className="btn btn-ghost"
                  style={{ alignSelf: 'flex-end', marginBottom: '1rem' }}>
                  Search
                </button>
              </div>
            </form>

            {searchResult && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.9rem 1rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--green-border)',
                borderRadius: 'var(--radius-md)',
                marginTop: '0.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Avatar name={searchResult.username} size="avatar-sm" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{searchResult.username}</div>
                    <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>{searchResult.userId}</div>
                  </div>
                </div>
                <button
                  className="btn btn-green btn-sm"
                  onClick={() => handleSend(searchResult.userId)}
                  disabled={actionLoading['send_' + searchResult.userId]}>
                  {actionLoading['send_' + searchResult.userId] ? '...' : 'Add Friend'}
                </button>
              </div>
            )}
          </div>

          {/* INCOMING REQUESTS */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Incoming Requests</div>
              {requests.length > 0 && (
                <span className="badge badge-amber">{requests.length} pending</span>
              )}
            </div>

            {loading ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-text">Loading...</div>
              </div>
            ) : requests.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-text">No pending requests</div>
              </div>
            ) : (
              requests.map(req => (
                <div key={req._id} className="list-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Avatar name={req.sender?.username} size="avatar-sm" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{req.sender?.username}</div>
                      <div className="mono text-muted" style={{ fontSize: '0.72rem' }}>{req.sender?.userId}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-green btn-sm"
                      onClick={() => handleAccept(req._id)}
                      disabled={actionLoading['acc_' + req._id]}>
                      {actionLoading['acc_' + req._id] ? '...' : 'Accept'}
                    </button>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => handleReject(req._id)}
                      disabled={actionLoading['rej_' + req._id]}>
                      {actionLoading['rej_' + req._id] ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* FRIENDS LIST */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card-header">
            <div className="card-title">My Network</div>
            <span className="badge badge-green">{friends.length} connected</span>
          </div>

          {loading ? (
            <div className="empty-state"><div className="empty-state-text">Loading...</div></div>
          ) : friends.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">No connections yet — search for a user above</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {friends.map(f => (
                <div key={f._id || f.userId} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'var(--transition)',
                }}>
                  <Avatar name={f.username} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{f.username}</div>
                    <div className="mono text-muted" style={{ fontSize: '0.72rem' }}>{f.userId}</div>
                  </div>
                  <span className="badge badge-green">
                    <span className="status-dot green" />
                    friend
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}