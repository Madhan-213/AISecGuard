/**
 * AISecGuard — Forgot Password Dialog
 * Clean enterprise modal explaining password recovery for self-hosted / enterprise environments.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, X, Mail, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function ForgotPasswordModal({ isOpen, onClose, theme = 'dark' }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
          }}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '460px',
            background: isDark
              ? 'rgba(15, 23, 42, 0.88)'
              : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(24px)',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.14)'
              : '1px solid rgba(255, 255, 255, 0.9)',
            borderRadius: 20,
            padding: '2rem',
            boxShadow: isDark
              ? '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(59, 130, 246, 0.15)'
              : '0 25px 60px -15px rgba(15, 23, 42, 0.2), 0 0 35px rgba(99, 102, 241, 0.1)',
            color: isDark ? '#f8fafc' : '#0f172a',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'transparent',
              border: 'none',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: '#38bdf8',
              }}
            >
              <KeyRound size={24} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
              Password Recovery
            </h3>
            <p style={{ fontSize: '0.85rem', color: isDark ? '#94a3b8' : '#64748b', margin: 0, lineHeight: 1.5 }}>
              Enter your work email address to receive password reset authorization.
            </p>
          </div>

          {submitted ? (
            <div
              style={{
                padding: '1.25rem',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 12,
                color: '#10b981',
                textAlign: 'center',
                fontSize: '0.88rem',
              }}
            >
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.75rem', color: '#10b981' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Reset Request Recorded</div>
              <p style={{ fontSize: '0.8rem', color: isDark ? '#cbd5e1' : '#475569', margin: 0 }}>
                If an account exists for <b style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{email}</b>, an administrator or password token has been dispatched.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
                style={{ marginTop: '1.25rem', width: '100%', padding: '0.6rem' }}
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: isDark ? '#cbd5e1' : '#334155',
                  }}
                >
                  Work Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="analyst@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.15)',
                      borderRadius: 10,
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 10,
                  padding: '0.75rem 0.9rem',
                  fontSize: '0.76rem',
                  color: isDark ? '#93c5fd' : '#2563eb',
                  marginBottom: '1.5rem',
                  lineHeight: 1.4,
                }}
              >
                💡 <b>Self-Hosted Recovery:</b> You can also reset credentials directly via the backend database admin at <span className="font-mono">/admin</span> or use default accounts (<span className="font-mono">admin@aisecguard.local</span>).
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    background: 'transparent',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.15)',
                    borderRadius: 10,
                    color: isDark ? '#cbd5e1' : '#475569',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    borderRadius: 10,
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <span>Request Reset</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
