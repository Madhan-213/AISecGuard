/**
 * AISecGuard — Admin Control Portal Login
 * Distinct administrative authentication interface for authorized administrators only.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Terminal,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminErrorMessage } from '../api/adminClient';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { loginAdmin } = useAdminAuth();

  const [email, setEmail] = useState('admin@aisecguard.local');
  const [password, setPassword] = useState('AdminPassword@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginAdmin(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(adminErrorMessage(err, 'Authentication failed. Please verify administrator credentials.'));
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
      background: 'radial-gradient(circle at 50% 20%, #1e1035 0%, #080c16 80%)',
      padding: '1.5rem',
      position: 'relative',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Background glow and grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(220, 38, 38, 0.35)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(220, 38, 38, 0.15)',
        borderRadius: 20,
        padding: '2.5rem 2rem',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Top Restricted Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            padding: '0.25rem 0.75rem',
            borderRadius: 20,
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#ef4444',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
            <span>Restricted • Authorized Access Only</span>
          </div>
        </div>

        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(220, 38, 38, 0.45)',
          }}>
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Admin Control Portal
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.35rem 0 0' }}>
            AISecGuard Centralized Management & Telemetry
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            color: '#fca5a5',
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}>
            <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Administrator Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                  fontSize: '0.85rem',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  color: '#f8fafc',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ef4444')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Secret Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                  fontSize: '0.85rem',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  color: '#f8fafc',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ef4444')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              borderRadius: 10,
              fontSize: '0.88rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.45)',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Authenticating Administrative Session…' : 'Enter Admin Control Portal'}
          </button>
        </form>

        {/* Back Link */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <Link
            to="/"
            style={{
              fontSize: '0.78rem',
              color: '#94a3b8',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#f8fafc')}
            onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
          >
            <ArrowLeft size={13} />
            <span>Return to Public Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
