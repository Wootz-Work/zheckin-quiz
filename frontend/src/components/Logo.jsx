export function Logo({ size = 'md', showText = true }) {
  const cfg = {
    sm: { w: 22, text: 14 },
    md: { w: 28, text: 18 },
    lg: { w: 36, text: 23 },
    xl: { w: 50, text: 32 },
  }
  const { w, text } = cfg[size] || cfg.md
  const h = Math.round(w * 0.86)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1 }}>
      {/* Viewfinder bracket mark — 4 corner L-marks, gold accent at top-right */}
      <svg width={w} height={h} viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top-left L */}
        <path d="M2 8 L2 2 L8 2" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Bottom-left L */}
        <path d="M2 16 L2 22 L8 22" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Bottom-right L */}
        <path d="M20 22 L26 22 L26 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Top-right L (white, partially behind gold square) */}
        <path d="M20 2 L26 2 L26 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Gold accent square at top-right corner */}
        <rect x="18" y="2" width="8" height="8" rx="1.2" fill="#D4A843"/>
      </svg>

      {showText && (
        <span style={{
          fontSize: text,
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '1.6px',
          textTransform: 'uppercase',
          fontFamily: 'inherit',
          lineHeight: 1,
        }}>
          ZHECKIN<span style={{ color: '#D4A843' }}>.</span>
        </span>
      )}
    </div>
  )
}

export default Logo
