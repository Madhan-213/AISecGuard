/**
 * AISecGuard — Premium Sidebar Navigation Layout
 * Clean alignments, Lucide icons, live status indicator, and responsive structure.
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  ShieldAlert,
  LogOut,
  Shield,
  CheckCircle2,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { deviceCache } from '../utils/deviceCache';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload & Scan', icon: UploadCloud },
  { path: '/scans', label: 'Scan History', icon: History },
  { path: '/quarantine', label: 'Quarantine', icon: ShieldAlert },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        minWidth: '260px',
        background: 'rgba(15, 23, 42, 0.98)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
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
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                AISecGuard
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.125rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="pulse-glow" />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>v0.5.0 · Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '1.25rem 0.875rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', padding: '0 0.75rem 0.5rem' }}>
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
                    color: isActive ? '#ffffff' : '#94a3b8',
                    background: isActive ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.2), rgba(37, 99, 235, 0.05))' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} style={{ color: isActive ? '#60a5fa' : '#64748b' }} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div style={{ marginTop: '2rem', padding: '0 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
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
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={16} style={{ color: '#64748b' }} />
                <span>Public Homepage</span>
              </span>
              <ExternalLink size={14} style={{ color: '#64748b' }} />
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
                color: '#94a3b8',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Terminal size={16} style={{ color: '#64748b' }} />
                <span>Swagger Docs</span>
              </span>
              <ExternalLink size={14} style={{ color: '#64748b' }} />
            </a>
          </div>
        </div>

        {/* User / Local Cache Profile Footer */}
        <div style={{
          padding: '1.25rem 1rem',
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(10, 15, 30, 0.6)',
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
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'Security Analyst'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2dd4bf' }} />
                  <span>Local Device Cache</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifySelf: 'stretch' }}
                onClick={() => deviceCache.exportCacheAsJson()}
                title="Download JSON copy of device cache memory"
              >
                Backup
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', color: '#f87171', justifySelf: 'stretch' }}
                onClick={() => {
                  if (window.confirm('Reset local cache back to clean state?')) {
                    deviceCache.resetToBaseline();
                    window.location.reload();
                  }
                }}
                title="Reset cache memory"
              >
                Reset
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', color: '#94a3b8', justifySelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: '60px',
          minHeight: '60px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>Platform:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontWeight: 500 }}>
              <CheckCircle2 size={15} style={{ color: '#10b981' }} />
              AISecGuard v0.6.0 · Active Protection
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
