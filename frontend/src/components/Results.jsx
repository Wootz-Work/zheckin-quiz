import { Logo } from './Logo.jsx'

export default function Results() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 40 }}>
        <Logo size="lg" />
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* gold glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 48, marginBottom: 20 }}>🙌</div>

        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--text)',
          margin: '0 0 14px',
          lineHeight: 1.3,
          letterSpacing: '-0.3px',
        }}>
          Thank you for taking the quiz!
        </h1>

        <p style={{
          fontSize: 15.5,
          color: 'var(--text-2)',
          lineHeight: 1.7,
          margin: '0 0 10px',
        }}>
          We'll be sharing your results with you very soon.
        </p>

        <p style={{
          fontSize: 14,
          color: 'var(--text-3)',
          lineHeight: 1.6,
          margin: 0,
        }}>
          Don't wait around — keep exploring the ZheckIn app!
        </p>

        <div style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--text-3)',
        }}>
          <span style={{ color: 'var(--gold)' }}>✓</span>
          Your answers have been recorded
        </div>
      </div>
    </div>
  )
}
