/**
 * AISecGuard — Professional Cybersecurity Logo
 * Refined for an Enterprise SaaS aesthetic.
 */

export default function CyberLogo({ size = 'md', showText = true, showBadge = false, className = '' }) {
  const iconSizes = {
    sm: { width: 32, height: 32, shield: 24 },
    md: { width: 40, height: 40, shield: 32 },
    lg: { width: 52, height: 52, shield: 42 },
    xl: { width: 64, height: 64, shield: 52 },
  };

  const textSizes = {
    sm: { title: '1rem', badge: '0.65rem' },
    md: { title: '1.25rem', badge: '0.7rem' },
    lg: { title: '1.5rem', badge: '0.75rem' },
    xl: { title: '1.85rem', badge: '0.8rem' },
  };

  const dim = iconSizes[size] || iconSizes.md;
  const font = textSizes[size] || textSizes.md;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Refined Shield SVG */}
      <div
        style={{
          width: dim.width,
          height: dim.height,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Simplified Professional Shield */}
          <path
            d="M24 4L10 10V22C10 32 16 41 24 44C32 41 38 32 38 22V10L24 4Z"
            fill="none"
            stroke="url(#logoGrad)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Minimalist Core Symbol (Abstract AI Node) */}
          <circle cx="24" cy="22" r="4" fill="url(#logoGrad)" />
          <path
            d="M24 14V18M24 26V30M18 22H20M28 22H30"
            stroke="url(#logoGrad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Professional Typography */}
      {showText && (
        <div className="flex flex-col">
          <div
            style={{
              fontSize: font.title,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#3B82F6' }}>AI</span>
            <span style={{ color: '#F8FAFC' }}>SecGuard</span>
          </div>
          {showBadge && (
            <span
              style={{
                fontSize: font.badge,
                color: '#94A3B8',
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginTop: '0.2rem'
              }}
            >
              Supply Chain Defense
            </span>
          )}
        </div>
      )}
    </div>
  );
}
