import { QUESTIONS as BONANZA_QUESTIONS } from './Bonanza.jsx'
import React, { useState, useEffect } from 'react'
import { Logo } from './Logo.jsx'

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function fmtTime(ms) {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// epoch ms <-> value of an <input type="datetime-local"> (the admin's local time, i.e. IST)
function toLocalInput(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (v) => (v ? new Date(v).getTime() : null)

function windowStatus(opensAt, closesAt) {
  const now = Date.now()
  if (!opensAt && !closesAt) return { text: 'No window set: the quiz is open any time', color: 'var(--text-3)' }
  if (opensAt && now < opensAt) return { text: 'Not open yet', color: 'var(--warn)' }
  if (closesAt && now > closesAt) return { text: 'Closed', color: 'var(--fail)' }
  return { text: 'Open now', color: 'var(--ok)' }
}

function inputStyle(error) {
  return {
    width: '100%', padding: '10px 13px', background: 'var(--surface-2)',
    border: `1.5px solid ${error ? 'var(--fail-bdr)' : 'var(--border-2)'}`,
    borderRadius: 'var(--r-sm)', color: 'var(--text)', fontSize: 14.5,
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.18s',
  }
}

export default function Admin() {
  const [loggedIn, setLoggedIn]         = useState(false)
  const [password, setPassword]         = useState('')
  const [storedPw, setStoredPw]         = useState('')
  const [loginErr, setLoginErr]         = useState('')
  const [results, setResults]           = useState([])
  const [settings, setSettings]         = useState({ timer_seconds: 150 })
  const [timerMin, setTimerMin]         = useState(2)
  const [timerSec, setTimerSec]         = useState(30)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [expanded, setExpanded]         = useState(null)
  const [opensInput, setOpensInput]     = useState('')
  const [closesInput, setClosesInput]   = useState('')
  const [windowMsg, setWindowMsg]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) { setStoredPw(password); setLoggedIn(true); setLoginErr('') }
      else setLoginErr('Invalid password')
    } catch { setLoginErr('Connection failed') }
  }

  const loadResults = () =>
    fetch(`/api/admin/results?password=${storedPw}`).then((r) => r.json()).then(setResults)

  const saveWindow = async (clear = false) => {
    const body = clear
      ? { opens_at: null, closes_at: null }
      : { opens_at: fromLocalInput(opensInput), closes_at: fromLocalInput(closesInput) }
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: storedPw, ...body }),
    })
    const data = await res.json()
    if (!res.ok) { setWindowMsg(data.error || 'Could not save'); return }
    setSettings(data)
    setOpensInput(toLocalInput(data.opens_at))
    setClosesInput(toLocalInput(data.closes_at))
    setWindowMsg(clear ? '✓ Cleared' : '✓ Saved')
    setTimeout(() => setWindowMsg(''), 2500)
  }

  const restartUser = async (email) => {
    if (!window.confirm(`Delete ${email}'s attempt and answers so they can take the quiz again?`)) return
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: storedPw, email }),
    })
    if (res.ok) { setExpanded(null); loadResults() }
    else window.alert('Could not restart this user')
  }

  useEffect(() => {
    if (!loggedIn) return
    Promise.all([
      fetch(`/api/admin/results?password=${storedPw}`).then((r) => r.json()),
      fetch(`/api/admin/settings?password=${storedPw}`).then((r) => r.json()),
    ]).then(([r, s]) => {
      setResults(r)
      setSettings(s)
      setTimerMin(Math.floor(s.timer_seconds / 60))
      setTimerSec(s.timer_seconds % 60)
      setOpensInput(toLocalInput(s.opens_at))
      setClosesInput(toLocalInput(s.closes_at))
    })
  }, [loggedIn, storedPw])

  const saveTimer = async () => {
    const total = Math.max(30, timerMin * 60 + timerSec)
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: storedPw, timer_seconds: total }),
    })
    if (res.ok) {
      setSettings((prev) => ({ ...prev, timer_seconds: total }))
      setSaveFeedback('✓ Saved')
      setTimeout(() => setSaveFeedback(''), 2500)
    }
  }

  /* ── Login ── */
  if (!loggedIn) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r)', padding: '40px 36px',
          width: '100%', maxWidth: 400, border: '1px solid var(--border)',
        }}>
          <div style={{ marginBottom: 32 }}>
            <Logo size="md" />
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginBottom: 20 }}>
            Admin Panel
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 7 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginErr('') }}
                placeholder="Admin password"
                autoFocus
                style={inputStyle(loginErr)}
              />
              {loginErr && (
                <p style={{ color: 'var(--fail)', fontSize: 13, marginTop: 5 }}>{loginErr}</p>
              )}
            </div>

            <button type="submit" style={{
              width: '100%', padding: '12px', background: 'var(--gold)', color: '#0A0B0F',
              border: 'none', borderRadius: 'var(--r-sm)', fontSize: 14.5,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.3px',
            }}>
              Sign In →
            </button>
          </form>
        </div>
      </div>
    )
  }

  /* ── Main panel ── */
  return (
    <div className="admin-page">
      <div className="admin-header">
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href={`/api/admin/export?password=${storedPw}`}
            style={{
              padding: '6px 14px', background: 'var(--surface-2)', color: 'var(--text-2)',
              border: '1px solid var(--border-2)', borderRadius: 'var(--r-xs)', fontSize: 12.5,
              textDecoration: 'none', fontWeight: 500,
            }}
          >
            Export CSV ↓
          </a>
          <button
            onClick={() => { setLoggedIn(false); setStoredPw(''); setPassword('') }}
            style={{
              padding: '6px 14px', background: 'transparent', color: 'var(--text-3)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-xs)', fontSize: 12.5,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="admin-body">
        {/* ── Timer settings ── */}
        <div className="admin-card">
          <div className="admin-section-title">Quiz Timer</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {[
              { val: timerMin, set: (v) => setTimerMin(Math.max(0, v)), max: 59, label: 'min' },
              { val: timerSec, set: (v) => setTimerSec(Math.min(59, Math.max(0, v))), max: 59, label: 'sec' },
            ].map(({ val, set, label }, idx) => (
              <React.Fragment key={label}>
                {idx === 1 && <span style={{ color: 'var(--text-3)', fontSize: 20 }}>:</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={val}
                    onChange={(e) => set(parseInt(e.target.value) || 0)}
                    style={{
                      width: 66, padding: '8px 10px', background: 'var(--surface-2)',
                      border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)',
                      color: 'var(--gold)', fontSize: 20, fontWeight: 700, textAlign: 'center',
                      fontFamily: 'monospace', outline: 'none',
                    }}
                  />
                  <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{label}</span>
                </div>
              </React.Fragment>
            ))}

            <button
              onClick={saveTimer}
              style={{
                padding: '9px 20px',
                background: saveFeedback ? 'var(--ok-bg)' : 'var(--gold)',
                color: saveFeedback ? 'var(--ok)' : '#0A0B0F',
                border: saveFeedback ? '1px solid var(--ok-bdr)' : 'none',
                borderRadius: 'var(--r-sm)', fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.3s', fontFamily: 'inherit',
              }}
            >
              {saveFeedback || 'Save Timer'}
            </button>

            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
              Active: {Math.floor(settings.timer_seconds / 60)}m {settings.timer_seconds % 60}s
            </span>
          </div>
        </div>

        {/* ── Quiz window ── */}
        <div className="admin-card">
          <div className="admin-section-title">Quiz Window (IST)</div>
          <p style={{ color: 'var(--text-3)', fontSize: 12.5, margin: '0 0 12px' }}>
            People can start the quiz only between these times. Anyone who started before the end time can finish.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {[['Start', opensInput, setOpensInput], ['End', closesInput, setClosesInput]].map(([label, val, set]) => (
              <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-3)', fontSize: 13 }}>
                {label}
                <input
                  type="datetime-local"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  style={{ ...inputStyle(false), width: 'auto', colorScheme: 'dark' }}
                />
              </label>
            ))}
            <button
              onClick={() => saveWindow(false)}
              style={{
                padding: '9px 20px', background: 'var(--gold)', color: '#0A0B0F', border: 'none',
                borderRadius: 'var(--r-sm)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Save Window
            </button>
            <button
              onClick={() => saveWindow(true)}
              style={{
                padding: '9px 16px', background: 'transparent', color: 'var(--text-3)',
                border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
            {windowMsg && <span style={{ fontSize: 12.5, color: windowMsg.startsWith('✓') ? 'var(--ok)' : 'var(--fail)' }}>{windowMsg}</span>}
          </div>
          {(() => {
            const st = windowStatus(settings.opens_at, settings.closes_at)
            return (
              <div style={{ marginTop: 10, fontSize: 12.5 }}>
                <span style={{ color: st.color, fontWeight: 600 }}>{st.text}</span>
                {(settings.opens_at || settings.closes_at) && (
                  <span style={{ color: 'var(--text-3)' }}>
                    {'  ·  '}{settings.opens_at ? fmtDate(settings.opens_at) : 'any time'} → {settings.closes_at ? fmtDate(settings.closes_at) : 'no end'}
                  </span>
                )}
              </div>
            )
          })()}
        </div>

        {/* ── Results ── */}
        <div className="admin-card">
          <div className="admin-section-title">
            Submissions ({results.length})
          </div>

          {results.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>No submissions yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Time</th>
                    <th>Submitted At</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <React.Fragment key={r.id}>
                      <tr onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        <td style={{ color: 'var(--text)' }}>{r.email}</td>
                        <td>
                          <span className={`badge ${r.score / r.total >= 0.6 ? 'badge-green' : 'badge-red'}`}>
                            {r.score}/{r.total}
                          </span>
                        </td>
                        <td style={{ color: r.score / r.total >= 0.6 ? 'var(--ok)' : 'var(--fail)', fontWeight: 600 }}>
                          {Math.round((r.score / r.total) * 100)}%
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{fmtTime(r.time_taken)}</td>
                        <td style={{ fontSize: 12 }}>{fmtDate(r.completed_at)}</td>
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); restartUser(r.email) }}
                            title="Delete this attempt so the person can take the quiz again"
                            style={{
                              padding: '5px 12px', background: 'transparent', color: 'var(--warn)',
                              border: '1px solid var(--border-2)', borderRadius: 'var(--r-xs)', fontSize: 12,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            Restart
                          </button>
                        </td>
                      </tr>

                      {expanded === r.id && (
                        <tr>
                          <td colSpan={6} style={{ background: 'var(--bg)', padding: '14px 16px' }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                              gap: 7,
                            }}>
                              {r.answers.map((a) => (
                                <div
                                  key={a.questionId}
                                  style={{
                                    padding: '7px 11px',
                                    background: a.isCorrect ? 'var(--ok-bg)' : 'var(--fail-bg)',
                                    borderRadius: 6,
                                    borderLeft: `2.5px solid ${a.isCorrect ? 'var(--ok)' : 'var(--fail)'}`,
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ color: 'var(--text-3)', marginBottom: 2 }}>Q{a.questionId}</div>
                                  <div style={{ color: 'var(--text-2)', fontWeight: 500 }}>
                                    {a.selected || '—'}
                                    {!a.isCorrect && a.selected && (
                                      <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> → {a.correct}</span>
                                    )}
                                    {!a.selected && (
                                      <span style={{ color: 'var(--warn)' }}> skipped</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div style={{ color: 'var(--text-3)', fontSize: 11, letterSpacing: 1, margin: '16px 0 8px', textTransform: 'uppercase' }}>
                              Bonanza answers
                            </div>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {BONANZA_QUESTIONS.map((q) => {
                                const b = (r.bonanza || []).find((x) => x.question_no === q.no)
                                return (
                                  <div key={q.no} style={{
                                    padding: '9px 12px', background: 'var(--surface, rgba(255,255,255,0.03))', borderRadius: 6,
                                    borderLeft: '2.5px solid var(--warn)', fontSize: 13,
                                  }}>
                                    <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>B{q.no}. {q.text}</div>
                                    <div style={{ color: b?.answer ? 'var(--text)' : 'var(--warn)', whiteSpace: 'pre-wrap' }}>
                                      {b?.answer || 'No answer'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
