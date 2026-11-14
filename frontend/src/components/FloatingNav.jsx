/**
 * AISecGuard — Premium Animated Floating Navigation
 *
 * Features:
 * - Hamburger button in top-left of the app shell
 * - Click expands into a floating glassmorphism vertical nav panel
 * - Staggered item entrance animations (Motion library)
 * - Hover: icon scale + subtle glow + animated label slide-in
 * - Active route: animated blue left-border bar indicator
 * - Collapse: panel folds back into a compact icon-only dock
 * - Click-outside to close
 * - Mobile: full-width slide-in overlay panel
 * - Supports dark theme (design tokens from index.css)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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

/* ── Navigation item definitions ──────────────────────────── */
const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, color: '#3B82F6' },
  { path: '/upload',       label: 'Upload & Scan', icon: UploadCloud,    color: '#10B981' },
  { path: '/scans',        label: 'Scan History', icon: History,         color: '#8B5CF6' },
  { path: '/quarantine',   label: 'Quarantine',   icon: ShieldAlert,     color: '#EF4444' },
  { path: '/supply-chain', label: 'Supply Chain', icon: GitBranch,       color: '#F59E0B' },
  { path: '/settings',     label: 'Settings',     icon: Settings,        color: '#06B6D4' },
];

/* ── Animation variants ────────────────────────────────────── */
const panelVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    x: -18,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.055,
      delayChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    x: -12,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

const itemVariants = {
  hidden:  { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, x: -8,  transition: { duration: 0.14 } },
};

const dockVariants = {
  hidden:  { opacity: 0, scale: 0.85, x: -10, transition: { duration: 0.15 } },
  visible: { opacity: 1, scale: 1,    x: 0,   transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.05 } },
  exit:    { opacity: 0, scale: 0.9,  x: -6,  transition: { duration: 0.14 } },
};

const dockItemVariants = {
  hidden:  { opacity: 0, scale: 0.7 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Individual Nav Item ───────────────────────────────────── */
function NavItem({ item, isActive, onClick, compact = false }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  if (compact) {
    // Dock mode: icon only + tooltip
    return (
      <motion.div variants={dockItemVariants} style={{ position: 'relative' }}>
        <NavLink
          to={item.path}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ textDecoration: 'none', display: 'block' }}
          title={item.label}
        >
          <motion.div
            animate={{
              scale: hovered ? 1.15 : 1,
              backgroundColor: isActive
                ? `${item.color}22`
                : hovered
                ? 'rgba(255,255,255,0.08)'
                : 'transparent',
            }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isActive ? `1.5px solid ${item.color}55` : '1.5px solid transparent',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <Icon
              size={18}
              style={{ color: isActive ? item.color : hovered ? '#e2e8f0' : '#64748b', transition: 'color 0.18s' }}
            />
            {/* Active dot */}
            {isActive && (
              <motion.div
                layoutId={`dock-active-${item.path}`}
                style={{
                  position: 'absolute',
                  right: -2,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: 14,
                  borderRadius: 2,
                  background: item.color,
                }}
              />
            )}
          </motion.div>
        </NavLink>

        {/* Tooltip label */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute',
                left: 'calc(100% + 10px)',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '0.3rem 0.65rem',
                whiteSpace: 'nowrap',
                fontSize: '0.78rem',
                fontWeight: 500,
                color: '#f1f5f9',
                pointerEvents: 'none',
                zIndex: 100,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              {item.label}
              <div
                style={{
                  position: 'absolute',
                  left: -5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderRight: '5px solid rgba(255,255,255,0.1)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Expanded panel mode
  return (
    <motion.div variants={itemVariants}>
      <NavLink
        to={item.path}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <motion.div
          animate={{
            backgroundColor: isActive
              ? `${item.color}18`
              : hovered
              ? 'rgba(255,255,255,0.055)'
              : 'transparent',
          }}
          transition={{ duration: 0.16 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.6rem 0.85rem',
            borderRadius: 10,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
          }}
        >
          {/* Icon with glow on active/hover */}
          <motion.div
            animate={{ scale: hovered ? 1.12 : 1 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive ? `${item.color}22` : 'rgba(255,255,255,0.05)',
              flexShrink: 0,
              boxShadow: isActive ? `0 0 10px ${item.color}44` : 'none',
              transition: 'background 0.18s, box-shadow 0.18s',
            }}
          >
            <Icon size={16} style={{ color: isActive ? item.color : hovered ? '#cbd5e1' : '#64748b', transition: 'color 0.18s' }} />
          </motion.div>

          {/* Label */}
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#f1f5f9' : hovered ? '#e2e8f0' : '#94a3b8',
              transition: 'color 0.16s',
              flex: 1,
            }}
          >
            {item.label}
          </span>

          {/* Active chevron */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              <ChevronRight size={14} style={{ color: item.color }} />
            </motion.div>
          )}
        </motion.div>
      </NavLink>
    </motion.div>
  );
}

/* ── Hamburger Icon ────────────────────────────────────────── */
function HamburgerIcon({ isOpen, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: isOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
        border: `1px solid ${isOpen ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: isOpen ? '#3B82F6' : '#94a3b8',
        transition: 'background 0.2s, border-color 0.2s, color 0.2s',
        outline: 'none',
        flexShrink: 0,
      }}
      aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
      aria-expanded={isOpen}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isOpen ? 'close' : 'menu'}
          initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0,   opacity: 1, scale: 1 }}
          exit={{    rotate:  30, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

/* ── Main FloatingNav Component ────────────────────────────── */
export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  // Determine active path
  const activePath = NAV_ITEMS.reduce((best, item) => {
    const isCurrent = location.pathname === item.path ||
      (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    const isBest = best && (location.pathname === best || (best !== '/dashboard' && location.pathname.startsWith(best)));
    return isCurrent && (!isBest || item.path.length > (best?.length || 0)) ? item.path : best;
  }, null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const closeNav = useCallback(() => setIsOpen(false), []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
    setIsOpen(false);
  }, [logout, navigate]);

  const userInitial = (user?.full_name || 'A')[0].toUpperCase();

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      {/* Hamburger trigger */}
      <div ref={triggerRef}>
        <HamburgerIcon isOpen={isOpen} onClick={() => setIsOpen(v => !v)} />
      </div>

      {/* ── Compact icon dock (when closed) ────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="dock"
            variants={dockVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '0.2rem',
              alignItems: 'center',
            }}
          >
            {NAV_ITEMS.map(item => (
              <NavItem
                key={item.path}
                item={item}
                isActive={activePath === item.path}
                onClick={closeNav}
                compact
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded floating panel ─────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeNav}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                zIndex: 998,
                display: 'none', // hidden on desktop
              }}
              className="mobile-nav-backdrop"
            />

            <motion.div
              key="panel"
              ref={panelRef}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                left: 0,
                zIndex: 999,
                width: 240,
                background: 'rgba(10, 15, 30, 0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset',
                overflow: 'hidden',
              }}
              role="navigation"
              aria-label="Main navigation"
            >
              {/* Panel header */}
              <div
                style={{
                  padding: '1rem 1rem 0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 14px rgba(37, 99, 235, 0.45)',
                  }}
                >
                  <Shield size={16} style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                    AISecGuard
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: 2 }}>
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'inline-block',
                        boxShadow: '0 0 6px #10b981',
                      }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                      v0.6.0 · Protected
                    </span>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <div style={{ padding: '0.65rem 0.6rem' }}>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#475569',
                    padding: '0 0.5rem 0.4rem',
                  }}
                >
                  Navigation
                </div>
                <motion.div
                  variants={{ visible: { transition: { staggerChildren: 0.055 } } }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}
                >
                  {NAV_ITEMS.map(item => (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={activePath === item.path}
                      onClick={closeNav}
                    />
                  ))}
                </motion.div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0.6rem' }} />

              {/* User / Logout footer */}
              <div style={{ padding: '0.65rem 0.6rem' }}>
                {/* User row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 10,
                    marginBottom: '0.3rem',
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0d9488, #2563eb)',
                      border: '1px solid #14b8a6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {userInitial}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
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
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2dd4bf' }} />
                      <span>Local Device Cache</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, fontSize: '0.72rem', padding: '0.32rem 0.5rem' }}
                    onClick={() => { deviceCache.exportCacheAsJson(); }}
                    title="Export device cache as JSON"
                  >
                    Backup
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, fontSize: '0.72rem', padding: '0.32rem 0.5rem', color: '#f87171' }}
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
                  <motion.button
                    className="btn btn-ghost"
                    whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#f87171' }}
                    style={{ flex: 1, fontSize: '0.72rem', padding: '0.32rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    onClick={handleLogout}
                    title="Sign out"
                  >
                    <LogOut size={12} />
                    <span>Out</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile styles injected via style tag ─────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-nav-backdrop {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

