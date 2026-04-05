import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { roomsService, tasksService, friendsService } from '../services'
import { getMongoId, getUserId } from '../utils/auth'

function StatusBadge({ s }) {
  const colorMap = { pending:'badge-gray', processing:'badge-amber', completed:'badge-green', failed:'badge-red' }
  const dotMap   = { pending:'gray', processing:'amber', completed:'green', failed:'red' }
  return (
    <span className={`badge ${colorMap[s] || 'badge-gray'}`}>
      <span className={`status-dot ${dotMap[s] || 'gray'}`} />
      {s}
    </span>
  )
}

const TASK_TYPES = [
  { value: 'remove_nulls',      label: 'Remove Null / Empty Rows',    desc: 'Drops any row where at least one column is empty or blank' },
  { value: 'remove_duplicates', label: 'Remove Duplicate Rows',       desc: 'Removes rows that are identical to another row in the chunk' },
  { value: 'normalize',         label: 'Normalize Text',              desc: 'Trims whitespace and lowercases all text fields in every row' },
  { value: 'passthrough',       label: 'No Processing (passthrough)', desc: 'Rows returned exactly as received — useful for testing' },
]

// ─── actual processing — runs in the worker's browser ────────────────────────
function processRows(rows, taskType) {
  if (!rows || rows.length === 0) return []

  switch (taskType) {

    case 'remove_nulls':
      return rows.filter(row =>
        Object.values(row).every(val =>
          val !== null && val !== undefined && String(val).trim() !== ''
        )
      )

    case 'remove_duplicates': {
      const seen = new Set()
      return rows.filter(row => {
        const key = JSON.stringify(row)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    case 'normalize':
      return rows.map(row => {
        const cleaned = {}
        for (const [key, val] of Object.entries(row)) {
          cleaned[key] = typeof val === 'string' ? val.trim().toLowerCase() : val
        }
        return cleaned
      })

    default:
      return rows
  }
}

// ─── HOST VIEW ────────────────────────────────────────────────────────────────
function HostView({ roomId, members }) {
  const { toast, success, error, info } = useToast()

  const [friends, setFriends]     = useState([])
  const [selFriend, setSelFriend] = useState('')
  const [inviting, setInviting]   = useState(false)

  const [file, setFile]           = useState(null)
  const [taskType, setTaskType]   = useState('remove_nulls')
  const [taskInfo, setTaskInfo]   = useState(null)
  const [creating, setCreating]   = useState(false)
  const fileRef = useRef()

  const [taskStatus, setTaskStatus] = useState(null)
  const [polling, setPolling]       = useState(false)
  const pollRef = useRef(null)

  const [reassigning, setReassigning] = useState(false)
  const [result, setResult]           = useState(null)
  const [fetching, setFetching]       = useState(false)

  useEffect(() => {
    friendsService.getAll()
      .then(d => setFriends(Array.isArray(d) ? d : []))
      .catch(() => {})
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleInvite(e) {
    e.preventDefault()
    if (!selFriend) return
    setInviting(true)
    try {
      const d = await roomsService.inviteFriend(roomId, selFriend)
      d.message === 'Invite sent' ? success('Invite sent!') : error(d.message)
      setSelFriend('')
    } catch (e) { error(e.message) }
    finally { setInviting(false) }
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    if (!file) return
    setCreating(true)
    try {
      const d = await tasksService.create(roomId, file, taskType)
      if (d.taskId) {
        setTaskInfo(d)
        success(`Task created — ${d.totalRows} rows split into ${d.totalChunks} chunks`)
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        beginPolling(d.taskId)
      } else {
        error(d.message || 'Failed to create task')
      }
    } catch (e) { error(e.message) }
    finally { setCreating(false) }
  }

  async function fetchStatus(taskId) {
    try {
      const d = await tasksService.getStatus(taskId)
      if (d.taskId) {
        setTaskStatus(d)
        if (d.status === 'completed') { stopPolling(); success('All chunks done! Result is ready.') }
        if (d.status === 'failed')    { stopPolling(); error('Task failed.') }
      }
    } catch {}
  }

  function beginPolling(taskId) {
    setPolling(true)
    fetchStatus(taskId)
    pollRef.current = setInterval(() => fetchStatus(taskId), 5000)
  }

  function stopPolling() {
    setPolling(false)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function handleReassign() {
    setReassigning(true)
    try {
      const d = await tasksService.reassign()
      info(`Reassigned ${d.reassigned} stale chunk(s)`)
    } catch (e) { error(e.message) }
    finally { setReassigning(false) }
  }

  async function handleFetchResult() {
    if (!taskInfo?.taskId) return
    setFetching(true)
    try {
      const d = await tasksService.getResult(taskInfo.taskId)
      if (d.data) setResult(d)
      else error(d.message || 'Result not ready yet')
    } catch (e) { error(e.message) }
    finally { setFetching(false) }
  }

  const progress   = taskStatus?.progress || 0
  const isComplete = taskStatus?.status === 'completed'
  const selType    = TASK_TYPES.find(t => t.value === taskType)
  const resultType = TASK_TYPES.find(t => t.value === (result?.taskType || taskInfo?.taskType))

  return (
    <>
      <Toast toast={toast} />

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

        {/* INVITE */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Invite Friends</div>
          </div>
          {friends.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.65 }}>
              No friends yet. Go to the Friends page to add connections first.
            </p>
          ) : (
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">Select friend to invite</label>
                <select className="form-input" value={selFriend}
                  onChange={e => setSelFriend(e.target.value)} required style={{ cursor: 'pointer' }}>
                  <option value="">Choose a friend...</option>
                  {friends.map(f => (
                    <option key={f._id} value={f._id}>{f.username} — {f.userId}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-amber btn-full" disabled={inviting || !selFriend}>
                {inviting ? 'Sending...' : 'Send Room Invite'}
              </button>
            </form>
          )}
        </div>

        {/* MEMBERS */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Members</div>
            <span className="badge badge-green">{members.length} connected</span>
          </div>
          {members.length === 0
            ? <p className="text-muted" style={{ fontSize: '0.875rem' }}>No members yet — invite friends above.</p>
            : members.map((m, i) => (
              <div key={m._id || i} className="member-row">
                <div className="avatar avatar-sm">{(m.username || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.username}</div>
                  <div className="mono text-muted" style={{ fontSize: '0.72rem' }}>{m.userId}</div>
                </div>
                {i === 0 && <span className="badge badge-amber">Host</span>}
              </div>
            ))}
        </div>

      </div>

      {/* UPLOAD */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div className="card-title">Upload and Distribute Dataset</div>
          <span className="badge badge-gray">{members.length} chunk{members.length !== 1 ? 's' : ''} will be created</span>
        </div>

        {taskInfo ? (
          <div style={{ padding: '1rem', background: 'var(--green-ghost)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)' }}>
            <div className="mono text-green" style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>{taskInfo.taskId}</div>
            <div className="text-muted" style={{ fontSize: '0.82rem' }}>
              {taskInfo.totalRows} rows &nbsp;·&nbsp; {taskInfo.totalChunks} chunks &nbsp;·&nbsp;
              <span className="text-amber">{TASK_TYPES.find(t => t.value === taskInfo.taskType)?.label || taskInfo.taskType}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateTask}>
            <div className="form-group">
              <label className="form-label">Processing Operation</label>
              <select className="form-input" value={taskType}
                onChange={e => setTaskType(e.target.value)} style={{ cursor: 'pointer' }}>
                {TASK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {selType && (
                <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                  {selType.desc}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Dataset — CSV only</label>
              <input className="form-input" type="file" accept=".csv"
                ref={fileRef} onChange={e => setFile(e.target.files[0])} required />
            </div>
            <button type="submit" className="btn btn-green btn-full" disabled={creating || !file}>
              {creating ? 'Uploading and splitting...' : 'Upload and Distribute'}
            </button>
          </form>
        )}
      </div>

      {/* PROGRESS */}
      {taskStatus && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <div className="card-title">Processing Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {polling && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--green-bright)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-bright)', display: 'inline-block', boxShadow: '0 0 6px var(--green-bright)', animation: 'pulse-amber 1.2s infinite' }} />
                  live
                </span>
              )}
              <StatusBadge s={taskStatus.status} />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
              <span className="text-muted">Overall progress</span>
              <span className="mono text-green">{progress}%</span>
            </div>
            <div className="progress-wrap">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ marginTop: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {taskStatus.processedChunks} of {taskStatus.totalChunks} chunks processed
            </div>
          </div>

          {taskStatus.chunks?.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Chunk</th><th>Assigned To</th><th>Status</th><th>Retries</th></tr>
                </thead>
                <tbody>
                  {taskStatus.chunks.map(c => (
                    <tr key={c._id}>
                      <td className="mono" style={{ color: 'var(--text-secondary)' }}>{c.chunkIndex}</td>
                      <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.assignedTo || <span style={{ opacity: 0.4 }}>unassigned</span>}
                      </td>
                      <td><StatusBadge s={c.status} /></td>
                      <td className="mono" style={{ color: c.retryCount > 0 ? 'var(--amber-bright)' : 'var(--text-muted)' }}>
                        {c.retryCount}/{c.maxRetries}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleReassign} disabled={reassigning}>
              {reassigning ? 'Scanning...' : 'Reassign Stale Chunks'}
            </button>
            {!polling && taskStatus.status === 'processing' && (
              <button className="btn btn-ghost btn-sm" onClick={() => beginPolling(taskInfo?.taskId)}>
                Resume Live Tracking
              </button>
            )}
            {isComplete && (
              <button className="btn btn-green btn-sm" onClick={handleFetchResult} disabled={fetching}>
                {fetching ? 'Fetching...' : 'Fetch and Download Result'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {result && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <div className="card-title">Result Ready</div>
            <span className="badge badge-green">{result.totalRows} rows</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <a href={tasksService.downloadUrl(taskInfo.taskId)} className="btn btn-green" download target="_blank" rel="noreferrer">
              Download Processed CSV
            </a>
            <span className="text-muted mono" style={{ fontSize: '0.78rem' }}>
              {result.totalRows} rows &nbsp;·&nbsp; {resultType?.label}
            </span>
          </div>
          {result.data?.length > 0 && (() => {
            const preview = result.data.slice(0, 5)
            const cols    = Object.keys(preview[0])
            return (
              <div className="table-wrap">
                <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.4rem' }}>Preview — first {preview.length} rows</p>
                <table className="table">
                  <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>{cols.map(c => (
                        <td key={c} className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {String(row[c] ?? '')}
                        </td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}
    </>
  )
}

// ─── WORKER VIEW ──────────────────────────────────────────────────────────────
function WorkerView({ roomId }) {
  const { toast, success, error, info } = useToast()

  const [taskId, setTaskId]           = useState(null)
  const [taskLoading, setTaskLoading] = useState(true)
  const [chunk, setChunk]             = useState(null)
  const [fetching, setFetching]       = useState(false)
  const [processing, setProcessing]   = useState(false)
  const [processed, setProcessed]     = useState(null)
  const [submitted, setSubmitted]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => {
    tasksService.getTaskByRoom(roomId)
      .then(d => { if (d.taskId) setTaskId(d.taskId) })
      .catch(() => {})
      .finally(() => setTaskLoading(false))
  }, [roomId])

  async function handleGetChunk() {
    if (!taskId) return error('No active task yet. Wait for the host to upload a dataset.')
    setFetching(true)
    setProcessed(null)
    try {
      const d = await tasksService.getChunk(taskId)
      if (d.chunkIndex !== undefined) {
        setChunk(d)
        info(`Chunk ${d.chunkIndex} assigned — ${d.rows?.length || 0} rows received`)
      } else {
        error(d.message || 'No chunk available right now')
      }
    } catch (e) { error(e.message) }
    finally { setFetching(false) }
  }

  function handleProcess() {
    if (!chunk?.rows) return
    setProcessing(true)
    try {
      const result  = processRows(chunk.rows, chunk.taskType || 'passthrough')
      const removed = chunk.rows.length - result.length
      setProcessed(result)
      success(`Done — ${result.length} rows kept, ${removed} removed`)
    } catch (e) {
      error('Processing failed: ' + e.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleSubmit() {
    if (!processed) return
    setSubmitting(true)
    try {
      const d = await tasksService.submitChunk({
        taskId,
        chunkIndex:    chunk.chunkIndex,
        processedData: processed,
        status:        'completed'
      })
      success(`Submitted — overall progress: ${d.progress}%`)
      setSubmitted(true)
    } catch (e) { error(e.message) }
    finally { setSubmitting(false) }
  }

  async function handleFail() {
    setSubmitting(true)
    try {
      await tasksService.submitChunk({ taskId, chunkIndex: chunk.chunkIndex, processedData: [], status: 'failed' })
      info('Marked as failed — will be reassigned')
      setChunk(null)
      setProcessed(null)
    } catch (e) { error(e.message) }
    finally { setSubmitting(false) }
  }

  const selType = TASK_TYPES.find(t => t.value === chunk?.taskType)

  if (taskLoading) return (
    <div className="card" style={{ maxWidth: 640, textAlign: 'center', padding: '2.5rem' }}>
      <div className="empty-state-text">Checking for active task...</div>
    </div>
  )

  return (
    <>
      <Toast toast={toast} />
      <div className="card" style={{ marginBottom: '1.25rem', maxWidth: 680 }}>
        <div className="card-header">
          <div className="card-title">Your Assigned Chunk</div>
          {taskId
            ? <span className="badge badge-green mono" style={{ fontSize: '0.7rem' }}>{taskId}</span>
            : <span className="badge badge-gray">No active task</span>}
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ fontSize: '3rem', color: 'var(--green-bright)', marginBottom: '0.75rem' }}>&#10003;</div>
            <div style={{ fontWeight: 700, color: 'var(--green-bright)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Chunk submitted successfully
            </div>
            <div className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              Your processed data has been sent back to the host.
              Waiting for other workers to complete...
            </div>
          </div>

        ) : chunk ? (
          <>
            {/* Chunk info */}
            <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', marginBottom: '1.25rem' }}>
              <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Your assigned rows</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--green-bright)', fontWeight: 300 }}>
                {chunk.startRow} – {chunk.endRow}
              </div>
              <div className="text-muted mono" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Chunk {chunk.chunkIndex} &nbsp;·&nbsp; {chunk.rows?.length || 0} rows &nbsp;·&nbsp; {chunk.datasetName}
              </div>
            </div>

            {/* Operation */}
            <div style={{ background: 'rgba(255,184,48,0.07)', border: '1px solid var(--amber-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber-bright)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Operation</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selType?.label || chunk.taskType}</div>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>{selType?.desc}</div>
            </div>

            {!processed ? (
              <>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.65 }}>
                  You have <strong style={{ color: 'var(--green-bright)' }}>{chunk.rows?.length || 0} rows</strong> ready.
                  Click Process to run <strong className="text-amber">{selType?.label}</strong> on your chunk locally in your browser.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-green" onClick={handleProcess} disabled={processing}>
                    {processing ? 'Processing...' : 'Process My Chunk'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleFail} disabled={submitting}>
                    Mark as Failed
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem', padding: '0.85rem', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', fontWeight: 300 }}>{chunk.rows?.length}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Input</div>
                  </div>
                  <div style={{ color: 'var(--green-dim)', fontSize: '1.2rem' }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ fontSize: '1.4rem', color: 'var(--green-bright)', fontWeight: 300 }}>{processed.length}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Output</div>
                  </div>
                  <div style={{ color: 'var(--amber-bright)', fontSize: '0.85rem', fontWeight: 600 }}>
                    {chunk.rows.length - processed.length} rows removed
                  </div>
                </div>

                {/* Preview */}
                {processed.length > 0 && (() => {
                  const preview = processed.slice(0, 3)
                  const cols    = Object.keys(preview[0])
                  return (
                    <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                      <p className="text-muted" style={{ fontSize: '0.72rem', marginBottom: '0.3rem' }}>Preview — first {preview.length} processed rows</p>
                      <table className="table">
                        <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                        <tbody>
                          {preview.map((row, i) => (
                            <tr key={i}>{cols.map(c => (
                              <td key={c} className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {String(row[c] ?? '')}
                              </td>
                            ))}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-green" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : `Submit ${processed.length} Processed Rows`}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setProcessed(null)}>
                    Re-process
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleFail} disabled={submitting}>
                    Mark as Failed
                  </button>
                </div>
              </>
            )}
          </>

        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 420, margin: '0 auto 1.5rem', lineHeight: 1.65 }}>
              {taskId
                ? 'A dataset has been distributed. Click below to receive your assigned rows.'
                : 'Waiting for the host to upload and distribute a dataset. Stand by.'}
            </div>
            <button className="btn btn-green" onClick={handleGetChunk} disabled={fetching || !taskId}>
              {fetching ? 'Fetching...' : taskId ? 'Fetch My Chunk' : 'Waiting for task...'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function RoomView() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const { toast, error, info } = useToast()

  const myMongoId = getMongoId()

  const [roomInfo, setRoomInfo] = useState(null)
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [leaving, setLeaving]   = useState(false)
  const [isHost, setIsHost]     = useState(false)

  const load = useCallback(async () => {
    try {
      const [info, mems] = await Promise.all([
        roomsService.getInfo(roomId),
        roomsService.getMembers(roomId),
      ])
      if (!info.roomId) { setRoomInfo(null); setLoading(false); return }
      setRoomInfo(info)
      const memberList = mems.members || []
      setMembers(memberList)
      const hostId = info.host?._id ? String(info.host._id) : String(info.host || '')
      setIsHost(!!hostId && !!myMongoId && hostId === myMongoId)
    } catch {
      error('Could not load room')
    } finally {
      setLoading(false)
    }
  }, [roomId, myMongoId])

  useEffect(() => { load() }, [load])

  async function handleLeave() {
    setLeaving(true)
    try { await roomsService.leave(roomId) } catch {}
    finally { info('Left the room'); navigate('/rooms') }
  }

  if (loading) return (
    <div className="app-shell">
      <Topbar />
      <div className="page-content">
        <div className="empty-state" style={{ paddingTop: '6rem' }}>
          <div className="empty-state-text">Loading room...</div>
        </div>
      </div>
    </div>
  )

  if (!roomInfo) return (
    <div className="app-shell">
      <Topbar />
      <div className="page-content">
        <div className="empty-state" style={{ paddingTop: '6rem' }}>
          <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem' }}>&#9632;</div>
          <div className="empty-state-text" style={{ marginBottom: '1rem' }}>Room not found or you are not a member</div>
          <button className="btn btn-ghost" onClick={() => navigate('/rooms')}>Back to Rooms</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <Topbar />

      <div className="room-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/rooms')} className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.65rem' }}>
            &#8592; Rooms
          </button>
          <span className="room-id-badge">{roomId}</span>
          <span className={`room-role-badge ${isHost ? 'room-role-host' : 'room-role-worker'}`}>
            {isHost ? 'Host' : 'Worker'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className="status-dot green" />
          <span className="text-muted" style={{ fontSize: '0.78rem' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleLeave} disabled={leaving}>
            {leaving ? 'Leaving...' : 'Leave Room'}
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">
            {isHost ? 'Your Room' : 'Joined Room'}
            <span className="page-title-accent">.</span>
          </h1>
          <p className="page-subtitle">
            {isHost
              ? '// you are the host — invite, distribute, monitor'
              : '// you are a worker — fetch, process, submit'}
          </p>
        </div>

        {isHost
          ? <HostView roomId={roomId} members={members} />
          : <WorkerView roomId={roomId} />
        }
      </div>
    </div>
  )
}