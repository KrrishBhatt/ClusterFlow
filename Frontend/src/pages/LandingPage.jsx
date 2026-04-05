import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/Logo.jpeg'

const FEATURES = [
  { title: 'Distributed Processing', desc: 'Split massive datasets across your team in real time. Every node contributes, every chunk matters.' },
  { title: 'Room-Based Clusters',    desc: 'Create or join rooms, invite collaborators, and coordinate task distribution seamlessly.' },
  { title: 'Intelligent Chunking',   desc: 'Datasets are sliced, assigned, and reassembled automatically. Stale chunks are detected and re-queued.' },
  { title: 'Live Progress Tracking', desc: 'Watch processing unfold chunk by chunk. Download the unified result the moment all nodes complete.' },
]

const STEPS = [
  { n: '01', title: 'Create a Room',    desc: 'Spin up a cluster room and become the host.' },
  { n: '02', title: 'Invite Your Team', desc: 'Add friends as worker nodes to the room.' },
  { n: '03', title: 'Upload Dataset',   desc: 'Upload a CSV — it is auto-split across all members.' },
  { n: '04', title: 'Collect Results',  desc: 'Each worker processes their chunk. Download the final file.' },
]

export default function LandingPage() {
  const gridRef = useRef(null)

  useEffect(() => {
    const move = (e) => {
      if (!gridRef.current) return
      gridRef.current.style.transform =
        `translate(${(e.clientX / window.innerWidth - 0.5) * 18}px, ${(e.clientY / window.innerHeight - 0.5) * 18}px)`
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div className="lp">
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div ref={gridRef} style={{
          position: 'absolute', inset: '-10%',
          backgroundImage: 'linear-gradient(rgba(0,255,135,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,135,0.04) 1px,transparent 1px)',
          backgroundSize: '60px 60px', transition: 'transform 0.1s linear'
        }} />
        <div style={{ position: 'absolute', width: 600, height: 600, top: -200, left: -100, borderRadius: '50%', background: 'rgba(0,255,135,0.07)', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, bottom: 0, right: -100, borderRadius: '50%', background: 'rgba(255,184,48,0.05)', filter: 'blur(120px)' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '1.1rem 3rem', gap: '2rem', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginRight: 'auto' }}>
          <img src={logo} alt="ClusterFlow" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 6 }} />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--green-bright)', letterSpacing: '-0.01em' }}>ClusterFlow</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.6rem', color: 'var(--amber-bright)', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 500 }}>Together, We Compute</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {['#features', '#how'].map((href, i) => (
            <a key={href} href={href} style={{ padding: '0.4rem 0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>
              {i === 0 ? 'Features' : 'How it works'}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/login"    className="btn btn-ghost btn-sm">Login</Link>
          <Link to="/register" className="btn btn-green btn-sm">Register</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '5rem 2rem 4rem', textAlign: 'center' }}>
        {/* Logo hero */}
        <div style={{ marginBottom: '2rem' }}>
          <img src={logo} alt="ClusterFlow" style={{
            width: 160, height: 160, objectFit: 'contain',
            filter: 'drop-shadow(0 0 32px rgba(0,255,135,0.4))',
            animation: 'cf-float 4s ease-in-out infinite'
          }} />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--green-border)', borderRadius: 100, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', letterSpacing: '0.04em' }}>
          <span className="status-dot green" />
          Distributed &nbsp;·&nbsp; Real-time &nbsp;·&nbsp; Collaborative
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          Process Data<br />
          <span style={{ color: 'var(--green-bright)', textShadow: '0 0 40px rgba(0,255,135,0.3)' }}>At Cluster Scale</span>
        </h1>

        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 580, margin: '0 auto 2.5rem' }}>
          ClusterFlow distributes CSV processing across your team — automatically splitting,
          tracking, and reassembling data. No infrastructure needed. Just invite, upload, and go.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
          <Link to="/register" className="btn btn-green btn-lg">Register</Link>
          <Link to="/login"    className="btn btn-ghost btn-lg">Login</Link>
        </div>


      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--green-mid)', marginBottom: '1rem' }}>Core Features</div>
        <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '3rem', maxWidth: 560 }}>Built for teams that move fast</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', transition: 'var(--transition)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--green-border)'; e.currentTarget.style.transform='translateY(-3px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--green-dim)', opacity: 0.6, marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--green-mid)', marginBottom: '1rem' }}>How It Works</div>
        <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '3rem', maxWidth: 560 }}>Four steps to distributed power</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ paddingRight: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 300, color: 'var(--green-dim)', opacity: 0.5, marginBottom: '0.5rem' }}>{s.n}</div>
              <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, var(--green-border), transparent)', marginBottom: '1.25rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{s.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '6rem 2rem', borderTop: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 300, background: 'rgba(255,184,48,0.05)', borderRadius: '50%', filter: 'blur(80px)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <img src={logo} alt="" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: '1.5rem', opacity: 0.9, position: 'relative' }} />
        <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem', position: 'relative' }}>Ready to scale your processing?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '2.5rem', position: 'relative' }}>Join ClusterFlow and distribute your first dataset in minutes.</p>
        <Link to="/register" className="btn btn-amber btn-lg" style={{ position: 'relative' }}>Create Free Account</Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div style={{ fontWeight: 800, color: 'var(--green-bright)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={logo} alt="" style={{ width: 22, height: 22, objectFit: 'contain', opacity: 0.75 }} />
          ClusterFlow
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>© 2025 · Together, We Compute</span>
      </footer>

      <style>{`
        .lp { min-height:100vh; background:var(--bg-void); overflow-x:hidden; }
        @keyframes cf-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes cf-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}