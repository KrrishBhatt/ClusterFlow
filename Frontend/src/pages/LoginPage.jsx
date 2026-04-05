import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services'
import { setAuth } from '../utils/auth'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import logo from '../assets/logo.jpeg'

export default function LoginPage() {
  const navigate = useNavigate()
  const { toast, error } = useToast()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await authService.login(form)
      if (data.token) {
        setAuth(data.token, data.userId)
        navigate('/dashboard')
      } else {
        error(data.message || 'Login failed')
      }
    } catch (e) { error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-glow" />
      <Link to="/" className="auth-brand">
        <img src={logo} alt="ClusterFlow" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 8 }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, color: 'var(--green-bright)', fontSize: '1.05rem', letterSpacing: '-0.02em' }}>ClusterFlow</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--amber-bright)', letterSpacing: '0.04em' }}>Together, We Compute</div>
        </div>
      </Link>
      <div className="auth-card">
        <div className="auth-card-header">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Sign in to your cluster account</p>
        </div>
        <Toast toast={toast} />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" name="email"
              value={form.email} onChange={onChange} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password"
              value={form.password} onChange={onChange} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-green btn-full" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <p className="auth-footer-text">
          No account? <Link to="/register" className="auth-link">Register here</Link>
        </p>
      </div>
      <style>{`
        .auth-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;background:var(--bg-void);position:relative;overflow:hidden;}
        .auth-bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,255,135,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,135,0.03) 1px,transparent 1px);background-size:50px 50px;pointer-events:none;}
        .auth-glow{position:absolute;width:500px;height:500px;background:rgba(0,255,135,0.06);border-radius:50%;filter:blur(100px);top:-100px;left:50%;transform:translateX(-50%);pointer-events:none;}
        .auth-brand{position:relative;z-index:1;display:flex;align-items:center;gap:0.6rem;text-decoration:none;margin-bottom:2rem;}
        .auth-card{position:relative;z-index:1;width:100%;max-width:420px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-xl);padding:2.25rem;box-shadow:var(--shadow-card),0 0 40px rgba(0,255,135,0.04);}
        .auth-card-header{margin-bottom:1.75rem;}
        .auth-title{font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary);margin-bottom:0.25rem;}
        .auth-subtitle{color:var(--text-muted);font-size:0.875rem;font-family:var(--font-mono);}
        .auth-footer-text{margin-top:1.5rem;text-align:center;font-size:0.875rem;color:var(--text-muted);}
        .auth-link{color:var(--green-bright);text-decoration:none;font-weight:600;}
      `}</style>
    </div>
  )
}