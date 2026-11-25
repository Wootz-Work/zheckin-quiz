import { useState, useEffect } from 'react'
import Login from './components/Login.jsx'
import Quiz from './components/Quiz.jsx'
import Bonanza from './components/Bonanza.jsx'
import Results from './components/Results.jsx'
import Admin from './components/Admin.jsx'

export default function App() {
  const [page, setPage] = useState(null)
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) {
      setPage('admin')
      return
    }

    try {
      const saved = localStorage.getItem('quiz_session')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.submitted) {
          setSession(s)
          setPage(s.bonanzaDone ? 'results' : 'bonanza')
          return
        }
        const elapsed = Math.floor((Date.now() - s.startTime) / 1000)
        if (elapsed < s.timerSeconds) {
          setSession(s)
          setPage('quiz')
          return
        }
        // Timer expired — go straight to bonanza (answers were auto-submitted)
        if (s.sessionId) {
          setSession(s)
          setPage('bonanza')
          return
        }
        localStorage.removeItem('quiz_session')
        localStorage.removeItem('quiz_answers')
      }
    } catch {
      localStorage.removeItem('quiz_session')
      localStorage.removeItem('quiz_answers')
    }

    setPage('login')
  }, [])

  const handleLogin = (data) => {
    localStorage.setItem('quiz_session', JSON.stringify(data))
    setSession(data)
    setPage('quiz')
  }

  const handleQuizComplete = (data) => {
    const updated = { ...session, submitted: true, quizResults: data }
    localStorage.setItem('quiz_session', JSON.stringify(updated))
    setSession(updated)
    setPage('bonanza')
  }

  const handleBonanzaComplete = () => {
    const updated = { ...session, bonanzaDone: true }
    localStorage.setItem('quiz_session', JSON.stringify(updated))
    setPage('results')
  }

  if (page === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  if (page === 'admin')   return <Admin />
  if (page === 'login')   return <Login onLogin={handleLogin} />
  if (page === 'quiz')    return <Quiz session={session} onComplete={handleQuizComplete} />
  if (page === 'bonanza') return <Bonanza session={session} onComplete={handleBonanzaComplete} />
  if (page === 'results') return <Results />

  return null
}
