import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { roomsService, tasksService, friendsService } from '../services'
import { getUserId } from '../utils/auth'

const sleep = ms => new Promise(r => setTimeout(r, ms))

function StatusBadge({ s }) {
  const cm = { pending: 'badge-gray', processing: 'badge-amber', completed: 'badge-green', failed: 'badge-red' }
  const dm = { pending: 'gray', processing: 'amber', completed: 'green', failed: 'red' }
  return (
    <span className={`badge ${cm[s] || 'badge-gray'}`}>
      <span className={`status-dot ${dm[s] || 'gray'}`} />{s}
    </span>
  )
}

// normalize + remove nulls + deduplicate
function cleanRows(rows) {
  if (!rows || !rows.length) return []
  let out = rows.map(r => {
    const c = {}
    for (const [k, v] of Object.entries(r))
      c[k] = typeof v === 'string' ? v.trim().toLowerCase() : v
    return c
  })
  out = out.filter(r =>
    Object.values(r).every(v => v !== null && v !== undefined && String(v).trim() !== '')
  )
  const seen = new Set()
  return out.filter(r => {
    const k = JSON.stringify(r)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/* ══════════════════════════════════════
   HOST VIEW
══════════════════════════════════════ */
function HostView({ roomId, members, onRefreshMembers }) {
  const { toast, success, error, info } = useToast()

  const [friends, setFriends]         = useState([])
  const [friendsLoading, setFL]       = useState(true)
  const [inviting, setInviting]       = useState({})

  const [file, setFile]               = useState(null)
  const [activeTask, setActiveTask]   = useState(null)
  const [creating, setCreating]       = useState(false)
  const [uploadErr, setUploadErr]     = useState('')
  const fileRef = useRef()

  const [taskStatus, setTaskStatus]   = useState(null)
  const [polling, setPolling]         = useState(false)
  const pollRef = useRef(null)

  const [result, setResult]           = useState(null)
  const [fetching, setFetching]       = useState(false)
  const [isDone, setIsDone]           = useState(false)
  const [reassigning, setReassigning] = useState(false)

  useEffect(() => {
    // load friends
    friendsService.getAll()
      .then(d => setFriends(Array.isArray(d) ? d : []))
      .catch(() => setFriends([]))
      .finally(() => setFL(false))

    // check if task already exists
    tasksService.getTaskByRoom(roomId)
      .then(d => {
        if (d?.taskId) {
          setActiveTask(d)
          if (d.status === 'processing') beginPoll(d.taskId)
          if (d.status === 'completed')  setIsDone(true)
        }
      })
      .catch(() => {})

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [roomId])

  // invite friend
  async function handleInvite(f) {
    setInviting(p => ({ ...p, [f._id]: true }))
    try {
      const d = await roomsService.inviteFriend(roomId, f._id)
      if (d.message === 'Invite sent') {
        success(`Invite sent to ${f.username}!`)
        setTimeout(onRefreshMembers, 4000)
      } else error(d.message)
    } catch (e) { error(e.message) }
    finally { setInviting(p => ({ ...p, [f._id]: false })) }
  }

  // upload + distribute
  async function handleUpload(e) {
    e.preventDefault()
    setUploadErr('')
    if (!file) { setUploadErr('Select a CSV file'); return }
    if (!file.name.toLowerCase().endsWith('.csv')) { setUploadErr('Only .csv files'); return }
    setCreating(true)
    try {
      const fd = new FormData()
      fd.append('roomId', roomId)
      fd.append('file', file)
      fd.append('taskType', 'passthrough')
      const d = await tasksService.createRaw(fd)
      if (d?.taskId) {
        setActiveTask(d)
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
        success(`Distributed! ${d.totalRows} rows → ${d.totalChunks} chunks`)
        beginPoll(d.taskId)
      } else {
        setUploadErr(d?.message || 'Failed — are you the host?')
      }
    } catch (e) { setUploadErr(e.message || 'Upload failed') }
    finally { setCreating(false) }
  }

  // poll task status every 4s
  async function pollOnce(tid) {
    try {
      const d = await tasksService.getStatus(tid)
      if (!d?.taskId) return
      setTaskStatus(d)
      if (d.status === 'completed') { stopPoll(); setIsDone(true); success('All done! Download the result below.') }
      if (d.status === 'failed')    { stopPoll(); error('Task failed.') }
    } catch {}
  }
  function beginPoll(tid) {
    setPolling(true)
    pollOnce(tid)
    pollRef.current = setInterval(() => pollOnce(tid), 4000)
  }
  function stopPoll() {
    setPolling(false)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  // fetch result
  async function handleFetchResult() {
    const tid = activeTask?.taskId; if (!tid) return
    setFetching(true)
    try {
      const d = await tasksService.getResult(tid)
      if (d?.data) setResult(d)
      else error(d?.message || 'Result not ready')
    } catch (e) { error(e.message) }
    finally { setFetching(false) }
  }

  async function handleReassign() {
    setReassigning(true)
    try { const d = await tasksService.reassign(); info(`Reassigned ${d.reassigned} chunk(s)`) }
    catch (e) { error(e.message) }
    finally { setReassigning(false) }
  }

  const progress  = taskStatus?.progress ?? activeTask?.progress ?? 0
  const memberSet = new Set(members.map(m => m.userId))

  return (
    <>
      <Toast toast={toast} />

      {/* DONE BANNER */}
      {isDone && (
        <div style={{ background: 'rgba(0,255,135,0.1)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--green-bright)', marginBottom: '0.2rem' }}>All chunks processed!</div>
            <div className="text-muted" style={{ fontSize: '0.82rem' }}>Dataset is ready to download.</div>
          </div>
          <button className="btn btn-green" onClick={handleFetchResult} disabled={fetching}>
            {fetching ? 'Fetching...' : 'Download Result'}
          </button>
        </div>
      )}

      {/* FRIENDS — invite grid */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div className="card-title">Invite Friends</div>
          <span className="badge badge-amber">Host only</span>
        </div>
        {friendsLoading ? (
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Loading friends...</p>
        ) : friends.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.65 }}>
            No friends yet. Go to the <strong>Friends</strong> page and add some connections first.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.55rem' }}>
            {friends.map(f => {
              const inRoom = memberSet.has(f.userId)
              return (
                <div key={f._id || f.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', border: `1px solid ${inRoom ? 'var(--green-border)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <div className="avatar avatar-sm">{(f.username || '?')[0].toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.username}</div>
                      <div className="mono text-muted" style={{ fontSize: '0.68rem' }}>{f.userId}</div>
                    </div>
                  </div>
                  {inRoom
                    ? <span className="badge badge-green" style={{ fontSize: '0.65rem', flexShrink: 0 }}>In Room</span>
                    : <button className="btn btn-amber btn-sm" style={{ flexShrink: 0 }} disabled={inviting[f._id]} onClick={() => handleInvite(f)}>
                        {inviting[f._id] ? '...' : 'Invite'}
                      </button>
                  }
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MEMBERS */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div className="card-title">Room Members</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-green">{members.length}</span>
            <button className="btn btn-ghost btn-sm" onClick={onRefreshMembers} style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>Refresh</button>
          </div>
        </div>
        {members.length === 0
          ? <p className="text-muted" style={{ fontSize: '0.875rem' }}>No members yet — invite friends above.</p>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {members.map((m, i) => (
                <div key={m._id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '100px' }}>
                  <div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: '0.62rem' }}>{(m.username || '?')[0].toUpperCase()}</div>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.username}</span>
                  <span className={`badge ${i === 0 ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: '0.65rem' }}>{i === 0 ? 'Host' : 'Member'}</span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* UPLOAD */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div className="card-title">Upload and Distribute Dataset</div>
          <span className="badge badge-gray">{members.length} chunk{members.length !== 1 ? 's' : ''}</span>
        </div>

        {activeTask ? (
          <div style={{ padding: '0.9rem 1rem', background: 'var(--green-ghost)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--green-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Active Task</div>
            <div className="mono text-green" style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>{activeTask.taskId}</div>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
              {activeTask.totalRows || '?'} rows · {activeTask.totalChunks || members.length} chunks · cleaning applied automatically
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload}>
            <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.65, marginBottom: '1rem' }}>
              Upload a CSV. It will be split into <strong style={{ color: 'var(--green-bright)' }}>{members.length} chunks</strong>.
              Each member's browser will automatically clean their chunk and submit it back.
              You can then download the merged result.
            </p>
            <div className="form-group">
              <label className="form-label">CSV File</label>
              <input
                className="form-input"
                type="file"
                accept=".csv"
                ref={fileRef}
                onChange={e => { setFile(e.target.files[0] || null); setUploadErr('') }}
              />
            </div>
            {uploadErr && (
              <div style={{ color: '#ff4444', fontSize: '0.82rem', marginBottom: '0.75rem', padding: '0.5rem 0.85rem', background: 'rgba(255,68,68,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,68,68,0.25)' }}>
                {uploadErr}
              </div>
            )}
            <button type="submit" className="btn btn-green btn-full" disabled={creating || !file}>
              {creating ? 'Uploading...' : 'Upload and Distribute to All Members'}
            </button>
          </form>
        )}
      </div>

      {/* PROGRESS */}
      {(taskStatus || activeTask) && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <div className="card-title">Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {polling && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-bright)', display: 'inline-block', animation: 'pulse-amber 1.2s infinite', boxShadow: '0 0 5px var(--green-bright)' }} />}
              <StatusBadge s={taskStatus?.status || activeTask?.status || 'processing'} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
              <span className="text-muted">Overall</span>
              <span className="mono text-green">{progress}%</span>
            </div>
            <div className="progress-wrap"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <div style={{ marginTop: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {taskStatus?.processedChunks ?? activeTask?.processedChunks ?? 0} of {taskStatus?.totalChunks ?? activeTask?.totalChunks ?? members.length} chunks done
            </div>
          </div>
          {taskStatus?.chunks?.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Chunk</th><th>Status</th><th>Retries</th></tr></thead>
                <tbody>{taskStatus.chunks.map(c => (
                  <tr key={c._id}>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>{c.chunkIndex}</td>
                    <td><StatusBadge s={c.status} /></td>
                    <td className="mono" style={{ color: c.retryCount > 0 ? 'var(--amber-bright)' : 'var(--text-muted)' }}>{c.retryCount}/{c.maxRetries}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
            {!polling && (taskStatus?.status === 'processing' || activeTask?.status === 'processing') && (
              <button className="btn btn-ghost btn-sm" onClick={() => beginPoll(activeTask?.taskId)}>Resume Tracking</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleReassign} disabled={reassigning}>
              {reassigning ? 'Scanning...' : 'Reassign Stale Chunks'}
            </button>
            {isDone && (
              <button className="btn btn-green btn-sm" onClick={handleFetchResult} disabled={fetching}>
                {fetching ? 'Fetching...' : 'Download Result'}
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
          <a href={tasksService.downloadUrl(activeTask.taskId)} className="btn btn-green" style={{ marginBottom: result.data?.length ? '1rem' : 0 }} download target="_blank" rel="noreferrer">
            Download Processed CSV
          </a>
          {result.data?.length > 0 && (() => {
            const preview = result.data.slice(0, 5)
            const cols    = Object.keys(preview[0])
            return (
              <div className="table-wrap">
                <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>Preview — first {preview.length} rows</p>
                <table className="table">
                  <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>{preview.map((row, i) => (
                    <tr key={i}>{cols.map(c => (
                      <td key={c} className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{String(row[c] ?? '')}</td>
                    ))}</tr>
                  ))}</tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════
   WORKER VIEW — auto: find task → fetch chunk → clean → submit
══════════════════════════════════════ */
function WorkerView({ roomId }) {
  const { success, error } = useToast()
  const [log, setLog]           = useState([])
  const [status, setStatus]     = useState('waiting')
  const [chunk, setChunk]       = useState(null)
  const [cleaned, setCleaned]   = useState(null)
  const [taskProgress, setTP]   = useState(null)
  const ran  = useRef(false)
  const poll = useRef(null)

  const addLog = msg => setLog(p => [...p, { t: new Date().toLocaleTimeString(), msg }])

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    go()
    return () => { if (poll.current) clearInterval(poll.current) }
  }, [])

  async function go() {
    // 1. wait for task (poll every 6s, up to 10 minutes)
    addLog('Waiting for host to upload a dataset...')
    let taskId = null
    for (let i = 0; i < 100; i++) {
      try {
        const d = await tasksService.getTaskByRoom(roomId)
        if (d?.taskId) { taskId = d.taskId; setTP(d); break }
      } catch {}
      await sleep(6000)
    }
    if (!taskId) { addLog('Timed out. Reload the page.'); setStatus('failed'); return }
    addLog(`Task found: ${taskId}`)

    // 2. fetch chunk — retry up to 10 times
    setStatus('fetching')
    addLog('Fetching your assigned chunk...')
    let chunkData = null
    for (let i = 0; i < 10; i++) {
      try {
        const d = await tasksService.getChunk(taskId)
        if (d?.chunkIndex !== undefined) { chunkData = d; break }
      } catch {}
      addLog(`Waiting for chunk assignment (${i + 1}/10)...`)
      await sleep(3000)
    }
    if (!chunkData) { addLog('No chunk assigned. All chunks may be taken.'); setStatus('failed'); return }
    setChunk(chunkData)
    addLog(`Chunk ${chunkData.chunkIndex} received — rows ${chunkData.startRow}–${chunkData.endRow} (${chunkData.rows?.length || 0} rows)`)

    // 3. clean rows
    setStatus('processing')
    addLog('Cleaning: normalize → remove nulls → deduplicate...')
    await sleep(80)
    let result
    try {
      result = cleanRows(chunkData.rows || [])
      setCleaned(result)
      addLog(`Cleaned — ${result.length} rows kept, ${(chunkData.rows?.length || 0) - result.length} removed`)
    } catch (e) { addLog('Error: ' + e.message); setStatus('failed'); return }

    // 4. submit
    setStatus('submitting')
    addLog('Submitting processed data to server...')
    try {
      const d = await tasksService.submitChunk({
        taskId,
        chunkIndex:    chunkData.chunkIndex,
        processedData: result,
        status:        'completed',
      })
      addLog(`Submitted! Overall progress: ${d.progress}%`)
      setStatus('done')
      success('Your chunk has been processed and submitted!')

      // 5. keep polling overall progress so worker can see it
      poll.current = setInterval(async () => {
        try {
          const p = await tasksService.getStatus(taskId)
          if (p?.taskId) {
            setTP(p)
            if (p.status === 'completed' || p.status === 'failed') {
              clearInterval(poll.current)
              addLog(`Task ${p.status}!`)
            }
          }
        } catch {}
      }, 5000)
    } catch (e) { addLog('Submit failed: ' + e.message); setStatus('failed'); error('Submit failed: ' + e.message) }
  }

  const progress = taskProgress?.progress ?? 0
  const statusColors = { waiting: 'var(--text-muted)', fetching: 'var(--amber-bright)', processing: 'var(--amber-bright)', submitting: 'var(--amber-bright)', done: 'var(--green-bright)', failed: '#ff4444' }
  const statusLabels = { waiting: 'Waiting for task...', fetching: 'Fetching chunk...', processing: 'Cleaning rows...', submitting: 'Submitting...', done: 'Chunk submitted!', failed: 'Failed' }

  return (
    <>
      {/* overall progress */}
      {taskProgress && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <div className="card-title">Task Progress</div>
            <StatusBadge s={taskProgress.status || 'processing'} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
            <span className="text-muted">Overall</span>
            <span className="mono text-green">{progress}%</span>
          </div>
          <div className="progress-wrap"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div style={{ marginTop: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {taskProgress.processedChunks ?? 0} of {taskProgress.totalChunks ?? '?'} chunks done
          </div>
        </div>
      )}

      {/* worker status panel */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div className="card-title">Auto Processing</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: statusColors[status], display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {status !== 'done' && status !== 'failed' && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber-bright)', display: 'inline-block', animation: 'pulse-amber 1s infinite' }} />
            )}
            {statusLabels[status]}
          </span>
        </div>

        {chunk && (
          <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '0.85rem', textAlign: 'center' }}>
            <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Your rows</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--green-bright)', fontWeight: 300 }}>
              {chunk.startRow} – {chunk.endRow}
            </div>
            <div className="text-muted mono" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
              {chunk.rows?.length || 0} input rows
              {cleaned && ` → ${cleaned.length} cleaned`}
            </div>
          </div>
        )}

        <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', maxHeight: 160, overflowY: 'auto' }}>
          {log.length === 0
            ? <span style={{ color: 'var(--text-muted)' }}>Starting...</span>
            : log.map((l, i) => (
              <div key={i} style={{ marginBottom: '0.2rem', color: i === log.length - 1 ? 'var(--green-bright)' : 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>[{l.t}]</span>{l.msg}
              </div>
            ))
          }
        </div>

        {status === 'done' && (
          <div style={{ textAlign: 'center', marginTop: '1rem', padding: '0.5rem' }}>
            <div style={{ fontSize: '2rem', color: 'var(--green-bright)', marginBottom: '0.4rem' }}>✓</div>
            <div style={{ fontWeight: 700, color: 'var(--green-bright)' }}>Your chunk submitted!</div>
            <div className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              The host will download the final result once all chunks are done.
            </div>
          </div>
        )}

        {status === 'failed' && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }}
            onClick={() => { ran.current = false; setStatus('waiting'); setLog([]); setChunk(null); setCleaned(null); go() }}>
            Retry
          </button>
        )}
      </div>
    </>
  )
}

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
export default function RoomView() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const { toast, error, info } = useToast()
  const myUserId   = getUserId()

  const [roomInfo, setRoomInfo] = useState(null)
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [leaving, setLeaving]   = useState(false)
  const [isHost, setIsHost]     = useState(false)
  const [roleKnown, setRoleKnown] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [info, mems] = await Promise.all([
        roomsService.getInfo(roomId),
        roomsService.getMembers(roomId),
      ])

      if (!info?.roomId) {
        setRoomInfo(null)
        setRoleKnown(true)
        setLoading(false)
        return
      }

      setRoomInfo(info)
      const ml = mems.members || []
      setMembers(ml)

      // determine host — check sessionStorage first (set when room was created)
      let host = sessionStorage.getItem(`cf_host_${roomId}`) === 'true'

      if (!host) {
        // backend: host is populated as {userId, username, _id}
        if (info.host?.userId && info.host.userId === myUserId) host = true
        // fallback: first member is host (backend adds host first on createRoom)
        else if (ml.length > 0 && ml[0]?.userId === myUserId) host = true
      }

      if (host) sessionStorage.setItem(`cf_host_${roomId}`, 'true')

      setIsHost(host)
      setRoleKnown(true)
    } catch {
      if (!silent) error('Could not load room')
      setRoleKnown(true)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [roomId, myUserId])

  useEffect(() => { load() }, [load])

  async function handleLeave() {
    setLeaving(true)
    try { await roomsService.leave(roomId) } catch {}
    finally {
      sessionStorage.removeItem(`cf_host_${roomId}`)
      info('Left the room')
      navigate('/rooms')
    }
  }

  if (loading) return (
    <div className="app-shell"><Topbar />
      <div className="page-content">
        <div className="empty-state" style={{ paddingTop: '6rem' }}>
          <div className="empty-state-text">Loading room...</div>
        </div>
      </div>
    </div>
  )

  if (!roomInfo) return (
    <div className="app-shell"><Topbar />
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
          {roleKnown && (
            <span className={`room-role-badge ${isHost ? 'room-role-host' : 'room-role-worker'}`}>
              {isHost ? 'Host' : 'Member'}
            </span>
          )}
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
            {isHost ? '// host — invite, upload, monitor, download' : '// member — your chunk will be processed automatically'}
          </p>
        </div>

        {!roleKnown ? (
          <div className="empty-state-text">Loading...</div>
        ) : isHost ? (
          <HostView roomId={roomId} members={members} onRefreshMembers={() => load(true)} />
        ) : (
          <WorkerView roomId={roomId} />
        )}
      </div>
    </div>
  )
}