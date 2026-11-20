/**
 * AISecGuard — Premium Glassmorphism Login Page
 * Enterprise AI Supply Chain Security authentication.
 * Connected directly to the backend database with isolated user workspaces.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';

export default function LoginPage() {
  const { login, user, authError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpenOpen] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const registeredSuccess = location.state?.registered;
  const registeredEmail = location.state?.email;

  useEffect(() => {
    if (registeredEmail) {
      setEmail(registeredEmail);
    }
  }, [registeredEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Invalid email or password. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <AuthLayout
      theme={theme}
      toggleTheme={toggleTheme}
      title="Welcome Back"
      subtitle="Secure your AI supply chain. Sign in to continue."
      icon="/logos/logo-icon.png"
    >
      {/* Success Notification if redirected from registration */}
      <AnimatePresence>
        {registeredSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              borderRadius: 12,
              background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(16, 185, 129, 0.3)',
              color: isDark ? '#34d399' : '#059669',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>Account created successfully! Please sign in with your credentials.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      <AnimatePresence>
        {(error || authError) && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              borderRadius: 12,
              background: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(239, 68, 68, 0.25)',
              color: isDark ? '#f87171' : '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error || authError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Email Field */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: '0.45rem',
              color: isDark ? '#e2e8f0' : '#334155',
            }}
          >
            Work Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <Mail
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: focusedField === 'email'
                  ? 'var(--color-primary, #3b82f6)'
                  : isDark ? '#64748b' : '#94a3b8',
                transition: 'color 0.2s ease',
                pointerEvents: 'none',
              }}
            />
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="analyst@organization.com"
              value={email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.78rem 1rem 0.78rem 2.65rem',
                fontSize: '0.92rem',
                borderRadius: '12px',
                background: isDark
                  ? focusedField === 'email' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)'
                  : focusedField === 'email' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                border: focusedField === 'email'
                  ? '1px solid #3b82f6'
                  : isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: focusedField === 'email'
                  ? '0 0 0 3px rgba(59, 130, 246, 0.25)'
                  : 'none',
                color: isDark ? '#ffffff' : '#0f172a',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <label
              htmlFor="password"
              style={{
                fontSize: '0.84rem',
                fontWeight: 600,
                color: isDark ? '#e2e8f0' : '#334155',
              }}
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setForgotModalOpenOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-primary, #3b82f6)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Forgot password?
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Lock
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: focusedField === 'password'
                  ? 'var(--color-primary, #3b82f6)'
                  : isDark ? '#64748b' : '#94a3b8',
                transition: 'color 0.2s ease',
                pointerEvents: 'none',
              }}
            />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.78rem 2.75rem 0.78rem 2.65rem',
                fontSize: '0.92rem',
                borderRadius: '12px',
                background: isDark
                  ? focusedField === 'password' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)'
                  : focusedField === 'password' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                border: focusedField === 'password'
                  ? '1px solid #3b82f6'
                  : isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: focusedField === 'password'
                  ? '0 0 0 3px rgba(59, 130, 246, 0.25)'
                  : 'none',
                color: isDark ? '#ffffff' : '#0f172a',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.35rem',
                borderRadius: '6px',
                transition: 'color 0.15s ease',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember Me Option */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.75rem',
            fontSize: '0.84rem',
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: '#3b82f6',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            />
            <span>Remember this workstation</span>
          </label>
        </div>

        {/* Primary Submit Button */}
        <motion.button
          id="btn-login"
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.015, translateY: -1 }}
          whileTap={{ scale: 0.985 }}
          style={{
            width: '100%',
            padding: '0.85rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            borderRadius: '14px',
            border: 'none',
            color: '#ffffff',
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
            boxShadow: '0 8px 24px -4px rgba(79, 70, 229, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.8 : 1,
            transition: 'box-shadow 0.2s ease',
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              <span>Signing In…</span>
            </>
          ) : (
            <>
              <span>Sign In to AISecGuard</span>
              <ArrowRight size={17} />
            </>
          )}
        </motion.button>
      </form>

      {/* Navigation Footer Link */}
      <div
        style={{
          marginTop: '1.75rem',
          paddingTop: '1.5rem',
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          textAlign: 'center',
          fontSize: '0.86rem',
          color: isDark ? '#94a3b8' : '#64748b',
        }}
      >
        Don't have an account?{' '}
        <Link
          to="/register"
          style={{
            color: 'var(--color-primary, #3b82f6)',
            fontWeight: 700,
            textDecoration: 'none',
            marginLeft: '0.25rem',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Create an account →
        </Link>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpenOpen(false)}
        theme={theme}
      />
    </AuthLayout>
  );
}
