/**
 * AISecGuard — Enterprise Login Page
 * Clean, production-ready cybersecurity authentication UI.
 * Connects directly to the backend database with isolated user workspaces.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

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

      <div style={{ width: '100%', maxWidth: 440 }}>
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
            Welcome Back
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
            Sign in to access your AISecGuard workspace
          </p>
        </div>

        {/* Feature Pill */}
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
          <span>AI Supply Chain Security & Threat Telemetry</span>
        </div>

        {/* Main Login Card */}
        <div className="card fade-in" style={{ padding: '2.25rem 2rem' }}>
          {/* Success Banner if redirected from registration */}
          {registeredSuccess && (
            <div
              className="alert-success"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.85rem 1rem',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>Account created successfully! Please sign in.</span>
            </div>
          )}

          {/* Error Notification */}
          {(error || authError) && (
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
              <span>{error || authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" htmlFor="email" style={{ fontWeight: 600 }}>
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
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  id="email"
                  className="input"
                  style={{ paddingLeft: '2.25rem' }}
                  type="email"
                  placeholder="analyst@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <label className="label" htmlFor="password" style={{ fontWeight: 600, marginBottom: 0 }}>
                  Password
                </label>
              </div>
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
                  className="input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            {/* Remember Me Option */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                fontSize: '0.825rem',
                color: 'var(--color-text-muted)',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                <span>Remember this workstation</span>
              </label>
            </div>

            <button
              id="btn-login"
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
                  <span>Signing In…</span>
                </>
              ) : (
                <>
                  <span>Sign In to AISecGuard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Create an account
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
