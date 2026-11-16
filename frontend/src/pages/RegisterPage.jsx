/**
 * AISecGuard — Enterprise Registration Page
 * Clean, modern cybersecurity SaaS signup UI.
 * Gives every user a complete, private, isolated workspace with zero prior history.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import {
  Shield,
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
  Sun,
  Moon,
} from 'lucide-react';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
  const passwordsMatch = form.password && form.confirm_password && form.password === form.confirm_password;
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: '2.5rem 1.25rem',
        position: 'relative',
      }}
    >
      {/* Top right theme toggle */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem' }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          style={{
            fontSize: '0.8rem',
            padding: '0.4rem 0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--color-text)',
            borderRadius: 8,
          }}
        >
          {theme === 'dark' ? (
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
      </div>

      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logos/logo-icon.png"
            alt="AISecGuard Logo"
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              margin: '0 auto 1.1rem',
              display: 'block',
              boxShadow: '0 8px 24px rgba(79, 126, 247, 0.35)',
              objectFit: 'contain',
            }}
          />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.025em' }}>
            Create Your Account
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Provision your private AI supply chain security workspace
          </p>
        </div>

        {/* Feature badge banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 999,
            marginBottom: '1.25rem',
            color: '#60a5fa',
            fontSize: '0.76rem',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={14} style={{ color: '#38bdf8' }} />
          <span>Private Workspace • Dedicated Threat Telemetry</span>
        </div>

        {/* Main Form Card */}
        <div className="card fade-in" style={{ padding: '2.25rem 2rem' }}>
          {error && (
            <div
              className="alert-error"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.85rem 1rem',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="label" htmlFor="full_name" style={{ fontWeight: 600 }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="full_name"
                  name="full_name"
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  type="text"
                  placeholder="Security Analyst"
                  value={form.full_name}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
            </div>

            {/* Email Address */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="label" htmlFor="email" style={{ fontWeight: 600 }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="email"
                  name="email"
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  type="email"
                  placeholder="analyst@organization.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.2rem' }}>
              <label className="label" htmlFor="password" style={{ fontWeight: 600 }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="password"
                  name="password"
                  className="input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength meter */}
              {form.password.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div
                    style={{
                      height: 4,
                      background: 'var(--color-border)',
                      borderRadius: 99,
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: strengthScore === 1 ? '33%' : strengthScore === 2 ? '66%' : '100%',
                        background:
                          strengthScore === 1
                            ? '#ef4444'
                            : strengthScore === 2
                            ? '#f59e0b'
                            : '#10b981',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.72rem' }}>
                    <span
                      style={{
                        color:
                          strengthScore === 1
                            ? '#f87171'
                            : strengthScore === 2
                            ? '#fbbf24'
                            : '#34d399',
                        fontWeight: 600,
                      }}
                    >
                      {strengthScore === 1 ? 'Weak' : strengthScore === 2 ? 'Moderate' : 'Strong'} password
                    </span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {hasMinLength ? '✓ 8+ chars' : 'Needs 8+ chars'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label className="label" htmlFor="confirm_password" style={{ fontWeight: 600 }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="confirm_password"
                  name="confirm_password"
                  className="input"
                  style={{
                    paddingLeft: '2.25rem',
                    paddingRight: '2.5rem',
                    borderColor: passwordsMatch
                      ? '#10b981'
                      : passwordsMismatch
                      ? '#ef4444'
                      : undefined,
                  }}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordsMismatch && (
                <span style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.35rem', display: 'block' }}>
                  Passwords do not match
                </span>
              )}
              {passwordsMatch && (
                <span style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check size={12} strokeWidth={3} /> Passwords match
                </span>
              )}
            </div>

            <button
              id="btn-register"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.925rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  <span>Creating Your Workspace…</span>
                </>
              ) : (
                <>
                  <span>Create Account & Get Started</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            ← Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
