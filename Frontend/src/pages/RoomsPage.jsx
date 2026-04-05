import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { roomsService } from '../services'
import API from '../services/api'

export default function RoomsPage() {
  const { toast, success, error, info } = useToast()
  const navigate = useNavigate()

  const [creating, setCreating]       = useState(false)
  const [createdRoom, setCreatedRoom] = useState(null)

  const [invites, setInvites]         = useState([])
  const [invLoading, setInvLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const setAL = (k, v) => setActionLoading(p => ({ ...p, [k]: v }))

  const [reenterId, setReenterId] = useState('')

  const loadInvites = useCallback(async () => {
    setInvLoading(true)
    try {
      // Backend has getInvites() defined but NOT registered as a route — will 404
      // We attempt it silently; if it ever gets fixed on the backend it will work automatically
      const res = await API.get('/rooms/invites')
      const list = res.data?.invites
      setInvites(Array.isArray(list) ? list : [])
    } catch {
      setInvites([])
    } finally {
      setInvLoading(false)
    }
  }, [])

  useEffect(() => { loadInvites() }, [loadInvites])

  async function handleCreate() {
    setCreating(true)
    setCreatedRoom(null)
    try {
      const d = await roomsService.create()
      if (d.roomId) {
        setCreatedRoom(d.roomId)
        success(`Room created — ${d.roomId}`)
      } else {
        error(d.message || 'Could not create room')
      }
    } catch (e) { error(e.message) }
    finally { setCreating(false) }
  }

  async function handleAccept(inviteId, roomId) {
    setAL('a_' + inviteId, true)
    try {
      const d = await roomsService.acceptInvite(inviteId)
      if (d.message === 'Invite accepted') {
        success('Joined the room!')
        navigate(`/room/${roomId}`)
      } else {
        error(d.message)
      }
    } catch (e) { error(e.message) }
    finally { setAL('a_' + inviteId, false) }
  }

  async function handleReject(inviteId) {
    setAL('r_' + inviteId, true)
    try {
      const d = await roomsService.rejectInvite(inviteId)
      info(d.message || 'Invite rejected')
      setInvites(prev => prev.filter(i => i._id !== inviteId))
    } catch (e) { error(e.message) }
    finally { setAL('r_' + inviteId, false) }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <div className="page-content">
        <Toast toast={toast} />

        <div className="page-header">
          <h1 className="page-title">Rooms<span className="page-title-accent">.</span></h1>
          <p className="page-subtitle">// create a cluster or respond to room invites</p>
        </div>

        <div className="grid-2">

          {/* CREATE ROOM */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Create a Room</div>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Start a new cluster room. You become the <span className="text-amber">host</span> — invite friends,
              upload a dataset, distribute processing chunks, and monitor progress.
            </p>
            <button className="btn btn-green btn-full" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create New Room'}
            </button>

            {createdRoom && (
              <div style={{
                marginTop: '1.25rem',
                background: 'var(--green-ghost)',
                border: '1px solid var(--green-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--green-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  Room Created — share this ID with friends
                </div>
                <div className="mono text-green" style={{ fontSize: '1.15rem', marginBottom: '0.9rem' }}>
                  {createdRoom}
                </div>
                <button className="btn btn-green btn-full" onClick={() => navigate(`/room/${createdRoom}`)}>
                  Enter Room
                </button>
              </div>
            )}
          </div>

          {/* ROOM INVITES */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Room Invites</div>
              {invites.length > 0 && <span className="badge badge-amber">{invites.length} pending</span>}
            </div>

            {invLoading ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-text">Checking invites...</div>
              </div>
            ) : invites.length > 0 ? (
              <>
                {invites.map(inv => (
                  <div key={inv._id} className="invite-card">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                        {inv.sender?.username || 'Unknown'} invited you
                      </div>
                      <div className="mono text-muted" style={{ fontSize: '0.78rem' }}>Room: {inv.roomId}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-green btn-sm"
                        disabled={actionLoading['a_' + inv._id]}
                        onClick={() => handleAccept(inv._id, inv.roomId)}>
                        {actionLoading['a_' + inv._id] ? '...' : 'Accept'}
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        disabled={actionLoading['r_' + inv._id]}
                        onClick={() => handleReject(inv._id)}>
                        {actionLoading['r_' + inv._id] ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ padding: '2rem 0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.25 }}>&#128235;</div>
                <div className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.65 }}>
                  No pending invites right now.<br />
                  Ask a room host to invite you — they send it from inside their room.
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RE-ENTER ROOM */}
        <div className="card" style={{ marginTop: '1.25rem', borderColor: 'var(--border-bright)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Already in a room?</div>
              <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                If you previously joined a room, enter the Room ID to go back in.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ width: 200 }}
                placeholder="ROOM-XXXXXX"
                value={reenterId}
                onChange={e => setReenterId(e.target.value)}
              />
              <button
                className="btn btn-ghost"
                onClick={() => { if (reenterId.trim()) navigate(`/room/${reenterId.trim()}`) }}>
                Enter
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}