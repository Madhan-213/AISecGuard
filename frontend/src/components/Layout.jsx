/**
 * AISecGuard — Modern SaaS Light Theme Layout
 * White sidebar, clean typography, soft shadows — matching modern SaaS reference.
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
  Sun,
  Moon,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
} from 'lucide-react';

const MAIN_MENU = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload & Scan', icon: UploadCloud },
  { path: '/scans', label: 'Scan History', icon: History },
  { path: '/quarantine', label: 'Quarantine', icon: ShieldAlert },
];

const TOOLS_MENU = [
  { path: '/supply-chain', label: 'Supply Chain', icon: GitBranch },
];

const SYSTEM_MENU = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.68rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--color-text-muted)',
      padding: '0 0.75rem',
      marginBottom: '0.35rem',
      marginTop: '0.25rem',
    }}>
      {children}
    </div>
  );
}

function NavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/dashboard'}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        padding: '0.6rem 0.85rem',
        borderRadius: 10,
        fontSize: '0.85rem',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#ffffff' : 'var(--color-text-muted)',
        background: isActive
          ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
          : 'transparent',
        boxShadow: isActive ? '0 4px 14px rgba(124, 58, 237, 0.35)' : 'none',
        textDecoration: 'none',
        transition: 'all 0.18s ease',
        position: 'relative',
      })}
      onMouseEnter={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'var(--color-btn-ghost-bg)';
          e.currentTarget.style.color = 'var(--color-text)';
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }
      }}
    >
      {({ isActive }) => (
        <>
          <Icon size={17} style={{ color: isActive ? '#ffffff' : 'var(--color-text-muted)', flexShrink: 0 }} />
          <span style={{ color: isActive ? '#ffffff' : 'var(--color-text)', fontWeight: isActive ? 600 : 500 }}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('aisecguard-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aisecguard-sidebar-collapsed', String(next));
      } catch {
        // storage disabled
      }
      return next;
    });
  };

  // Close the mobile drawer whenever the route changes.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    setNavOpen(false);
  }

  const handleLogout = () => {
    logout();
    toast.info('Signed out successfully.');
    navigate('/login');
  };

  const roleBg = user?.role === 'ADMIN'
    ? { bg: '#EDE9FE', color: '#7C3AED' }
    : user?.role === 'AUDITOR'
    ? { bg: '#D1FAE5', color: '#059669' }
    : { bg: '#DBEAFE', color: '#2563EB' };

  const avatarGradient = user?.role === 'ADMIN'
    ? 'linear-gradient(135deg, #7c3aed, #2563eb)'
    : user?.role === 'AUDITOR'
    ? 'linear-gradient(135deg, #059669, #0d9488)'
    : 'linear-gradient(135deg, #2563eb, #0284c7)';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Mobile drawer backdrop */}
      {navOpen && <div className="app-sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${navOpen ? 'app-sidebar--open' : ''} ${sidebarCollapsed ? 'app-sidebar--desktop-collapsed' : ''}`}
      >

        {/* Brand / Logo Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1.1rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, overflow: 'hidden' }}>
            <img
              src="/logos/logo-icon.png"
              alt="AISecGuard"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                objectFit: 'contain',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(79, 126, 247, 0.3)',
              }}
            />
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--color-text)', lineHeight: 1.2 }}>
                AISecGuard
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem', background: 'var(--color-primary-light)', borderRadius: 4, padding: '0.1rem 0.4rem' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="pulse-glow" />
                <span style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 600 }}>v0.6.0</span>
              </div>
            </div>
          </div>

          {/* Toggle sidebar button inside sidebar header */}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth <= 900) {
                setNavOpen(false);
              } else {
                toggleSidebar();
              }
            }}
            title={navOpen ? "Close menu" : "Collapse menu"}
            aria-label="Toggle navigation"
            style={{
              background: 'var(--color-btn-ghost-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-primary)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.background = 'var(--color-btn-ghost-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'var(--color-btn-ghost-bg)';
            }}
          >
            <span className="mobile-only"><X size={17} /></span>
            <span className="desktop-only"><PanelLeftClose size={16} /></span>
          </button>
        </div>

        {/* Navigation Section */}
        <div style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* MAIN MENU */}
          <div>
            <SectionLabel>Main Menu</SectionLabel>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {MAIN_MENU.map(item => <NavItem key={item.path} item={item} theme={theme} />)}
            </nav>
          </div>

          {/* TOOLS */}
          <div>
            <SectionLabel>Tools</SectionLabel>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {TOOLS_MENU.map(item => <NavItem key={item.path} item={item} theme={theme} />)}
            </nav>
          </div>

          {/* SYSTEM */}
          <div style={{ marginTop: 'auto' }}>
            <SectionLabel>System</SectionLabel>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {SYSTEM_MENU.map(item => <NavItem key={item.path} item={item} theme={theme} />)}
            </nav>
          </div>
        </div>

        {/* User Profile Footer */}
        <div style={{
          padding: '0.85rem 0.75rem',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-sidebar-footer-bg)',
          transition: 'background-color 0.2s ease',
        }}>
          {/* Avatar + name + email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: avatarGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.82rem',
              color: '#ffffff',
              flexShrink: 0,
            }}>
              {(user?.full_name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name || 'Security Analyst'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem', overflow: 'hidden' }}>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '0.1rem 0.35rem',
                  borderRadius: 4,
                  background: roleBg.bg,
                  color: roleBg.color,
                  flexShrink: 0,
                }}>
                  {user?.role || 'ANALYST'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.is_guest ? 'Guest' : (user?.email || 'User')}
                </span>
              </div>
            </div>
          </div>

          {/* Only Logout Button */}
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontSize: '0.78rem',
              padding: '0.45rem 0.6rem',
              borderRadius: 8,
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-btn-ghost-bg)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={handleLogout}
            title="Sign out of AISecGuard"
            onMouseEnter={e => {
              e.currentTarget.style.color = '#EF4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'var(--color-btn-ghost-bg)';
            }}
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: '60px',
          minHeight: '60px',
          background: 'var(--color-topbar-bg)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: '0 1px 0 var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          gap: '1rem',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }} className="app-topbar">

          {/* Left: Menu toggle button & mobile brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="app-menu-button"
              onClick={() => {
                if (window.innerWidth <= 900) {
                  setNavOpen((v) => !v);
                } else {
                  toggleSidebar();
                }
              }}
              title={sidebarCollapsed ? "Show menu" : "Hide menu to expand dashboard"}
              aria-label={sidebarCollapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            >
              {navOpen ? (
                <X size={18} />
              ) : sidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <Menu size={18} />
              )}
            </button>
            <span className="mobile-brand" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)', display: 'none', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/logos/logo-icon.png" alt="AISecGuard" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
              <span>AISecGuard</span>
            </span>
            {sidebarCollapsed && (
              <span className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.4rem' }}>
                <img src="/logos/logo-icon.png" alt="AISecGuard" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>AISecGuard</span>
              </span>
            )}
          </div>

          {/* Center: search bar (hidden on mobile) */}
          <div className="topbar-search-container" style={{ flex: 1, maxWidth: 440 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} style={{
                position: 'absolute',
                left: '0.85rem',
                color: 'var(--color-text-muted)',
                pointerEvents: 'none',
                flexShrink: 0,
              }} />
              <input
                type="text"
                placeholder="Search scans, artifacts, CVEs..."
                readOnly
                style={{
                  width: '100%',
                  paddingLeft: '2.35rem',
                  paddingRight: '2.25rem',
                  paddingTop: '0.45rem',
                  paddingBottom: '0.45rem',
                  fontSize: '0.85rem',
                  background: 'var(--color-btn-ghost-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                  outline: 'none',
                  cursor: 'default',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              />
              <span style={{
                position: 'absolute',
                right: '0.75rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                background: 'var(--color-border)',
                padding: '0.1rem 0.35rem',
                borderRadius: 4,
                lineHeight: 1.2,
                pointerEvents: 'none',
              }}>
                /
              </span>
            </div>
          </div>

          {/* Right: notifications + theme toggle + New Scan button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Notification bell */}
            <button
              type="button"
              className="btn btn-ghost"
              title="Notifications (System active)"
              style={{
                padding: '0.45rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                width: 36,
                height: 36,
                position: 'relative',
              }}
              onClick={() => toast.info('System notification: All scanners operational.')}
            >
              <Bell size={17} style={{ color: 'var(--color-text-muted)' }} />
              <span style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#8b5cf6',
                boxShadow: '0 0 6px #8b5cf6',
              }} />
            </button>

            {/* Theme toggle — icon-only, clean */}
            <button
              id="btn-theme-toggle"
              type="button"
              className="btn btn-ghost"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
              style={{
                padding: '0.45rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                width: 36,
                height: 36,
              }}
            >
              {theme === 'dark'
                ? <Sun size={17} style={{ color: '#FBBF24' }} />
                : <Moon size={17} style={{ color: '#6366F1' }} />
              }
            </button>

            <button
              className="btn btn-primary"
              style={{
                fontSize: '0.82rem',
                padding: '0.45rem 0.95rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                border: 'none',
                color: '#ffffff',
                borderRadius: 8,
              }}
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
