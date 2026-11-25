const express = require('express')
const Database = require('better-sqlite3')
const path = require('path')
const cors = require('cors')
const crypto = require('crypto')

const app = express()
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'quiz.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    time_taken INTEGER,
    score INTEGER,
    total INTEGER DEFAULT 25
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    selected TEXT,
    is_correct INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings VALUES ('timer_seconds', '120');
  INSERT OR IGNORE INTO settings VALUES ('admin_password', 'wootz2024');

  CREATE TABLE IF NOT EXISTS bonanza_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    question_no INTEGER NOT NULL,
    answer TEXT,
    submitted_at INTEGER,
    UNIQUE(session_id, question_no)
  );
`)

// One answer per question per session: keep the latest row, then enforce it so INSERT OR REPLACE replaces.
db.exec(`
  DELETE FROM answers WHERE id NOT IN (SELECT MAX(id) FROM answers GROUP BY session_id, question_id);
  CREATE UNIQUE INDEX IF NOT EXISTS answers_one_per_question ON answers (session_id, question_id);
`)

app.use(express.json())
app.use(cors())
app.use(express.static(path.join(__dirname, 'public')))

const getSetting = (key) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : null
}

// Admin password comes from the environment when set (never from the repo default in production).
const adminPassword = () => process.env.ADMIN_PASSWORD || getSetting('admin_password')

// Optional quiz window (ISO times, e.g. 2026-11-26T15:00:00+05:30). New attempts are refused outside it;
// attempts already started can finish.
const windowTime = (name) => {
  const t = Date.parse(process.env[name] || '')
  return Number.isNaN(t) ? null : t
}
const ist = (t) => new Date(t).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})

// Answers arriving after the timer (plus a small network grace) are ignored.
const GRACE_MS = 15_000
const isLate = (session) =>
  Date.now() > session.started_at + parseInt(getSetting('timer_seconds')) * 1000 + GRACE_MS

// Score a session from its saved answers (plus any answers sent with the submit) and close it.
function scoreSession(sessionId, sentAnswers, timeTaken) {
  const questions = require('./questions')
  const dbAnswers = db.prepare('SELECT question_id, selected FROM answers WHERE session_id = ?').all(sessionId)
  const answers = {}
  for (const row of dbAnswers) answers[row.question_id] = row.selected
  if (sentAnswers) Object.assign(answers, sentAnswers)

  let score = 0
  const insertAnswer = db.prepare(
    'INSERT OR REPLACE INTO answers (session_id, question_id, selected, is_correct) VALUES (?, ?, ?, ?)'
  )
  db.transaction(() => {
    for (const q of questions) {
      const selected = answers[q.id] ?? null
      // Bonus question: any response (even empty) earns the point
      const isCorrect = q.bonus ? (selected ? 1 : 0) : (selected === q.answer ? 1 : 0)
      if (isCorrect) score++
      insertAnswer.run(sessionId, q.id, selected, isCorrect)
    }
    db.prepare(
      'UPDATE sessions SET completed_at = ?, time_taken = ?, score = ?, total = ? WHERE id = ?'
    ).run(Date.now(), timeTaken || 0, score, questions.length, sessionId)
  })()
  return { score, total: questions.length, answers, questions }
}

// POST /api/session — login + create session
app.post('/api/session', (req, res) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  const normalEmail = email.trim().toLowerCase()
  if (!normalEmail.endsWith('@wootz.work')) {
    return res.status(403).json({ error: 'Only @wootz.work email addresses are allowed' })
  }

  const timerSeconds = parseInt(getSetting('timer_seconds'))

  const opensAt = windowTime('QUIZ_OPENS_AT')
  const closesAt = windowTime('QUIZ_CLOSES_AT')
  const resumable = db.prepare('SELECT id FROM sessions WHERE email = ? AND completed_at IS NULL').get(normalEmail)
  if (opensAt && Date.now() < opensAt) {
    return res.status(403).json({ error: `The quiz opens at ${ist(opensAt)} IST.` })
  }
  if (closesAt && Date.now() > closesAt && !resumable) {
    return res.status(403).json({ error: `The quiz closed at ${ist(closesAt)} IST.` })
  }

  // One attempt per email.
  const done = db.prepare('SELECT id FROM sessions WHERE email = ? AND completed_at IS NOT NULL').get(normalEmail)
  if (done) {
    return res.status(409).json({ error: 'You have already taken this quiz. Thank you!' })
  }

  // Resume active session if timer hasn't expired
  const existing = db
    .prepare('SELECT * FROM sessions WHERE email = ? AND completed_at IS NULL')
    .get(normalEmail)

  if (existing) {
    const elapsed = Math.floor((Date.now() - existing.started_at) / 1000)
    if (elapsed < timerSeconds) {
      return res.json({
        sessionId: existing.id,
        timerSeconds,
        startTime: existing.started_at,
        email: normalEmail,
        resumed: true,
      })
    }
    // Timer expired without a submit (e.g. browser closed): score the saved answers and stop here.
    scoreSession(existing.id, null, timerSeconds * 1000)
    return res.status(409).json({ error: 'Your time for this quiz is over. Your saved answers have been submitted.' })
  }

  const sessionId = crypto.randomUUID()
  const startTime = Date.now()

  db.prepare('INSERT INTO sessions (id, email, started_at) VALUES (?, ?, ?)').run(
    sessionId,
    normalEmail,
    startTime
  )

  res.json({ sessionId, timerSeconds, startTime, email: normalEmail })
})

// GET /api/questions — questions without answers
app.get('/api/window', (_req, res) => {
  res.json({ opensAt: windowTime('QUIZ_OPENS_AT'), closesAt: windowTime('QUIZ_CLOSES_AT'), now: Date.now() })
})

app.get('/api/questions', (_req, res) => {
  const questions = require('./questions')
  res.json(
    questions.map((q) => ({ id: q.id, text: q.text, options: q.options, bonus: q.bonus || false }))
  )
})

// POST /api/answer — save a single answer progressively (no scoring yet)
app.post('/api/answer', (req, res) => {
  const { sessionId, questionId, selected } = req.body
  if (!sessionId || !questionId) return res.status(400).json({ error: 'sessionId and questionId required' })

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  if (session.completed_at) return res.status(200).json({ ok: true }) // already done, ignore
  if (isLate(session)) return res.status(200).json({ ok: true, late: true }) // after the timer, ignore

  db.prepare(
    'INSERT OR REPLACE INTO answers (session_id, question_id, selected, is_correct) VALUES (?, ?, ?, 0)'
  ).run(sessionId, questionId, selected ?? null)

  res.json({ ok: true })
})

// POST /api/submit — score all answers and close session
app.post('/api/submit', (req, res) => {
  const { sessionId, answers: sentAnswers, timeTaken } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  if (session.completed_at) return res.status(400).json({ error: 'Quiz already submitted' })

  // After the timer, only answers already saved in time count.
  const { score, answers, questions } = scoreSession(sessionId, isLate(session) ? null : sentAnswers, timeTaken)

  const results = questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    bonus: q.bonus || false,
    correct: q.answer,
    selected: answers[q.id] ?? null,
    isCorrect: q.bonus
      ? !!(answers[q.id])
      : (answers[q.id] ?? null) === q.answer,
  }))

  res.json({ score, total: questions.length, timeTaken: timeTaken || 0, results })
})

// POST /api/bonanza — save a single bonanza answer
app.post('/api/bonanza', (req, res) => {
  const { sessionId, questionNo, answer } = req.body
  if (!sessionId || !questionNo) return res.status(400).json({ error: 'sessionId and questionNo required' })

  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  db.prepare(
    'INSERT OR REPLACE INTO bonanza_answers (session_id, question_no, answer, submitted_at) VALUES (?, ?, ?, ?)'
  ).run(sessionId, questionNo, answer || '', Date.now())

  res.json({ ok: true })
})

// Admin auth check
const adminAuth = (req, res, next) => {
  const password = req.query.password || req.body?.password
  if (password !== adminPassword()) {
    return res.status(401).json({ error: 'Invalid admin password' })
  }
  next()
}

app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body
  if (password === adminPassword()) {
    res.json({ success: true })
  } else {
    res.status(401).json({ error: 'Invalid password' })
  }
})

app.get('/api/admin/settings', adminAuth, (req, res) => {
  res.json({ timer_seconds: parseInt(getSetting('timer_seconds')) })
})

app.post('/api/admin/settings', adminAuth, (req, res) => {
  const { timer_seconds } = req.body
  if (timer_seconds !== undefined) {
    const t = parseInt(timer_seconds)
    if (isNaN(t) || t < 30 || t > 3600) {
      return res.status(400).json({ error: 'Timer must be 30–3600 seconds' })
    }
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(t), 'timer_seconds')
  }
  res.json({ success: true, timer_seconds: parseInt(getSetting('timer_seconds')) })
})

app.get('/api/admin/results', adminAuth, (req, res) => {
  const sessions = db
    .prepare(
      'SELECT id, email, started_at, completed_at, time_taken, score, total FROM sessions WHERE completed_at IS NOT NULL ORDER BY completed_at DESC'
    )
    .all()

  const allAnswers = db.prepare('SELECT * FROM answers').all()
  const allBonanza = db.prepare('SELECT * FROM bonanza_answers').all()
  const questions = require('./questions')

  const results = sessions.map((s) => ({
    ...s,
    answers: questions.map((q) => {
      const a = allAnswers.find((a) => a.session_id === s.id && a.question_id === q.id)
      return {
        questionId: q.id,
        questionText: q.text,
        correct: q.answer,
        selected: a?.selected ?? null,
        isCorrect: a?.is_correct ?? 0,
      }
    }),
    bonanza: allBonanza.filter((b) => b.session_id === s.id).sort((a, b) => a.question_no - b.question_no),
  }))

  res.json(results)
})

// CSV export
app.get('/api/admin/export', adminAuth, (req, res) => {
  const sessions = db
    .prepare(
      'SELECT * FROM sessions WHERE completed_at IS NOT NULL ORDER BY completed_at DESC'
    )
    .all()
  const questions = require('./questions')

  let csv = 'Email,Score,Percentage,TimeTaken(s),SubmittedAt'
  questions.forEach((q) => { csv += `,Q${q.id}` })
  csv += '\n'

  for (const s of sessions) {
    const answers = db
      .prepare('SELECT * FROM answers WHERE session_id = ? ORDER BY question_id')
      .all(s.id)
    const pct = s.total ? Math.round((s.score / s.total) * 100) : 0
    const timeSec = s.time_taken ? Math.floor(s.time_taken / 1000) : ''
    const submittedAt = s.completed_at ? new Date(s.completed_at).toISOString() : ''

    csv += `${s.email},${s.score}/${s.total},${pct}%,${timeSec},${submittedAt}`
    questions.forEach((q) => {
      const a = answers.find((a) => a.question_id === q.id)
      csv += `,${a?.selected ?? ''}`
    })
    csv += '\n'
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=zhckin-quiz-results.csv')
  res.send(csv)
})

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZheckIn Quiz running on http://0.0.0.0:${PORT}`)
  console.log(`Admin panel: /admin${process.env.ADMIN_PASSWORD ? '' : '  (WARNING: ADMIN_PASSWORD not set, using the default)'}`)
})
