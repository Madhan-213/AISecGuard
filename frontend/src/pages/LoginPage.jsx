/**
 * AISecGuard — Clean SaaS Login Page
 * Enterprise AI Supply Chain Security authentication.
 * Preserves the animated CyberBackground via AuthLayout with a refined, clean form design.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import AuthField from '../components/auth/AuthField';
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
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

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
      title="Welcome back"
      subtitle="Sign in to access your security workspace and scan telemetry."
      icon="/logos/logo-icon.png"
    >
      {/* Registration Success Banner */}
      <AnimatePresence>
        {registeredSuccess && (
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
              background: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.08)',
              border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
              color: isDark ? '#34d399' : '#059669',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>Account created successfully. Please sign in to continue.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      <AnimatePresence>
        {(error || authError) && (
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
            <span>{error || authError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Login Form */}
      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="email"
          name="email"
          label="Work Email"
          type="email"
          icon={Mail}
          required
          autoFocus
          autoComplete="email"
          placeholder="analyst@organization.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          isDark={isDark}
        />

        <AuthField
          id="password"
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          isDark={isDark}
          isPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          rightLabel={
            <button
              type="button"
              onClick={() => setForgotModalOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#60a5fa' : '#4f7ef7',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Forgot password?
            </button>
          }
        />

        {/* Remember Workstation Checkbox */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.25rem',
            marginBottom: '1.35rem',
            fontSize: '0.8rem',
            color: isDark ? '#94a3b8' : '#64748b',
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: 15,
                height: 15,
                accentColor: isDark ? '#60a5fa' : '#4f7ef7',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            />
            <span>Remember this workstation</span>
          </label>
        </div>

        {/* Clean Primary Submit Button */}
        <button
          id="btn-login"
          type="submit"
          disabled={loading}
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
            opacity: loading ? 0.78 : 1,
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
              <span>Signing In…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
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
        New to AISecGuard?{' '}
        <Link
          to="/register"
          style={{
            color: isDark ? '#60a5fa' : '#4f7ef7',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Create a workspace
        </Link>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        theme={theme}
      />
    </AuthLayout>
  );
}
