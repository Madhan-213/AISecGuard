/**
 * AISecGuard — AuthLayout
 * Master Glassmorphism wrapper for Login and Registration pages.
 * Features an immersive AI cybersecurity background, responsive container,
 * frosted glass styling, theme toggle, and smooth animations.
 */

import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
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

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
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
      {/* Dynamic AI Cybersecurity Particle Canvas */}
      <CyberBackground theme={theme} />

      {/* Top Floating Action Bar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          padding: '0.75rem 0.5rem',
        }}
      >
        {/* Back link */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 999,
            fontSize: '0.82rem',
            fontWeight: 500,
            textDecoration: 'none',
            background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(16px)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: isDark ? '#94a3b8' : '#475569',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = isDark ? '#ffffff' : '#0f172a';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isDark ? '#94a3b8' : '#475569';
            e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
          }}
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </Link>

        {/* Status Pill (hidden on very small screens) */}
        <div
          className="desktop-only"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.9rem',
            borderRadius: 999,
            fontSize: '0.74rem',
            fontWeight: 600,
            background: isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(59, 130, 246, 0.08)',
            border: isDark ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
            color: isDark ? '#38bdf8' : '#2563eb',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <span>Zero-Execution AI Defense · Static Analysis Only</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle visual theme"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.85rem',
            borderRadius: 999,
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(16px)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            color: isDark ? '#f8fafc' : '#0f172a',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
          }}
        >
          {isDark ? (
            <>
              <Sun size={15} style={{ color: '#fbbf24' }} />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon size={15} style={{ color: '#6366f1' }} />
              <span>Dark</span>
            </>
          )}
        </button>
      </header>

      {/* Main Glassmorphism Card Container */}
      <main
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          margin: '1.5rem 0',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: '460px',
            position: 'relative',
          }}
        >
          {/* Subtle Ambient Glow Behind Card */}
          <div
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '32px',
              background: isDark
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.12) 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%)',
              filter: 'blur(20px)',
              zIndex: -1,
            }}
          />

          {/* Frosted Glass Card */}
          <div
            style={{
              background: isDark
                ? 'rgba(11, 18, 33, 0.68)'
                : 'rgba(255, 255, 255, 0.72)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.12)'
                : '1px solid rgba(255, 255, 255, 0.85)',
              borderRadius: '24px',
              padding: '2.5rem 2.25rem',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 25px 50px -12px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            }}
          >
            {/* Header / Brand */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                style={{
                  position: 'relative',
                  width: '68px',
                  height: '68px',
                  margin: '0 auto 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Logo Halo Glow */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '-4px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #00f0ff, #3b82f6, #8b5cf6)',
                    opacity: isDark ? 0.4 : 0.25,
                    filter: 'blur(10px)',
                  }}
                />
                <img
                  src={icon}
                  alt="AISecGuard"
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '18px',
                    objectFit: 'contain',
                    position: 'relative',
                    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                  }}
                />
              </motion.div>

              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: isDark ? '#ffffff' : '#0f172a',
                  margin: '0 0 0.45rem',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontSize: '0.88rem',
                  color: isDark ? '#94a3b8' : '#64748b',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            </div>

            {/* Injected Form Body */}
            {children}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer
        style={{
          width: '100%',
          textAlign: 'center',
          fontSize: '0.76rem',
          color: isDark ? '#64748b' : '#94a3b8',
          zIndex: 10,
          padding: '0.75rem',
        }}
      >
        <span>AISecGuard AI Supply Chain Security Framework · MCA Final Year Project</span>
      </footer>
    </div>
  );
}
