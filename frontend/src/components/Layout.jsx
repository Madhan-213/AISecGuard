/**
 * AISecGuard — Modern SaaS Light Theme Layout
 * White sidebar, clean typography, soft shadows — matching modern SaaS reference.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../context/ToastContext';
import { notificationsApi, scansApi } from '../api/client';
import { deviceCache } from '../utils/deviceCache';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  ShieldAlert,
  Layers,
  FileText,
  GitBranch,
  AlertTriangle,
  Cpu,
  Database,
  Fingerprint,
  Bell,
  ScrollText,
  Sliders,
  Settings,
  Info,
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
  ArrowRight,
} from 'lucide-react';

const MAIN_MENU = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload & Scan', icon: UploadCloud },
  { path: '/scans', label: 'Scan History', icon: History },
  { path: '/quarantine', label: 'Quarantine', icon: ShieldAlert },
  { path: '/artifacts', label: 'Artifact Registry', icon: Layers },
  { path: '/reports', label: 'Security Reports', icon: FileText },
];

const SECURITY_ANALYSIS_MENU = [
  { path: '/supply-chain', label: 'Supply Chain', icon: GitBranch },
  { path: '/vulnerabilities', label: 'Vulnerability Analysis', icon: AlertTriangle },
  { path: '/models', label: 'Model Analysis', icon: Cpu },
  { path: '/datasets', label: 'Dataset Analysis', icon: Database },
  { path: '/integrity', label: 'Integrity & Provenance', icon: Fingerprint },
];

const MANAGEMENT_MENU = [
  { path: '/notifications', label: 'Notifications', icon: Bell, hasBadge: true },
  { path: '/activity-logs', label: 'Activity Logs', icon: ScrollText },
  { path: '/policies', label: 'Security Policies', icon: Sliders },
];

const SYSTEM_MENU = [
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/about', label: 'Help & About', icon: Info },
];

const SEARCHABLE_PAGES = [
  { path: '/dashboard', label: 'Dashboard Overview', category: 'Navigation', icon: LayoutDashboard, desc: 'High-level risk analytics and scan metrics' },
  { path: '/upload', label: 'Upload & Security Scan', category: 'Scan Engine', icon: UploadCloud, desc: 'Analyze AI models, weights, datasets, dependencies' },
  { path: '/scans', label: 'Scan History & Inventory', category: 'Scan Engine', icon: History, desc: 'Completed scan records, reports, and threat scores' },
  { path: '/quarantine', label: 'Quarantine & Isolation', category: 'Containment', icon: ShieldAlert, desc: 'Isolated high-risk artifacts blocked from deployment' },
  { path: '/artifacts', label: 'Artifact Registry', category: 'Assets', icon: Layers, desc: 'Inventory of uploaded AI models and training datasets' },
  { path: '/reports', label: 'Security Reports Hub', category: 'Auditing', icon: FileText, desc: 'Download PDF executive summaries and JSON data' },
  { path: '/supply-chain', label: 'Supply Chain & Lineage', category: 'Security Analysis', icon: GitBranch, desc: 'Ed25519 signatures, SBOM, and ML lineage' },
  { path: '/vulnerabilities', label: 'Vulnerability Analysis', category: 'Security Analysis', icon: AlertTriangle, desc: 'Threat detections, arbitrary code execution, CVEs' },
  { path: '/models', label: 'Model Analysis', category: 'Security Analysis', icon: Cpu, desc: 'Weights, tensors, and serialized compute graphs' },
  { path: '/datasets', label: 'Dataset Analysis', category: 'Security Analysis', icon: Database, desc: 'Poisoning checks, integrity, and label anomalies' },
  { path: '/integrity', label: 'Integrity & Provenance', category: 'Security Analysis', icon: Fingerprint, desc: 'Cryptographic SHA-256 baseline verification' },
  { path: '/notifications', label: 'Notifications & Alerts', category: 'Management', icon: Bell, desc: 'Real-time security alerts and scanner completion' },
  { path: '/activity-logs', label: 'Activity Audit Trail', category: 'Management', icon: ScrollText, desc: 'Immutable timeline of user actions and events' },
  { path: '/policies', label: 'Security Policies', category: 'Management', icon: Sliders, desc: 'Quarantine thresholds and rule blocklists' },
  { path: '/settings', label: 'System Settings', category: 'Configuration', icon: Settings, desc: 'API keys, environment config, and tokens' },
  { path: '/about', label: 'Help & Methodology', category: 'Documentation', icon: Info, desc: 'Architecture, scanner methodology, and docs' },
];

const KNOWN_RULES = [
  { id: 'MODEL-001', label: 'Arbitrary Code Execution (RCE)', desc: 'Pickle deserialization gadget / bytecode exploit', path: '/vulnerabilities' },
  { id: 'MODEL-002', label: 'Suspicious Callable References', desc: 'eval, exec, system call references inside serialized graph', path: '/vulnerabilities' },
  { id: 'DATA-001', label: 'Data Poisoning / Injection', desc: 'Outlier sample detection or malicious trigger phrases', path: '/datasets' },
  { id: 'DEP-001', label: 'Known Vulnerable Dependency (CVE)', desc: 'Vulnerable Python / PyTorch / TensorFlow dependency', path: '/vulnerabilities' },
  { id: 'INTEG-001', label: 'Cryptographic Integrity Mismatch', desc: 'SHA-256 hash does not match original ingestion digest', path: '/integrity' },
  { id: 'SUPPLY-001', label: 'Unsigned Artifact Warning', desc: 'Artifact lacks cryptographic Ed25519 signature', path: '/supply-chain' },
];

function getSearchRiskColor(riskLevel) {
  const r = (riskLevel || '').toUpperCase();
  if (r === 'CRITICAL') return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  if (r === 'HIGH') return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
  if (r === 'MEDIUM') return { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
  if (r === 'LOW') return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
  return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
}

function SectionLabel({ children, isCollapsed }) {
  if (isCollapsed) {
    return (
      <div
        style={{
          height: '1px',
          background: 'var(--color-border)',
          margin: '0.45rem 0.5rem',
          opacity: 0.6,
        }}
      />
    );
  }
  return (
    <div style={{
      fontSize: '0.68rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-text-muted)',
      padding: '0 0.75rem',
      marginBottom: '0.35rem',
      marginTop: '0.45rem',
      transition: 'opacity 0.2s ease',
    }}>
      {children}
    </div>
  );
}

function NavItem({ item, unreadCount, isCollapsed, onHoverItem, onLeaveItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/dashboard'}
      className={`nav-menu-item ${isCollapsed ? 'nav-menu-item--collapsed' : ''}`}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: isCollapsed ? 0 : '0.65rem',
        padding: isCollapsed ? '0.55rem 0' : '0.55rem 0.8rem',
        width: isCollapsed ? '44px' : '100%',
        height: isCollapsed ? '42px' : 'auto',
        margin: isCollapsed ? '0.1rem auto' : '0',
        borderRadius: 10,
        fontSize: '0.82rem',
        fontWeight: isActive ? 600 : 500,
        color: isActive ? '#ffffff' : 'var(--color-text-muted)',
        background: isActive
          ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
          : 'transparent',
        boxShadow: isActive ? '0 4px 14px rgba(124, 58, 237, 0.35)' : 'none',
        textDecoration: 'none',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
      })}
      onMouseEnter={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = isCollapsed
            ? 'rgba(124, 58, 237, 0.12)'
            : 'var(--color-btn-ghost-bg)';
          e.currentTarget.style.color = isCollapsed
            ? 'var(--color-primary)'
            : 'var(--color-text)';
        }
        if (isCollapsed && onHoverItem) {
          onHoverItem(item, e);
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }
        if (isCollapsed && onLeaveItem) {
          onLeaveItem();
        }
      }}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={isCollapsed ? 18 : 16}
            style={{
              color: isActive ? '#ffffff' : 'var(--color-text-muted)',
              flexShrink: 0,
              transition: 'transform 0.18s ease, color 0.18s ease',
            }}
            className="nav-item-icon"
          />
          {!isCollapsed && (
            <span style={{
              color: isActive ? '#ffffff' : 'var(--color-text)',
              fontWeight: isActive ? 600 : 500,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s ease',
            }}>
              {item.label}
            </span>
          )}
          {item.hasBadge && unreadCount > 0 && (
            isCollapsed ? (
              <span
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 0 2px var(--color-sidebar-bg)',
                }}
              />
            ) : (
              <span style={{
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: 10,
                minWidth: 16,
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {unreadCount}
              </span>
            )
          )}
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

  // Live notifications count badge & dropdown popup state
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationDropdownRef = useRef(null);

  const fetchRecentNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await notificationsApi.list();
      if (res.data?.unread_count !== undefined) {
        setUnreadCount(res.data.unread_count);
      }
      if (res.data?.notifications) {
        setRecentNotifications(res.data.notifications.slice(0, 4));
      }
    } catch {
      // silent
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationBellClick = (e) => {
    e.stopPropagation();
    if (notificationOpen) {
      // 2nd click on bell -> direct to notification page
      setNotificationOpen(false);
      navigate('/notifications');
    } else {
      // 1st click -> show popup with recent 3 to 4 notifications
      setNotificationOpen(true);
      fetchRecentNotifications();
    }
  };

  const handleNotificationBellDoubleClick = (e) => {
    e.stopPropagation();
    // Double click -> direct to notification page
    setNotificationOpen(false);
    navigate('/notifications');
  };

  const handleNotificationItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await notificationsApi.markAsRead(item.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // silent
      }
    }
    setNotificationOpen(false);
    if (item.link) {
      navigate(item.link);
    } else {
      navigate('/notifications');
    }
  };

  const handleDropdownMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silent
    }
  };

  const getNotificationTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffSec = Math.floor((now - date) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getNotificationSeverityIcon = (sev) => {
    const s = (sev || '').toUpperCase();
    if (s === 'CRITICAL') return <ShieldAlert size={15} style={{ color: '#ef4444', flexShrink: 0 }} />;
    if (s === 'WARNING' || s === 'HIGH') return <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />;
    if (s === 'SUCCESS') return <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />;
    return <Info size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />;
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(e.target)
      ) {
        setNotificationOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotificationOpen(false);
      }
    };
    if (notificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationOpen]);

  useEffect(() => {
    setNotificationOpen(false);
  }, [location.pathname]);

  // Floating tooltip popup state for collapsed sidebar
  const [hoveredNav, setHoveredNav] = useState(null);

  const handleHoverItem = (item, e) => {
    if (!sidebarCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredNav({
      label: item.label,
      path: item.path,
      top: rect.top + rect.height / 2,
      left: rect.right + 12,
      unreadCount: item.hasBadge ? unreadCount : 0,
    });
  };

  const handleLeaveItem = () => {
    setHoveredNav(null);
  };

  useEffect(() => {
    setHoveredNav(null);
  }, [location.pathname, sidebarCollapsed]);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const res = await notificationsApi.list();
        if (mounted) {
          if (res.data?.unread_count !== undefined) {
            setUnreadCount(res.data.unread_count);
          }
          if (res.data?.notifications) {
            setRecentNotifications(res.data.notifications.slice(0, 4));
          }
        }
      } catch {
        // silent
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Global Topbar Search state & handlers
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cachedScans, setCachedScans] = useState(() => {
    try {
      return deviceCache.getScans() || [];
    } catch {
      return [];
    }
  });

  // Pre-fetch recent scans for live instant searching
  useEffect(() => {
    let active = true;
    scansApi.list({ limit: 50 })
      .then((res) => {
        if (active && res.data?.scans) {
          setCachedScans(res.data.scans);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [location.pathname]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut '/' or 'Ctrl+K' / 'Cmd+K' to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Filtered search results
  const query = searchQuery.trim().toLowerCase();

  const filteredPages = useMemo(() => {
    if (!query) return SEARCHABLE_PAGES.slice(0, 5);
    return SEARCHABLE_PAGES.filter(p =>
      p.label.toLowerCase().includes(query) ||
      p.desc.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [query]);

  const filteredScans = useMemo(() => {
    if (!query) return cachedScans.slice(0, 4);
    return cachedScans.filter(s => {
      const filename = s.artifact?.original_filename?.toLowerCase() || '';
      const sha = s.artifact?.sha256?.toLowerCase() || '';
      const risk = s.risk_level?.toLowerCase() || '';
      const id = s.id?.toLowerCase() || '';
      return filename.includes(query) || sha.includes(query) || risk.includes(query) || id.includes(query);
    }).slice(0, 5);
  }, [cachedScans, query]);

  const filteredRules = useMemo(() => {
    if (!query) return [];
    return KNOWN_RULES.filter(r =>
      r.id.toLowerCase().includes(query) ||
      r.label.toLowerCase().includes(query) ||
      r.desc.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [query]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!query) return;

      // 1. Direct scan match jump
      if (filteredScans.length > 0) {
        navigate(`/scans/${filteredScans[0].id}`);
        setSearchOpen(false);
        setSearchQuery('');
        return;
      }

      // 2. Direct page match jump
      if (filteredPages.length > 0) {
        navigate(filteredPages[0].path);
        setSearchOpen(false);
        setSearchQuery('');
        return;
      }

      // 3. Direct rule match jump
      if (filteredRules.length > 0) {
        navigate(filteredRules[0].path);
        setSearchOpen(false);
        setSearchQuery('');
        return;
      }

      // 4. Default: filter scans page
      navigate(`/scans?search=${encodeURIComponent(query)}`);
      setSearchOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

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
          padding: sidebarCollapsed ? '1rem 0.4rem' : '1.25rem 1.25rem 1.1rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          gap: '0.5rem',
          transition: 'all 0.25s ease',
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              minWidth: 0,
              overflow: 'hidden',
              cursor: sidebarCollapsed ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (sidebarCollapsed) toggleSidebar();
            }}
            onMouseEnter={(e) => {
              if (sidebarCollapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredNav({
                  label: 'AISecGuard (Click to expand)',
                  top: rect.top + rect.height / 2,
                  left: rect.right + 12,
                });
              }
            }}
            onMouseLeave={() => {
              if (sidebarCollapsed) setHoveredNav(null);
            }}
          >
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
                transition: 'transform 0.18s ease',
              }}
            />
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--color-text)', lineHeight: 1.2 }}>
                  AISecGuard
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem', background: 'var(--color-primary-light)', borderRadius: 4, padding: '0.1rem 0.4rem' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="pulse-glow" />
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 600 }}>v0.6.0</span>
                </div>
              </div>
            )}
          </div>

          {/* Toggle sidebar button inside sidebar header (only when expanded) */}
          {!sidebarCollapsed && (
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
          )}
        </div>

        {/* Navigation Section */}
        <div style={{
          padding: sidebarCollapsed ? '0.75rem 0.35rem' : '0.85rem 0.65rem',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: sidebarCollapsed ? '0.45rem' : '0.9rem',
          transition: 'all 0.25s ease',
        }}>

          {/* MAIN MENU */}
          <div>
            <SectionLabel isCollapsed={sidebarCollapsed}>Main Menu</SectionLabel>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: sidebarCollapsed ? '0.2rem' : '0.12rem' }}>
              {MAIN_MENU.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  unreadCount={unreadCount}
                  isCollapsed={sidebarCollapsed}
                  onHoverItem={handleHoverItem}
                  onLeaveItem={handleLeaveItem}
                />
              ))}
            </nav>
          </div>

          {/* SECURITY ANALYSIS */}
          <div>
            <SectionLabel isCollapsed={sidebarCollapsed}>Security Analysis</SectionLabel>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: sidebarCollapsed ? '0.2rem' : '0.12rem' }}>
              {SECURITY_ANALYSIS_MENU.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  unreadCount={unreadCount}
                  isCollapsed={sidebarCollapsed}
                  onHoverItem={handleHoverItem}
                  onLeaveItem={handleLeaveItem}
                />
              ))}
            </nav>
          </div>

          {/* MANAGEMENT */}
          <div>
            <SectionLabel isCollapsed={sidebarCollapsed}>Management</SectionLabel>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: sidebarCollapsed ? '0.2rem' : '0.12rem' }}>
              {MANAGEMENT_MENU.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  unreadCount={unreadCount}
                  isCollapsed={sidebarCollapsed}
                  onHoverItem={handleHoverItem}
                  onLeaveItem={handleLeaveItem}
                />
              ))}
            </nav>
          </div>

          {/* SYSTEM */}
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <SectionLabel isCollapsed={sidebarCollapsed}>System</SectionLabel>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: sidebarCollapsed ? '0.2rem' : '0.12rem' }}>
              {SYSTEM_MENU.map(item => (
                <NavItem
                  key={item.path}
                  item={item}
                  unreadCount={unreadCount}
                  isCollapsed={sidebarCollapsed}
                  onHoverItem={handleHoverItem}
                  onLeaveItem={handleLeaveItem}
                />
              ))}
            </nav>
          </div>
        </div>

        {/* User Profile Footer */}
        <div style={{
          padding: sidebarCollapsed ? '0.75rem 0.35rem' : '0.85rem 0.75rem',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-sidebar-footer-bg)',
          transition: 'all 0.25s ease',
        }}>
          {/* Avatar + name + email */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: '0.6rem',
              marginBottom: '0.75rem',
            }}
            onMouseEnter={(e) => {
              if (sidebarCollapsed) {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredNav({
                  label: `${user?.full_name || 'Security Analyst'} (${user?.role || 'ANALYST'})`,
                  top: rect.top + rect.height / 2,
                  left: rect.right + 12,
                });
              }
            }}
            onMouseLeave={() => {
              if (sidebarCollapsed) setHoveredNav(null);
            }}
          >
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
              cursor: sidebarCollapsed ? 'pointer' : 'default',
            }}>
              {(user?.full_name || user?.email || 'A')[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
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
            )}
          </div>

          {/* Logout Button */}
          {sidebarCollapsed ? (
            <button
              type="button"
              className="btn btn-ghost nav-menu-item"
              style={{
                width: 44,
                height: 42,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                background: 'rgba(239, 68, 68, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={handleLogout}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                e.currentTarget.style.borderColor = '#ef4444';
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredNav({
                  label: 'Sign out',
                  top: rect.top + rect.height / 2,
                  left: rect.right + 12,
                  isDanger: true,
                });
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                setHoveredNav(null);
              }}
            >
              <LogOut size={16} />
            </button>
          ) : (
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
          )}
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
              title={sidebarCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu to icons"}
              aria-label={sidebarCollapsed ? "Expand navigation menu" : "Collapse navigation menu"}
            >
              {navOpen ? (
                <X size={18} />
              ) : sidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
            <span className="mobile-brand" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)', display: 'none', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/logos/logo-icon.png" alt="AISecGuard" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
              <span>AISecGuard</span>
            </span>
          </div>

          {/* Center: Search Bar with Live Results Dropdown */}
          <div
            ref={searchContainerRef}
            className="topbar-search-container"
            style={{ flex: 1, maxWidth: 460, position: 'relative' }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  color: isSearchFocused ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  pointerEvents: 'none',
                  flexShrink: 0,
                  transition: 'color 0.15s ease',
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search scans, artifacts, CVEs, or jump to page..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setSearchOpen(true);
                }}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={handleSearchKeyDown}
                style={{
                  width: '100%',
                  paddingLeft: '2.35rem',
                  paddingRight: searchQuery ? '4.5rem' : '2.4rem',
                  paddingTop: '0.45rem',
                  paddingBottom: '0.45rem',
                  fontSize: '0.84rem',
                  background: isSearchFocused ? 'var(--color-surface-card)' : 'var(--color-btn-ghost-bg)',
                  border: isSearchFocused
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                  borderRadius: 9,
                  color: 'var(--color-text)',
                  outline: 'none',
                  boxShadow: isSearchFocused ? '0 0 0 3px rgba(124, 58, 237, 0.18)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              />

              {/* Clear button (X) when query is typed */}
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '2.2rem',
                    background: 'none',
                    border: 'none',
                    padding: '0.2rem',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}

              {/* Keyboard shortcut hint */}
              <span style={{
                position: 'absolute',
                right: '0.75rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                background: 'var(--color-border)',
                padding: '0.1rem 0.38rem',
                borderRadius: 4,
                lineHeight: 1.2,
                pointerEvents: 'none',
              }}>
                /
              </span>
            </div>

            {/* Live Search Results Dropdown Menu */}
            {searchOpen && (
              <div
                className="search-results-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  boxShadow: '0 18px 40px -4px rgba(0, 0, 0, 0.45), 0 0 15px rgba(124, 58, 237, 0.15)',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  zIndex: 10000,
                  padding: '0.5rem 0',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {/* Pages Group */}
                {filteredPages.length > 0 && (
                  <div style={{ marginBottom: '0.4rem' }}>
                    <div style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--color-text-muted)',
                      padding: '0.35rem 0.85rem 0.2rem',
                    }}>
                      {query ? 'Matching Views & Pages' : 'Quick Navigation'}
                    </div>
                    {filteredPages.map(page => {
                      const PageIcon = page.icon;
                      return (
                        <div
                          key={page.path}
                          onClick={() => {
                            navigate(page.path);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          style={{
                            padding: '0.55rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          className="search-dropdown-item"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-btn-ghost-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <PageIcon size={14} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>
                              {page.label}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {page.desc}
                            </div>
                          </div>
                          <ArrowRight size={13} style={{ color: 'var(--color-text-muted)', opacity: 0.6 }} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Scans & Evaluated Artifacts Group */}
                {filteredScans.length > 0 && (
                  <div style={{ marginBottom: '0.4rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.4rem' }}>
                    <div style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--color-text-muted)',
                      padding: '0.35rem 0.85rem 0.2rem',
                    }}>
                      Scans & Evaluated Artifacts
                    </div>
                    {filteredScans.map(scan => {
                      const risk = getSearchRiskColor(scan.risk_level);
                      const filename = scan.artifact?.original_filename || `Scan #${scan.id.slice(0, 8)}`;
                      const dateStr = scan.completed_at ? new Date(scan.completed_at).toLocaleDateString() : 'Recent';
                      return (
                        <div
                          key={scan.id}
                          onClick={() => {
                            navigate(`/scans/${scan.id}`);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          style={{
                            padding: '0.55rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.65rem',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          className="search-dropdown-item"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-btn-ghost-bg)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                            <FileText size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {filename}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                {scan.artifact?.artifact_type || 'MODEL'} • {dateStr}
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.12rem 0.45rem',
                              borderRadius: 4,
                              color: risk.color,
                              background: risk.bg,
                              flexShrink: 0,
                            }}
                          >
                            {scan.risk_level || 'CLEAN'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Detection Rules Group */}
                {filteredRules.length > 0 && (
                  <div style={{ marginBottom: '0.4rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.4rem' }}>
                    <div style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--color-text-muted)',
                      padding: '0.35rem 0.85rem 0.2rem',
                    }}>
                      Detection Rules & Threats
                    </div>
                    {filteredRules.map(rule => (
                      <div
                        key={rule.id}
                        onClick={() => {
                          navigate(rule.path);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        style={{
                          padding: '0.55rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        className="search-dropdown-item"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--color-btn-ghost-bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                              {rule.id}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)' }}>
                              {rule.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rule.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Action Footer */}
                <div
                  onClick={() => {
                    navigate(`/scans?search=${encodeURIComponent(query)}`);
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-sidebar-footer-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.85';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Search size={13} />
                    <span>
                      {query ? `Search all scans for "${query}"` : 'Browse all scans in Scan History'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    Press ↵
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: notifications + theme toggle + New Scan button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Notification bell with dropdown popup */}
            <div ref={notificationDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-ghost"
                title={`Notifications (${unreadCount} unread) — Click to view recent, double-click to open page`}
                style={{
                  padding: '0.45rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  position: 'relative',
                  backgroundColor: notificationOpen ? 'var(--color-bg-hover, rgba(0,0,0,0.06))' : 'transparent',
                }}
                onClick={handleNotificationBellClick}
                onDoubleClick={handleNotificationBellDoubleClick}
              >
                <Bell size={17} style={{ color: notificationOpen ? 'var(--color-primary, #6366f1)' : 'var(--color-text-muted)' }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    minWidth: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 6px #ef4444',
                  }} />
                )}
              </button>

              {/* Recent Notifications Dropdown Popup */}
              {notificationOpen && (
                <div
                  className="notification-dropdown-popup"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 360,
                    maxWidth: 'calc(100vw - 32px)',
                    backgroundColor: 'var(--color-surface, #ffffff)',
                    border: '1px solid var(--color-border, #e2e8f0)',
                    boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    zIndex: 1050,
                    animation: 'dropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                >
                  {/* Popup Header */}
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--color-border, #e2e8f0)',
                      backgroundColor: 'var(--color-table-header-bg, rgba(0,0,0,0.02))',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bell size={15} style={{ color: 'var(--color-primary, #6366f1)' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span
                          className="badge badge-critical"
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.45rem',
                            fontWeight: 700,
                            borderRadius: 999,
                          }}
                        >
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleDropdownMarkAllRead}
                        className="btn btn-ghost"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          height: 'auto',
                          color: 'var(--color-primary, #6366f1)',
                          fontWeight: 600,
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Popup Notification List (Recent 3 to 4) */}
                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {loadingNotifications && recentNotifications.length === 0 ? (
                      <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        <span className="spinner" style={{ width: 18, height: 18, margin: '0 auto 0.5rem' }} />
                        <div>Loading recent alerts...</div>
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <Bell size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text)' }}>No recent notifications</div>
                        <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', margin: 0 }}>All clear! You are caught up with security alerts.</p>
                      </div>
                    ) : (
                      recentNotifications.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationItemClick(item)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--color-border, #e2e8f0)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            backgroundColor: item.is_read
                              ? 'transparent'
                              : 'var(--color-table-header-bg, rgba(99, 102, 241, 0.05))',
                            transition: 'background-color 0.15s ease',
                          }}
                          className="table-row-hover"
                        >
                          <div style={{ marginTop: 2 }}>
                            {getNotificationSeverityIcon(item.severity)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <span
                                style={{
                                  fontWeight: item.is_read ? 600 : 700,
                                  fontSize: '0.82rem',
                                  color: 'var(--color-text)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.title}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                {getNotificationTime(item.created_at)}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                margin: '0.2rem 0 0',
                                lineHeight: 1.4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {item.message}
                            </p>
                          </div>
                          {!item.is_read && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: '#ef4444',
                                flexShrink: 0,
                                marginTop: 6,
                              }}
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Popup Footer */}
                  <div
                    style={{
                      padding: '0.65rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--color-border, #e2e8f0)',
                      backgroundColor: 'var(--color-table-header-bg, rgba(0,0,0,0.02))',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Double-click bell to open
                    </span>
                    <button
                      type="button"
                      className="link-primary"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate('/notifications');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: 'var(--color-primary, #6366f1)',
                      }}
                    >
                      <span>View all notifications</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

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

      {/* Floating Hover Tooltip Popup for Mini Sidebar */}
      {sidebarCollapsed && hoveredNav && (
        <div
          className="sidebar-floating-tooltip"
          style={{
            position: 'fixed',
            top: hoveredNav.top,
            left: hoveredNav.left,
            transform: 'translateY(-50%)',
            borderColor: hoveredNav.isDanger ? 'rgba(239, 68, 68, 0.45)' : undefined,
          }}
        >
          <span style={{ color: hoveredNav.isDanger ? '#ef4444' : 'inherit' }}>
            {hoveredNav.label}
          </span>
          {hoveredNav.unreadCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: 10,
                marginLeft: '0.35rem',
              }}
            >
              {hoveredNav.unreadCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
