import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { roomsService } from '../services'
import API from '../services/api'

export default function RoomsPage() {
  const { toast, success, error, info } = useToast()
  const navigate = useNavigate()
  const pollRef  = useRef(null)

  // room creation
  const [creating, setCreating]       = useState(false)
  const [createdRoom, setCreatedRoom] = useState(null)

  // pending invites (for this user)
  const [invites, setInvites]         = useState([])
  const [invLoading, setInvLoading]   = useState(true)
  const [accepting, setAccepting]     = useState({})
  const [rejecting, setRejecting]     = useState({})

  // re-enter room
  const [reenterId, setReenterId]     = useState('')

  // load invites + poll every 8s
  const loadInvites = useCallback(async () => {
    try {
      const res  = await API.get('/rooms/invites')
      setInvites(Array.isArray(res.data?.invites) ? res.data.invites : [])
    } catch {
      setInvites([])
    } finally {
      setInvLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvites()
    pollRef.current = setInterval(loadInvites, 8000)
    return () => clearInterval(pollRef.current)
  }, [loadInvites])

  // create room
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

  // enter created room as host
  function enterRoom(roomId) {
    sessionStorage.setItem(`cf_host_${roomId}`, 'true')
    navigate(`/room/${roomId}`)
  }

  // accept invite → go to room
  async function handleAccept(inviteId, roomId) {
    setAccepting(p => ({ ...p, [inviteId]: true }))
    try {
      const d = await roomsService.acceptInvite(inviteId)
      if (d.message === 'Invite accepted') {
        success('Joined the room!')
        sessionStorage.removeItem(`cf_host_${roomId}`)
        navigate(`/room/${roomId}`)
      } else {
        error(d.message)
      }
    } catch (e) { error(e.message) }
    finally { setAccepting(p => ({ ...p, [inviteId]: false })) }
  }

  // reject invite
  async function handleReject(inviteId) {
    setRejecting(p => ({ ...p, [inviteId]: true }))
    try {
      const d = await roomsService.rejectInvite(inviteId)
      info(d.message || 'Invite rejected')
      setInvites(prev => prev.filter(i => i._id !== inviteId))
    } catch (e) { error(e.message) }
    finally { setRejecting(p => ({ ...p, [inviteId]: false })) }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <div className="page-content">
        <Toast toast={toast} />

        <div className="page-header">
          <h1 className="page-title">Rooms<span className="page-title-accent">.</span></h1>
          <p className="page-subtitle">// create a room or accept an invite</p>
        </div>

        {/* ── ROW 1: CREATE + INVITES ── */}
        <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

          {/* CREATE ROOM */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Create a Room</div>
            </div>
            <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              You become the <span className="text-amber">host</span>. Invite friends,
              upload a dataset, and let the team process it automatically.
            </p>
            <button className="btn btn-green btn-full" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create New Room'}
            </button>

            {createdRoom && (
              <div style={{ marginTop: '1.25rem', background: 'var(--green-ghost)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)', padding: '1.1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--green-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  Room Created — enter the room to invite friends
                </div>
                <div className="mono text-green" style={{ fontSize: '1.15rem', marginBottom: '0.9rem' }}>
                  {createdRoom}
                </div>
                <button className="btn btn-green btn-full" onClick={() => enterRoom(createdRoom)}>
                  Enter Room as Host
                </button>
              </div>
            )}
          </div>

          {/* PENDING INVITES */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Pending Invites
                {invites.length > 0 && (
                  <span className="badge badge-amber" style={{ marginLeft: '0.5rem' }}>
                    {invites.length}
                  </span>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={loadInvites}
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                Refresh
              </button>
            </div>

            {invLoading ? (
              <div className="text-muted" style={{ fontSize: '0.875rem' }}>Checking...</div>
            ) : invites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2rem', opacity: 0.2, marginBottom: '0.5rem' }}>✉</div>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                  No pending invites.<br />
                  Refreshes every 8 seconds.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {invites.map(inv => (
                  <div key={inv._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--amber-border,var(--border))', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {inv.sender?.username || 'Someone'} invited you
                      </div>
                      <div className="mono text-muted" style={{ fontSize: '0.75rem' }}>
                        {inv.roomId}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-green btn-sm"
                        disabled={accepting[inv._id]}
                        onClick={() => handleAccept(inv._id, inv.roomId)}>
                        {accepting[inv._id] ? '...' : 'Accept'}
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        disabled={rejecting[inv._id]}
                        onClick={() => handleReject(inv._id)}>
                        {rejecting[inv._id] ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RE-ENTER ROOM ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Already in a room?</div>
              <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                Enter the Room ID to go back in.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ width: 185 }}
                placeholder="ROOM-XXXXXX"
                value={reenterId}
                onChange={e => setReenterId(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter' && reenterId.trim()) navigate(`/room/${reenterId.trim()}`) }}
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