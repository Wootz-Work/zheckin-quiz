import { useState } from 'react'
import { Logo } from './Logo.jsx'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()

    if (!trimmed) {
      setError('Please enter your email address')
      return
    }
    if (!trimmed.toLowerCase().endsWith('@wootz.work')) {
      setError('Only @wootz.work email addresses are allowed')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      onLogin(data)
    } catch {
      setError('Could not connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Logo */}
      <div className="login-logo-wrap">
        <Logo size="xl" />
      </div>

      {/* Form card */}
      <div className="login-card animate-in" style={{ maxWidth: 420, width: '100%' }}>
        <h1 className="login-title">ZheckIn Quiz 1</h1>
        <p className="login-subtitle">
          Test your knowledge of the ZheckIn platform
        </p>

        <div className="login-badges">
          <span className="login-badge">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            2 min quiz + bonanza
          </span>
          <span className="login-badge">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 7l1.5 1.5L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            19 MCQ + 3 bonanza
          </span>
          <span className="login-badge">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 2a3 3 0 0 1 3 3v1H4V5a3 3 0 0 1 3-3z" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2" y="6" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            @wootz.work only
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Your Email</label>
            <input
              id="email"
              type="email"
              className={`form-input${error ? ' has-error' : ''}`}
              placeholder="yourname@wootz.work"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              autoFocus
              autoComplete="email"
            />
            {error
              ? <p className="form-error">⚠ {error}</p>
              : <p className="form-hint">Only @wootz.work email addresses can access this quiz</p>
            }
          </div>

          <button className="btn btn-gold" type="submit" disabled={loading}>
            {loading
              ? <><div className="spinner" style={{ borderTopColor: '#0A0B0F', borderColor: 'rgba(0,0,0,0.2)' }} /> Starting…</>
              : 'Start Quiz →'
            }
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
          Once you start, the timer cannot be paused or reset.
          <br />If you reload the page, the timer keeps running.
        </p>
      </div>
    </div>
  )
}
