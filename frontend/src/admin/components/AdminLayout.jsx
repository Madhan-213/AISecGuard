/**
 * AISecGuard — Admin Control Portal Layout
 * Distinctive cybersecurity administrative shell with privileged navigation,
 * system status telemetry pill, and "Back to Application" bridge.
 */

import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../context/ToastContext';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ScrollText,
  FileCheck2,
  AlertTriangle,
  History,
  Sliders,
  ShieldAlert,
  Cpu,
  Activity,
  Database,
  ArrowLeft,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

const ADMIN_NAV = [
  {
    category: 'OVERVIEW',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    category: 'USER MANAGEMENT',
    items: [
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck },
    ],
  },
  {
    category: 'AUDIT & MONITORING',
    items: [
      { path: '/admin/activity-logs', label: 'Activity Logs', icon: ScrollText },
      { path: '/admin/audit-reports', label: 'Audit Reports', icon: FileCheck2 },
      { path: '/admin/security-events', label: 'Security Events', icon: AlertTriangle },
      { path: '/admin/login-history', label: 'Login History', icon: History },
    ],
  },
  {
    category: 'SYSTEM CONTROL',
    items: [
      { path: '/admin/settings', label: 'App Settings', icon: Sliders },
      { path: '/admin/security-policies', label: 'Security Policies', icon: ShieldAlert },
      { path: '/admin/scan-configuration', label: 'Scan Configuration', icon: Cpu },
      { path: '/admin/system-health', label: 'System Health', icon: Activity },
      { path: '/admin/backups', label: 'Backups & Restore', icon: Database },
    ],
  },
];

function AdminNavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/admin/dashboard'}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.55rem 0.8rem',
        borderRadius: 8,
        fontSize: '0.82rem',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#ffffff' : 'var(--color-text-muted)',
        background: isActive
          ? 'linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)'
          : 'transparent',
        boxShadow: isActive ? '0 4px 14px rgba(220, 38, 38, 0.35)' : 'none',
        textDecoration: 'none',
        transition: 'all 0.18s ease',
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
          <Icon size={16} style={{ color: isActive ? '#ffffff' : 'var(--color-text-muted)', flexShrink: 0 }} />
          <span style={{ color: isActive ? '#ffffff' : 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout({ children }) {
  const { adminUser, logoutAdmin, isSuperAdmin } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logoutAdmin();
    toast.info('Admin session signed out.');
    navigate('/admin/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Mobile Backdrop */}
      {navOpen && <div className="app-sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      {/* Admin Sidebar */}
      <aside
        className={`app-sidebar ${navOpen ? 'app-sidebar--open' : ''} ${sidebarCollapsed ? 'app-sidebar--desktop-collapsed' : ''}`}
        style={{ borderRight: '1px solid rgba(220, 38, 38, 0.2)' }}
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.15rem 1.15rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.06) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #dc2626, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
              flexShrink: 0,
            }}>
              <Shield size={20} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em', color: 'var(--color-text)', lineHeight: 1.2 }}>
                AISecGuard
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem', background: 'rgba(220, 38, 38, 0.15)', borderRadius: 4, padding: '0.1rem 0.4rem', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>
                  Admin Portal
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.innerWidth <= 900) setNavOpen(false);
              else setSidebarCollapsed((v) => !v);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 4,
            }}
          >
            <span className="mobile-only"><X size={17} /></span>
            <span className="desktop-only"><PanelLeftClose size={16} /></span>
          </button>
        </div>

        {/* Navigation Sections */}
        <div style={{ padding: '0.85rem 0.65rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ADMIN_NAV.map((sec) => (
            <div key={sec.category}>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                padding: '0 0.75rem',
                marginBottom: '0.35rem',
              }}>
                {sec.category}
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.12rem' }}>
                {sec.items.map((item) => (
                  <AdminNavItem key={item.path} item={item} />
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Admin Footer & Back to App bridge */}
        <div style={{
          padding: '0.85rem 0.75rem',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-sidebar-footer-bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}>
          {/* User badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.8rem',
              color: '#fff',
              flexShrink: 0,
            }}>
              {(adminUser?.full_name || adminUser?.email || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {adminUser?.full_name || 'Admin'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.05rem 0.35rem',
                  borderRadius: 4,
                  background: isSuperAdmin ? 'rgba(239, 68, 68, 0.2)' : 'rgba(124, 58, 237, 0.2)',
                  color: isSuperAdmin ? '#ef4444' : '#a855f7',
                }}>
                  {adminUser?.role || 'ADMIN'}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {adminUser?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Back to User Application button */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.45rem',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-btn-ghost-bg)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Switch to User Portal"
          >
            <ArrowLeft size={13} />
            <span>Back to User App</span>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              fontSize: '0.75rem',
              padding: '0.45rem',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.25)',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={13} />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Administrative Viewport */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: '60px',
          minHeight: '60px',
          background: 'var(--color-topbar-bg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="app-menu-button"
              onClick={() => {
                if (window.innerWidth <= 900) setNavOpen((v) => !v);
                else setSidebarCollapsed((v) => !v);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
            >
              {navOpen ? <X size={18} /> : sidebarCollapsed ? <PanelLeftOpen size={18} /> : <Menu size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                Admin Control Portal
              </span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.1rem 0.45rem', borderRadius: 4, fontWeight: 700 }}>
                SYSTEM ONLINE
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Theme Toggle */}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={toggleTheme}
              style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-400" />}
            </button>

            {/* Quick App Link */}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/dashboard')}
              style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem' }}
            >
              <span>User App</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </header>

        {/* Content View */}
        <main className="app-main" style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
