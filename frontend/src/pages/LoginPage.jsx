/**
 * AISecGuard — Login Page
 * JWT authentication with show/hide password toggle and post-registration confirmation banner.
 */

import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registeredSuccess = location.state?.registered;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 15%, rgba(37, 99, 235, 0.12) 0%, #090d16 75%)',
      padding: '2rem 1rem',
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: '2.25rem 2rem' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 54,
            height: 54,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: '#ffffff',
            boxShadow: '0 0 25px rgba(37, 99, 235, 0.35)',
          }}>
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            AISecGuard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Sign in to access AI supply chain telemetry
          </p>
        </div>

        {/* Success Banner if redirected from registration */}
        {registeredSuccess && (
          <div className="alert-success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={16} />
            <span>Account created successfully! Please sign in.</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="label" htmlFor="email">Analyst Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="email"
                className="input"
                style={{ paddingLeft: '2.25rem' }}
                type="email"
                placeholder="analyst@aisecguard.local"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <label className="label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="password"
                className="input"
                style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.925rem', fontWeight: 600 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                <span>Authenticating…</span>
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.85rem', color: '#64748b' }}>
          Don't have an analyst account?{' '}
          <Link to="/register" style={{ color: '#38bdf8', fontWeight: 600 }}>
            Register new account
          </Link>
        </p>
      </div>
    </div>
  );
}
