/**
 * AISecGuard — Premium Vertical Sidebar Layout
 *
 * Design:
 * - Fixed left sidebar (260px) with rich dark glass theme
 * - Animated nav items using Motion library
 * - Active route: glowing accent bar + background highlight
 * - Collapsible sidebar on mobile (hamburger in top bar)
 * - Slim top bar with status badge + New Scan CTA
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  ShieldAlert,
  GitBranch,
  Settings,
  LogOut,
  Shield,
  CheckCircle2,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deviceCache } from '../utils/deviceCache';

/* ── Nav items ──────────────────────────────────────────────── */
const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, accent: '#3B82F6' },
  { path: '/upload',       label: 'Upload & Scan', icon: UploadCloud,    accent: '#10B981' },
  { path: '/scans',        label: 'Scan History', icon: History,         accent: '#8B5CF6' },
  { path: '/quarantine',   label: 'Quarantine',   icon: ShieldAlert,     accent: '#EF4444' },
  { path: '/supply-chain', label: 'Supply Chain', icon: GitBranch,       accent: '#F59E0B' },
  { path: '/settings',     label: 'Settings',     icon: Settings,        accent: '#06B6D4' },
];

/* ── Sidebar nav item ──────────────────────────────────────── */
function SidebarNavItem({ item, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const lit = isActive || hovered;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ textDecoration: 'none', display: 'block', position: 'relative' }}
    >
      {/* Active bar indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-bar"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: '60%',
            borderRadius: 2,
            background: item.accent,
            boxShadow: `0 0 8px ${item.accent}99`,
          }}
        />
      )}

      <motion.div
        animate={{
          backgroundColor: isActive
            ? `${item.accent}14`
            : hovered
            ? 'rgba(255,255,255,0.045)'
            : 'transparent',
        }}
        transition={{ duration: 0.15 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 0.9rem 0.6rem 1rem',
          borderRadius: 10,
          cursor: 'pointer',
          margin: '0 0.5rem',
        }}
      >
        {/* Icon container */}
        <motion.div
          animate={{ scale: hovered ? 1.1 : 1 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isActive ? `${item.accent}20` : hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
            flexShrink: 0,
            boxShadow: isActive ? `0 0 12px ${item.accent}44` : 'none',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
        >
          <Icon
            size={16}
            style={{
              color: isActive ? item.accent : hovered ? '#e2e8f0' : '#64748b',
              transition: 'color 0.15s',
            }}
          />
        </motion.div>

        {/* Label */}
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? '#f1f5f9' : hovered ? '#e2e8f0' : '#94a3b8',
            transition: 'color 0.15s',
            flex: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </span>

        {/* Chevron on active */}
        <AnimatePresence>
          {lit && (
            <motion.div
              key="chevron"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.14 }}
            >
              <ChevronRight
                size={14}
                style={{ color: isActive ? item.accent : '#475569', flexShrink: 0 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </NavLink>
  );
}

/* ── Sidebar content (shared between desktop & mobile) ─────── */
function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine best active path
  const activePath = NAV_ITEMS.reduce((best, item) => {
    const hit = location.pathname === item.path ||
      (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    if (!hit) return best;
    return !best || item.path.length > best.length ? item.path : best;
  }, null);

  const userInitial = (user?.full_name || 'A')[0].toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
    onNavigate?.();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(180deg, #0d1526 0%, #0a1020 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Brand header ───────────────────────────────────── */}
      <div
        style={{
          padding: '1.35rem 1.25rem 1.1rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 18px rgba(37,99,235,0.45), 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          <Shield size={18} style={{ color: '#fff' }} />
        </div>

        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.025em',
              color: '#f8fafc',
              lineHeight: 1.2,
            }}
          >
            AISecGuard
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: 2 }}>
            <span
              className="pulse-glow"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
              v0.6.0 · Protected
            </span>
          </div>
        </div>
      </div>

      {/* ── Navigation section ──────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem 0' }}>
        <div
          style={{
            fontSize: '0.63rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#3b4a60',
            padding: '0 1.5rem 0.5rem',
          }}
        >
          Navigation
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.path}
              item={item}
              isActive={activePath === item.path}
              onClick={onNavigate}
            />
          ))}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '1rem 1.25rem' }} />

        {/* Quick links */}
        <div
          style={{
            fontSize: '0.63rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#3b4a60',
            padding: '0 1.5rem 0.5rem',
          }}
        >
          Quick Links
        </div>

        <div style={{ padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          {[
            { label: 'Homepage', path: '/' },
            { label: 'API Docs',  href: '/api/docs' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href || link.path}
              target={link.href ? '_blank' : undefined}
              rel={link.href ? 'noopener noreferrer' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                fontSize: '0.825rem',
                color: '#64748b',
                textDecoration: 'none',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{link.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── User profile footer ─────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '1rem 1rem 1.1rem',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488, #2563eb)',
              border: '1.5px solid rgba(20,184,166,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.78rem',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#f1f5f9',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.full_name || 'Security Analyst'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2dd4bf', flexShrink: 0 }} />
              <span>Local Device Cache</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.7rem', padding: '0.32rem 0.4rem' }}
            onClick={() => deviceCache.exportCacheAsJson()}
            title="Export device cache"
          >
            Backup
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.7rem', padding: '0.32rem 0.4rem', color: '#f87171' }}
            onClick={() => {
              if (window.confirm('Reset local cache to baseline?')) {
                deviceCache.resetToBaseline();
                window.location.reload();
              }
            }}
            title="Reset cache"
          >
            Reset
          </button>
          <button
            className="btn btn-ghost"
            style={{
              fontSize: '0.7rem',
              padding: '0.32rem 0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              color: '#94a3b8',
            }}
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut size={12} />
            <span>Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Layout root ────────────────────────────────────────────── */
export default function Layout({ children }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const overlayRef = useRef(null);

  // Close mobile menu on route change
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    function handler(e) {
      if (overlayRef.current && e.target === overlayRef.current) closeMenu();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen, closeMenu]);

  // Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    function handler(e) { if (e.key === 'Escape') closeMenu(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen, closeMenu]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-bg)',
      }}
    >
      {/* ════════════════════════════════════════════
          DESKTOP SIDEBAR — fixed left column
      ════════════════════════════════════════════ */}
      <aside
        className="desktop-sidebar"
        style={{
          width: 258,
          minWidth: 258,
          height: '100vh',
          position: 'relative',
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        <SidebarContent onNavigate={closeMenu} />
      </aside>

      {/* ════════════════════════════════════════════
          MOBILE SIDEBAR — slide-in overlay
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              ref={overlayRef}
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 998,
              }}
            />

            {/* Slide-in panel */}
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: 258,
                height: '100vh',
                zIndex: 999,
              }}
            >
              <SidebarContent onNavigate={closeMenu} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          MAIN CONTENT AREA
      ════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── Top bar ──────────────────────────────── */}
        <header
          style={{
            height: 56,
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            background: 'rgba(10,15,30,0.80)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            zIndex: 30,
            gap: '1rem',
          }}
        >
          {/* Left: mobile hamburger + page breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Mobile hamburger */}
            <motion.button
              className="mobile-menu-btn"
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(v => !v)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                outline: 'none',
              }}
              aria-label="Toggle navigation"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mobileOpen ? 'x' : 'menu'}
                  initial={{ rotate: -20, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 20, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {mobileOpen ? <X size={16} /> : <Menu size={16} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Platform status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={13} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 500 }}>
                AISecGuard · Active Protection
              </span>
            </div>
          </div>

          {/* Right: New Scan CTA */}
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.78rem', padding: '0.38rem 0.9rem', gap: '0.4rem' }}
            onClick={() => navigate('/upload')}
          >
            <UploadCloud size={14} />
            <span>New Scan</span>
          </button>
        </header>

        {/* ── Page content ─────────────────────────── */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

      {/* ── Responsive: hide desktop sidebar on mobile ─── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .desktop-sidebar { display: block !important; }
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
