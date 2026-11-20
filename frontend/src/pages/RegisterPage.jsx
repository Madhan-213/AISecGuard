/**
 * AISecGuard — Premium Glassmorphism Registration Page
 * Enterprise AI Supply Chain Security workspace onboarding.
 * Gives every user a complete, private, isolated workspace with zero prior history.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Password strength calculations
  const pwd = form.password;
  const hasMinLength = pwd.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(pwd);
  const hasUpperAndLower = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);

  const strengthScore = [hasMinLength, hasNumberOrSymbol, hasUpperAndLower].filter(Boolean).length;
  const passwordsMatch = Boolean(form.password && form.confirm_password && form.password === form.confirm_password);
  const passwordsMismatch = Boolean(form.confirm_password && form.password !== form.confirm_password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }
    if (!agreedTerms) {
      setError('Please agree to the Security Policy and Acceptable Use Terms to proceed.');
      return;
    }

    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name);
      navigate('/login', {
        state: {
          registered: true,
          email: form.email,
        },
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : 'Registration failed. Please ensure this email is not already registered.'
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
      title="Create Your Account"
      subtitle="Join AISecGuard and strengthen your AI security."
      icon="/logos/logo-icon.png"
    >
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
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
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <div style={{ marginBottom: '1.15rem' }}>
          <label
            htmlFor="full_name"
            style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: '0.45rem',
              color: isDark ? '#e2e8f0' : '#334155',
            }}
          >
            Full Name
          </label>
          <div style={{ position: 'relative' }}>
            <User
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: focusedField === 'full_name'
                  ? 'var(--color-primary, #3b82f6)'
                  : isDark ? '#64748b' : '#94a3b8',
                transition: 'color 0.2s ease',
                pointerEvents: 'none',
              }}
            />
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoFocus
              autoComplete="name"
              placeholder="e.g. Madhu Kumar"
              value={form.full_name}
              onFocus={() => setFocusedField('full_name')}
              onBlur={() => setFocusedField(null)}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.78rem 1rem 0.78rem 2.65rem',
                fontSize: '0.92rem',
                borderRadius: '12px',
                background: isDark
                  ? focusedField === 'full_name' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)'
                  : focusedField === 'full_name' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                border: focusedField === 'full_name'
                  ? '1px solid #3b82f6'
                  : isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: focusedField === 'full_name'
                  ? '0 0 0 3px rgba(59, 130, 246, 0.25)'
                  : 'none',
                color: isDark ? '#ffffff' : '#0f172a',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom: '1.15rem' }}>
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
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="analyst@organization.com"
              value={form.email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChange={handleChange}
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

        {/* Password */}
        <div style={{ marginBottom: '1.15rem' }}>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: 600,
              marginBottom: '0.45rem',
              color: isDark ? '#e2e8f0' : '#334155',
            }}
          >
            Password
          </label>
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
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••••••"
              value={form.password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChange={handleChange}
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
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {pwd.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: '0.65rem' }}
            >
              {/* Strength Progress Bar */}
              <div style={{ display: 'flex', gap: '0.35rem', height: 4, marginBottom: '0.45rem' }}>
                <div
                  style={{
                    flex: 1,
                    borderRadius: 2,
                    background: strengthScore >= 1 ? (strengthScore === 1 ? '#ef4444' : strengthScore === 2 ? '#f59e0b' : '#10b981') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    transition: 'background 0.3s ease',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    borderRadius: 2,
                    background: strengthScore >= 2 ? (strengthScore === 2 ? '#f59e0b' : '#10b981') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    transition: 'background 0.3s ease',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    borderRadius: 2,
                    background: strengthScore >= 3 ? '#10b981' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    transition: 'background 0.3s ease',
                  }}
                />
              </div>

              {/* Strength Labels & Checklist */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '0.4rem' }}>
                <span>Strength:</span>
                <span style={{
                  fontWeight: 700,
                  color: strengthScore === 1 ? '#ef4444' : strengthScore === 2 ? '#f59e0b' : strengthScore === 3 ? '#10b981' : '#94a3b8',
                }}>
                  {strengthScore === 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : strengthScore === 3 ? 'Strong' : 'Too Short'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                <span style={{
                  fontSize: '0.7rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: hasMinLength ? '#10b981' : (isDark ? '#64748b' : '#94a3b8'),
                }}>
                  {hasMinLength ? <Check size={11} /> : '•'} 8+ characters
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: hasNumberOrSymbol ? '#10b981' : (isDark ? '#64748b' : '#94a3b8'),
                }}>
                  {hasNumberOrSymbol ? <Check size={11} /> : '•'} Number or symbol
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: hasUpperAndLower ? '#10b981' : (isDark ? '#64748b' : '#94a3b8'),
                }}>
                  {hasUpperAndLower ? <Check size={11} /> : '•'} Upper & lowercase
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <label
              htmlFor="confirm_password"
              style={{
                fontSize: '0.84rem',
                fontWeight: 600,
                color: isDark ? '#e2e8f0' : '#334155',
              }}
            >
              Confirm Password
            </label>
            {passwordsMatch && (
              <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Check size={13} /> Passwords match
              </span>
            )}
            {passwordsMismatch && (
              <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <X size={13} /> Passwords do not match
              </span>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <Lock
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: focusedField === 'confirm_password'
                  ? 'var(--color-primary, #3b82f6)'
                  : isDark ? '#64748b' : '#94a3b8',
                transition: 'color 0.2s ease',
                pointerEvents: 'none',
              }}
            />
            <input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••••••"
              value={form.confirm_password}
              onFocus={() => setFocusedField('confirm_password')}
              onBlur={() => setFocusedField(null)}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.78rem 2.75rem 0.78rem 2.65rem',
                fontSize: '0.92rem',
                borderRadius: '12px',
                background: isDark
                  ? focusedField === 'confirm_password' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)'
                  : focusedField === 'confirm_password' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                border: passwordsMismatch
                  ? '1px solid #ef4444'
                  : passwordsMatch
                  ? '1px solid #10b981'
                  : focusedField === 'confirm_password'
                  ? '1px solid #3b82f6'
                  : isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: passwordsMismatch
                  ? '0 0 0 3px rgba(239, 68, 68, 0.2)'
                  : passwordsMatch
                  ? '0 0 0 3px rgba(16, 185, 129, 0.2)'
                  : focusedField === 'confirm_password'
                  ? '0 0 0 3px rgba(59, 130, 246, 0.25)'
                  : 'none',
                color: isDark ? '#ffffff' : '#0f172a',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
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
              }}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Terms & Conditions Checkbox */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              required
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              style={{
                marginTop: '0.15rem',
                width: 16,
                height: 16,
                accentColor: '#3b82f6',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            />
            <span style={{ fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.4 }}>
              I agree to the <span style={{ color: 'var(--color-primary, #3b82f6)', fontWeight: 600 }}>Security Policy</span> and Acceptable Use Terms for AI Artifact Ingestion.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <motion.button
          id="btn-register"
          type="submit"
          disabled={loading || (form.password && form.confirm_password && !passwordsMatch)}
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
              <span>Creating Workspace…</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={17} />
            </>
          )}
        </motion.button>
      </form>

      {/* Switcher to Login */}
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
        Already have an account?{' '}
        <Link
          to="/login"
          style={{
            color: 'var(--color-primary, #3b82f6)',
            fontWeight: 700,
            textDecoration: 'none',
            marginLeft: '0.25rem',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Sign in →
        </Link>
      </div>
    </AuthLayout>
  );
}
