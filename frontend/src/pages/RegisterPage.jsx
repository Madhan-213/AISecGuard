/**
 * AISecGuard — Register Account Page
 * Analyst registration with password strength indicators and credentials validation.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/client';
import { Shield, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authApi.register(form.email, form.password, form.full_name);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isPasswordStrong = form.password.length >= 8;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 15%, rgba(124, 58, 237, 0.12) 0%, #090d16 75%)',
      padding: '2rem 1rem',
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 440, padding: '2.25rem 2rem' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 54,
            height: 54,
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: '#ffffff',
            boxShadow: '0 0 25px rgba(124, 58, 237, 0.35)',
          }}>
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Provision a new security analyst profile
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.15rem' }}>
            <label className="label" htmlFor="full_name">Full Name (optional)</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="full_name"
                name="full_name"
                className="input"
                style={{ paddingLeft: '2.25rem' }}
                type="text"
                placeholder="Dr. Jane Doe"
                value={form.full_name}
                onChange={handleChange}
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.15rem' }}>
            <label className="label" htmlFor="reg-email">Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="reg-email"
                name="email"
                className="input"
                style={{ paddingLeft: '2.25rem' }}
                type="email"
                placeholder="analyst@aisecguard.local"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label className="label" htmlFor="reg-password">Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                id="reg-password"
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

            {/* Strength indicator */}
            {form.password.length > 0 && (
              <div style={{ marginTop: '0.45rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  height: 4,
                  flex: 1,
                  background: '#1e293b',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: isPasswordStrong ? '100%' : `${(form.password.length / 8) * 100}%`,
                    background: isPasswordStrong ? '#10b981' : '#f87171',
                    transition: 'all 0.2s',
                  }} />
                </div>
                <span style={{ color: isPasswordStrong ? '#34d399' : '#f87171', fontWeight: 600 }}>
                  {isPasswordStrong ? 'Valid Length' : `${8 - form.password.length} more chars`}
                </span>
              </div>
            )}
          </div>

          <button
            id="btn-register"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.925rem', fontWeight: 600 }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                <span>Registering Account…</span>
              </>
            ) : (
              'Create Analyst Account'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.85rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#38bdf8', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
