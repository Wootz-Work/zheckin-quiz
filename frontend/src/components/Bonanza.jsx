import { useState, useEffect, useRef } from 'react'
import { Logo } from './Logo.jsx'

const BONANZA_TIMER = 300 // 5 minutes per question

const QUESTIONS = [
  {
    no: 1,
    text: 'How do you use the Draft check-in functionality in your day-to-day work?',
    placeholder: 'Tell us how you use drafts — when do you save a check-in as a draft, and how does it help you?',
  },
  {
    no: 2,
    text: 'What is the one cool feature in ZheckIn that you love the most and use the most?',
    placeholder: 'Share the feature you rely on the most and why it makes a difference for you…',
  },
  {
    no: 3,
    text: 'Are you using the Tasks functionality? If yes, where and how are you using it?',
    placeholder: 'Tell us if you use Tasks — and if so, what kinds of tasks you create and how you manage them…',
  },
]

function formatTime(sec) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

async function saveBonanza(sessionId, questionNo, answer) {
  try {
    await fetch('/api/bonanza', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, questionNo, answer }),
    })
  } catch {}
}

export default function Bonanza({ session, onComplete }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState(['', '', ''])
  const [timeLeft, setTimeLeft] = useState(BONANZA_TIMER)
  const timerRef = useRef(null)
  const savedRef = useRef([false, false, false])

  const q = QUESTIONS[current]
  const isLast = current === QUESTIONS.length - 1

  // Reset timer whenever question changes
  useEffect(() => {
    setTimeLeft(BONANZA_TIMER)
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleNext(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [current]) // eslint-disable-line

  const handleNext = (fromTimer = false) => {
    clearInterval(timerRef.current)
    const answer = answers[current]
    // Save to backend
    saveBonanza(session.sessionId, QUESTIONS[current].no, answer)
    savedRef.current[current] = true

    if (isLast || fromTimer && isLast) {
      onComplete()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  const pct = Math.round(((BONANZA_TIMER - timeLeft) / BONANZA_TIMER) * 100)
  const timerClass = timeLeft <= 60 ? 'timer danger' : timeLeft <= 120 ? 'timer warning' : 'timer'

  return (
    <div className="quiz-page">
      {/* Header */}
      <div className="header">
        <Logo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1px',
            textTransform: 'uppercase', color: 'var(--gold)',
            background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)',
            padding: '3px 10px', borderRadius: 20,
          }}>
            Bonanza {current + 1} of {QUESTIONS.length}
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
        {/* Progress */}
        <div className="progress-wrap">
          <div className="progress-info">
            <span>Bonanza Question {current + 1} of {QUESTIONS.length}</span>
            <span style={{ color: 'var(--gold)' }}>Open-ended · No wrong answers</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Question card */}
        <div className="question-card animate-in" key={current}>
          {/* Bonanza badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)',
            borderRadius: 20, padding: '4px 12px', marginBottom: 16,
            fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.5px',
          }}>
            🌟 BONANZA — Take your time, any answer earns points
          </div>

          <div className="question-text">{q.text}</div>

          <textarea
            rows={6}
            value={answers[current]}
            onChange={(e) => {
              const val = e.target.value
              setAnswers((prev) => {
                const next = [...prev]
                next[current] = val
                return next
              })
            }}
            placeholder={q.placeholder}
            autoFocus
            style={{
              width: '100%',
              padding: '13px 15px',
              background: 'var(--surface-2)',
              border: `1.5px solid ${answers[current] ? 'var(--gold-bdr)' : 'var(--border-2)'}`,
              borderRadius: 'var(--r-sm)',
              color: 'var(--text)',
              fontSize: 14.5,
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
              lineHeight: 1.7,
              transition: 'border-color 0.18s',
              marginTop: 4,
            }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            Timer auto-advances when time is up — your answer is saved either way.
          </p>
        </div>

        {/* Nav */}
        <div className="quiz-nav" style={{ justifyContent: 'flex-end' }}>
          <button
            className="btn btn-gold"
            style={{ minWidth: 160 }}
            onClick={() => handleNext(false)}
          >
            {isLast ? 'Submit & Finish →' : 'Save & Next →'}
          </button>
        </div>

        {/* Step dots */}
        <div className="question-dots">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`dot${i === current ? ' current' : ''}${savedRef.current[i] || answers[i] ? ' answered' : ''}`}
              style={{ cursor: 'default' }}
              title={`Bonanza ${i + 1}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
