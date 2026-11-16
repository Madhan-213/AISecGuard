/**
 * AISecGuard — Official Enterprise CyberLogo
 * Uses official brand assets with responsive sizing.
 */

export default function CyberLogo({ size = 'md', showText = true, showBadge = false, className = '' }) {
  const iconSizes = {
    sm: { width: 28, height: 28 },
    md: { width: 36, height: 36 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 },
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
      <img
        src="/logos/logo-icon.png"
        alt="AISecGuard"
        style={{
          width: dim.width,
          height: dim.height,
          borderRadius: Math.round(dim.width * 0.25),
          boxShadow: '0 4px 12px rgba(79, 126, 247, 0.25)',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />

      {showText && (
        <div className="flex flex-col">
          <div
            style={{
              fontSize: font.title,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--color-primary, #3B82F6)' }}>AI</span>
            <span style={{ color: 'var(--color-text, #0f172a)' }}>SecGuard</span>
          </div>
          {showBadge && (
            <span
              style={{
                fontSize: font.badge,
                color: 'var(--color-text-muted, #94A3B8)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: '0.2rem',
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
