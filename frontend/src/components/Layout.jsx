/**
 * AISecGuard — Premium Sidebar Navigation Layout
 * Clean alignments, Lucide icons, live status indicator, dynamic theme switcher, and responsive structure.
 */

import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/ToastContext';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  ShieldAlert,
  GitBranch,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { deviceCache } from '../utils/deviceCache';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload & Scan', icon: UploadCloud },
  { path: '/scans', label: 'Scan History', icon: History },
  { path: '/quarantine', label: 'Quarantine', icon: ShieldAlert },
  { path: '/supply-chain', label: 'Supply Chain', icon: GitBranch },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setNavOpen(false);
  }

  const handleLogout = () => {
    logout();
    toast.info('Signed out successfully.');
    navigate('/');
  };

  const handleBackup = () => {
    try {
      deviceCache.exportCacheAsJson();
      toast.success('Local device cache memory backed up as JSON.');
    } catch {
      toast.error('Failed to export cache backup.');
    }
  };

  const handleResetCache = () => {
    if (window.confirm('Reset local cache back to clean state?')) {
      deviceCache.resetToBaseline();
      toast.info('Local cache reset to clean baseline.');
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Mobile drawer backdrop */}
      {navOpen && <div className="app-sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      {/* Sidebar (off-canvas drawer below 900px) */}
      <aside className={`app-sidebar ${navOpen ? 'app-sidebar--open' : ''}`} style={{
        width: '260px',
        minWidth: '260px',
        background: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}>
        {/* Brand / Logo Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
              color: '#ffffff',
            }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
                AISecGuard
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.125rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="pulse-glow" />
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>v0.6.0 · Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '1.25rem 0.875rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', padding: '0 0.75rem 0.5rem' }}>
            Navigation
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.875rem',
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    background: isActive ? (theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)') : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                      <span style={{ color: isActive ? (theme === 'dark' ? '#ffffff' : 'var(--color-primary)') : 'var(--color-text)' }}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div style={{ marginTop: '2rem', padding: '0 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
            Quick Links
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <NavLink
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.875rem',
                borderRadius: 8,
                fontSize: '0.825rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-card-subtle-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span>Public Homepage</span>
              </span>
              <ExternalLink size={14} style={{ color: 'var(--color-text-muted)' }} />
            </NavLink>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.875rem',
                borderRadius: 8,
                fontSize: '0.825rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-card-subtle-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Terminal size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span>Swagger Docs</span>
              </span>
              <ExternalLink size={14} style={{ color: 'var(--color-text-muted)' }} />
            </a>
          </div>
        </div>

        {/* User / Local Cache Profile Footer */}
        <div style={{
          padding: '1.25rem 1rem',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-sidebar-footer-bg)',
          transition: 'background-color 0.2s ease',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488, #2563eb)',
                border: '1px solid #14b8a6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#ffffff',
              }}>
                {(user?.full_name || 'A')[0].toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'Security Analyst'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0d9488', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0d9488' }} />
                  <span>Local Device Cache</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifySelf: 'stretch' }}
                onClick={handleBackup}
                title="Download JSON copy of device cache memory"
              >
                Backup
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', color: '#f87171', justifySelf: 'stretch' }}
                onClick={handleResetCache}
                title="Reset cache memory"
              >
                Reset
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', color: 'var(--color-text-muted)', justifySelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut size={12} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: '60px',
          minHeight: '60px',
          background: 'var(--color-topbar-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          gap: '0.75rem',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }} className="app-topbar">
          <button
            type="button"
            className="app-menu-button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={navOpen}
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="app-topbar-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Platform:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-primary)', fontWeight: 500 }}>
              <CheckCircle2 size={15} style={{ color: '#10b981' }} />
              AISecGuard v0.6.0 · Active Protection
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* System-wide Light / Dark Theme Toggle Button */}
            <button
              id="btn-theme-toggle"
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

            <button
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              onClick={() => navigate('/upload')}
            >
              <UploadCloud size={15} />
              <span>New Scan</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="app-main" style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)', transition: 'background-color 0.2s ease' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
