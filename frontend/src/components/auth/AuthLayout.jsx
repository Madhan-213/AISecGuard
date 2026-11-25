/**
 * AISecGuard — AuthLayout
 * Clean SaaS card wrapper for Login and Registration pages.
 * Keeps the animated CyberBackground canvas intact while providing a crisp,
 * well-proportioned form surface with integrated Sign In / Create Account tabs.
 */

import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, ArrowLeft, ShieldCheck } from 'lucide-react';
import CyberBackground from './CyberBackground';

export default function AuthLayout({
  children,
  theme,
  toggleTheme,
  title,
  subtitle,
  icon = '/logos/logo-icon.png',
}) {
  const isDark = theme === 'dark';
  const location = useLocation();
  const isRegister = location.pathname === '/register';

  const pillSurface = {
    background: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: isDark ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(203, 213, 225, 0.85)',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem',
        overflowX: 'hidden',
        color: isDark ? '#f8fafc' : '#0f172a',
      }}
    >
      {/* Dynamic AI Cybersecurity Particle Canvas (preserved) */}
      <CyberBackground theme={theme} />

      {/* Top Navigation Bar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          padding: '0.4rem 0.25rem',
        }}
      >
        <Link
          to="/"
          style={{
            ...pillSurface,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.42rem 0.85rem',
            borderRadius: 999,
            fontSize: '0.8rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: isDark ? '#cbd5e1' : '#475569',
            transition: 'border-color 0.2s ease, color 0.2s ease',
          }}
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </Link>

        <div
          className="desktop-only"
          style={{
            ...pillSurface,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.38rem 0.85rem',
            borderRadius: 999,
            fontSize: '0.74rem',
            fontWeight: 600,
            color: isDark ? '#60a5fa' : '#4f7ef7',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
            }}
          />
          <span>Zero-Execution AI Security Platform</span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle visual theme"
          style={{
            ...pillSurface,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.42rem 0.85rem',
            borderRadius: 999,
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: isDark ? '#f8fafc' : '#0f172a',
            transition: 'border-color 0.2s ease',
          }}
        >
          {isDark ? (
            <>
              <Sun size={14} style={{ color: '#fbbf24' }} />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon size={14} style={{ color: '#4f7ef7' }} />
              <span>Dark</span>
            </>
          )}
        </button>
      </header>

      {/* Main Clean Auth Card */}
      <main
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          margin: '1.25rem 0',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: '430px',
            borderRadius: '18px',
            overflow: 'hidden',
            background: isDark
              ? 'rgba(15, 23, 42, 0.84)'
              : 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            border: isDark
              ? '1px solid rgba(148, 163, 184, 0.2)'
              : '1px solid rgba(203, 213, 225, 0.9)',
            boxShadow: isDark
              ? '0 22px 48px -12px rgba(0, 0, 0, 0.65)'
              : '0 20px 44px -12px rgba(15, 23, 42, 0.14)',
          }}
        >
          {/* Crisp Top Accent Bar */}
          <div
            style={{
              height: 4,
              width: '100%',
              background: 'linear-gradient(90deg, #4f7ef7 0%, #6366f1 55%, #06b6d4 100%)',
            }}
          />

          <div style={{ padding: '1.85rem 2rem 2rem' }}>
            {/* Compact Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(79, 126, 247, 0.08)',
                  border: isDark ? '1px solid rgba(96, 165, 250, 0.25)' : '1px solid rgba(79, 126, 247, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  padding: 5,
                }}
              >
                <img
                  src={icon}
                  alt="AISecGuard"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: isDark ? '#60a5fa' : '#4f7ef7',
                    marginBottom: '0.1rem',
                  }}
                >
                  AISecGuard
                </div>
                <h1
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    letterSpacing: '-0.025em',
                    color: isDark ? '#ffffff' : '#0f172a',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h1>
              </div>
            </div>

            <p
              style={{
                fontSize: '0.84rem',
                color: isDark ? '#94a3b8' : '#64748b',
                margin: '0 0 1.25rem',
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </p>

            {/* Clean Segmented Auth Mode Switcher */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.25rem',
                padding: '0.25rem',
                borderRadius: 10,
                background: isDark ? 'rgba(2, 6, 23, 0.55)' : '#f1f5f9',
                border: isDark ? '1px solid rgba(148, 163, 184, 0.12)' : '1px solid #e2e8f0',
                marginBottom: '1.35rem',
              }}
            >
              <Link
                to="/login"
                style={{
                  textAlign: 'center',
                  padding: '0.45rem 0.5rem',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: !isRegister
                    ? isDark ? '#ffffff' : '#0f172a'
                    : isDark ? '#94a3b8' : '#64748b',
                  background: !isRegister
                    ? isDark ? 'rgba(59, 130, 246, 0.22)' : '#ffffff'
                    : 'transparent',
                  boxShadow: !isRegister
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.35)'
                      : '0 1px 3px rgba(15, 23, 42, 0.08)'
                    : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  textAlign: 'center',
                  padding: '0.45rem 0.5rem',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isRegister
                    ? isDark ? '#ffffff' : '#0f172a'
                    : isDark ? '#94a3b8' : '#64748b',
                  background: isRegister
                    ? isDark ? 'rgba(59, 130, 246, 0.22)' : '#ffffff'
                    : 'transparent',
                  boxShadow: isRegister
                    ? isDark
                      ? '0 1px 3px rgba(0, 0, 0, 0.35)'
                      : '0 1px 3px rgba(15, 23, 42, 0.08)'
                    : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                Create Account
              </Link>
            </div>

            {/* Form Body */}
            {children}

            {/* Security Trust Caption */}
            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: isDark ? '1px solid rgba(148, 163, 184, 0.14)' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.73rem',
                color: isDark ? '#64748b' : '#94a3b8',
              }}
            >
              <ShieldCheck size={13} style={{ color: '#10b981' }} />
              <span>Workspace isolated · Role-based cryptographic access</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Subtle Footer */}
      <footer
        style={{
          width: '100%',
          textAlign: 'center',
          fontSize: '0.74rem',
          color: isDark ? '#64748b' : '#94a3b8',
          zIndex: 10,
          padding: '0.4rem',
        }}
      >
        <span>AISecGuard AI Supply Chain Security Framework</span>
      </footer>
    </div>
  );
}
