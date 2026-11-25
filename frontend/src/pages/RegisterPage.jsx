/**
 * AISecGuard — Clean SaaS Registration Page
 * Enterprise AI Supply Chain Security workspace onboarding.
 * Preserves the animated CyberBackground via AuthLayout with a compact, structured form.
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
  AlertCircle,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthField from '../components/auth/AuthField';

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Password strength rules
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

  const confirmState = passwordsMismatch ? 'error' : passwordsMatch ? 'success' : 'default';

  return (
    <AuthLayout
      theme={theme}
      toggleTheme={toggleTheme}
      title="Create workspace"
      subtitle="Set up your isolated security portal to scan models and datasets."
      icon="/logos/logo-icon.png"
    >
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 0.9rem',
              borderRadius: 10,
              background: isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.08)',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.32)' : '1px solid rgba(239, 68, 68, 0.25)',
              color: isDark ? '#f87171' : '#dc2626',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Registration Form */}
      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="full_name"
          name="full_name"
          label="Full Name"
          type="text"
          icon={User}
          required
          autoFocus
          autoComplete="name"
          placeholder="e.g. Madhu Kumar"
          value={form.full_name}
          onChange={handleChange}
          isDark={isDark}
        />

        <AuthField
          id="email"
          name="email"
          label="Work Email"
          type="email"
          icon={Mail}
          required
          autoComplete="email"
          placeholder="analyst@organization.com"
          value={form.email}
          onChange={handleChange}
          isDark={isDark}
        />

        <AuthField
          id="password"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          required
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={form.password}
          onChange={handleChange}
          isDark={isDark}
          isPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          rightLabel={
            pwd.length > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color:
                    strengthScore === 1
                      ? '#ef4444'
                      : strengthScore === 2
                        ? '#f59e0b'
                        : strengthScore === 3
                          ? '#10b981'
                          : isDark ? '#64748b' : '#94a3b8',
                }}
              >
                {strengthScore === 1
                  ? 'Weak'
                  : strengthScore === 2
                    ? 'Fair'
                    : strengthScore === 3
                      ? 'Strong'
                      : 'Too short'}
              </span>
            )
          }
        />

        {/* Compact Strength Bar & Rule Checklist */}
        {pwd.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginTop: '-0.4rem', marginBottom: '0.9rem' }}
          >
            <div style={{ display: 'flex', gap: '0.3rem', height: 3, marginBottom: '0.4rem' }}>
              {[1, 2, 3].map((idx) => {
                const active = strengthScore >= idx;
                const barColor =
                  strengthScore === 1 ? '#ef4444' : strengthScore === 2 ? '#f59e0b' : '#10b981';
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      borderRadius: 2,
                      background: active
                        ? barColor
                        : isDark
                          ? 'rgba(148, 163, 184, 0.16)'
                          : '#e2e8f0',
                      transition: 'background 0.25s ease',
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', fontSize: '0.7rem' }}>
              {[
                { ok: hasMinLength, text: '8+ chars' },
                { ok: hasNumberOrSymbol, text: 'Number / symbol' },
                { ok: hasUpperAndLower, text: 'Upper & lower' },
              ].map((rule) => (
                <span
                  key={rule.text}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    color: rule.ok ? '#10b981' : isDark ? '#64748b' : '#94a3b8',
                    fontWeight: rule.ok ? 600 : 400,
                  }}
                >
                  {rule.ok ? <Check size={11} /> : <span>•</span>}
                  <span>{rule.text}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}

        <AuthField
          id="confirm_password"
          name="confirm_password"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          icon={Lock}
          required
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={form.confirm_password}
          onChange={handleChange}
          isDark={isDark}
          state={confirmState}
          isPasswordToggle
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword((prev) => !prev)}
          rightLabel={
            <>
              {passwordsMatch && (
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Check size={12} /> Matches
                </span>
              )}
              {passwordsMismatch && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <X size={12} /> Mismatch
                </span>
              )}
            </>
          }
        />

        {/* Terms Agreement Checkbox */}
        <div style={{ marginTop: '0.25rem', marginBottom: '1.25rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.55rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              required
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              style={{
                marginTop: '0.18rem',
                width: 15,
                height: 15,
                accentColor: isDark ? '#60a5fa' : '#4f7ef7',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            />
            <span style={{ fontSize: '0.78rem', color: isDark ? '#94a3b8' : '#64748b', lineHeight: 1.4 }}>
              I agree to the{' '}
              <span style={{ color: isDark ? '#60a5fa' : '#4f7ef7', fontWeight: 600 }}>
                Security Policy
              </span>{' '}
              and Acceptable Use Terms for AI Artifact Ingestion.
            </span>
          </label>
        </div>

        {/* Clean Primary Submit Button */}
        <button
          id="btn-register"
          type="submit"
          disabled={loading || (form.password && form.confirm_password && !passwordsMatch)}
          style={{
            width: '100%',
            height: 44,
            fontSize: '0.9rem',
            fontWeight: 600,
            borderRadius: 10,
            border: 'none',
            color: '#ffffff',
            background: isDark
              ? 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)'
              : 'linear-gradient(135deg, #4f7ef7 0%, #3b6ee8 100%)',
            boxShadow: isDark
              ? '0 4px 14px rgba(59, 130, 246, 0.35)'
              : '0 4px 12px rgba(79, 126, 247, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading || (form.password && form.confirm_password && !passwordsMatch) ? 0.72 : 1,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
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
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Secondary Navigation Prompt */}
      <div
        style={{
          marginTop: '1.1rem',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: isDark ? '#94a3b8' : '#64748b',
        }}
      >
        Already have a workspace?{' '}
        <Link
          to="/login"
          style={{
            color: isDark ? '#60a5fa' : '#4f7ef7',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
