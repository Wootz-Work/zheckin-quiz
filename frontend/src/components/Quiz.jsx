import { useState, useEffect, useCallback, useRef } from 'react'
import { Logo } from './Logo.jsx'

function formatTime(sec) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Save a single answer to the backend for progressive persistence
async function saveAnswer(sessionId, questionId, selected) {
  try {
    await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, questionId, selected }),
    })
  } catch {}
}

export default function Quiz({ session, onComplete }) {
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem('quiz_answers')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const [timeLeft, setTimeLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000)
    return Math.max(0, session.timerSeconds - elapsed)
  })
  const [submitting, setSubmitting] = useState(false)
  const submitCalledRef = useRef(false)

  useEffect(() => {
    fetch('/api/questions')
      .then((r) => r.json())
      .then(setQuestions)
      .catch(() => {})
  }, [])

  const submit = useCallback(async (timeTakenMs) => {
    if (submitCalledRef.current) return
    submitCalledRef.current = true
    setSubmitting(true)

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          answers,
          timeTaken: timeTakenMs,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        localStorage.removeItem('quiz_answers')
        onComplete(data)
      } else {
        if (data.error === 'Quiz already submitted') onComplete(null)
        else {
          submitCalledRef.current = false
          setSubmitting(false)
        }
      }
    } catch {
      submitCalledRef.current = false
      setSubmitting(false)
    }
  }, [answers, session, onComplete])

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) { submit(session.timerSeconds * 1000); return }
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(id); submit(session.timerSeconds * 1000); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line

  useEffect(() => {
    try { localStorage.setItem('quiz_answers', JSON.stringify(answers)) } catch {}
  }, [answers])

  const selectOption = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const setBonusText = (questionId, text) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }))
  }

  const goNext = () => {
    const q = questions[current]
    // Auto-save current answer to backend before moving on
    if (answers[q.id]) {
      saveAnswer(session.sessionId, q.id, answers[q.id])
    }
    setCurrent((c) => Math.min(questions.length - 1, c + 1))
  }

  const goPrev = () => {
    setCurrent((c) => Math.max(0, c - 1))
  }

  if (questions.length === 0 || submitting) {
    return (
      <div className="quiz-page" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
            {submitting ? 'Submitting your answers…' : 'Loading questions…'}
          </p>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const isBonus = q.bonus === true
  const answered = Object.keys(answers).filter((k) => answers[k]).length
  const timerClass = timeLeft <= 30 ? 'timer danger' : timeLeft <= 60 ? 'timer warning' : 'timer'

  const handleManualSubmit = () => {
    // Save current question's answer before submitting
    if (answers[q.id]) saveAnswer(session.sessionId, q.id, answers[q.id])
    const elapsed = (session.timerSeconds - timeLeft) * 1000
    submit(elapsed)
  }

  return (
    <div className="quiz-page">
      {/* ── Header ── */}
      <div className="header">
        <Logo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.3px' }}>
            {answered}/{questions.length} answered
          </span>
          <div className={timerClass}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="quiz-body">
        {/* ── Progress ── */}
        <div className="progress-wrap">
          <div className="progress-info">
            <span>Question {current + 1} of {questions.length}</span>
            <span style={{ color: answered === questions.length ? 'var(--ok)' : undefined }}>
              {answered === questions.length ? '✓ All answered' : `${questions.length - answered} remaining`}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        {/* ── Question card ── */}
        <div className="question-card animate-in" key={q.id}>
          {isBonus ? (
            /* ── Bonus question ── */
            <>
              <div style={{
                background: 'var(--gold-bg)',
                border: '1px solid var(--gold-bdr)',
                borderRadius: 'var(--r-sm)',
                padding: '10px 14px',
                marginBottom: 18,
                fontSize: 13,
                color: 'var(--gold)',
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}>
                🎉 BONUS QUESTION — Any answer earns you a point!
              </div>
              <div className="question-text" style={{ whiteSpace: 'pre-line' }}>{q.text}</div>
              <textarea
                rows={4}
                value={answers[q.id] || ''}
                onChange={(e) => setBonusText(q.id, e.target.value)}
                placeholder="Type your answer here…"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--surface-2)',
                  border: `1.5px solid ${answers[q.id] ? 'var(--gold-bdr)' : 'var(--border-2)'}`,
                  borderRadius: 'var(--r-sm)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  transition: 'border-color 0.18s',
                }}
              />
            </>
          ) : (
            /* ── Regular MCQ ── */
            <>
              <div className="question-number">Question {q.id} of {questions.length}</div>
              <div className="question-text">{q.text}</div>
              <div className="options-grid">
                {Object.entries(q.options).map(([key, text]) => (
                  <button
                    key={key}
                    className={`option${answers[q.id] === key ? ' selected' : ''}`}
                    onClick={() => selectOption(q.id, key)}
                  >
                    <div className="option-label">{key}</div>
                    <div style={{ flex: 1 }}>{text}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="quiz-nav">
          <button className="btn btn-ghost" onClick={goPrev} disabled={current === 0}>
            ← Prev
          </button>

          <button className="btn btn-danger" onClick={handleManualSubmit}>
            Submit Quiz
          </button>

          {current < questions.length - 1 ? (
            <button
              className="btn btn-ghost"
              onClick={goNext}
              style={{ borderColor: 'var(--gold-bdr)', color: 'var(--gold)' }}
            >
              Next →
            </button>
          ) : (
            <div style={{ width: 80 }} />
          )}
        </div>

        {/* ── Question dots ── */}
        <div className="question-dots">
          {questions.map((qItem, i) => (
            <button
              key={i}
              className={`dot${i === current ? ' current' : ''}${answers[qItem.id] ? ' answered' : ''}`}
              onClick={() => {
                // Save current answer before jumping
                if (answers[q.id]) saveAnswer(session.sessionId, q.id, answers[q.id])
                setCurrent(i)
              }}
              title={`Q${i + 1}${answers[qItem.id] ? ' — answered' : ''}${qItem.bonus ? ' (bonus)' : ''}`}
            >
              {qItem.bonus ? '★' : i + 1}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-3)', marginTop: 6, letterSpacing: '0.3px' }}>
          Gold = answered · Click any dot to jump · Answers auto-save as you go
        </p>
      </div>
    </div>
  )
}
