/**
 * AISecGuard — Homepage navigation bar
 * Brand, section links, live API status, theme toggle and auth actions.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Menu, Moon, Shield, Sun, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const NAV_LINKS = [
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Scanners', id: 'scanners' },
  { label: 'Risk scoring', id: 'risk' },
  { label: 'Sample report', id: 'demo' },
  { label: 'FAQ', id: 'faq' },
];

/** Polls GET /health once on mount so visitors can see whether the backend is reachable. */
function useApiStatus() {
  const [status, setStatus] = useState({ state: 'checking', version: null });
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    fetch(`${API_BASE}/health`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => setStatus({ state: data?.status === 'ok' ? 'online' : 'offline', version: data?.version ?? null }))
      .catch(() => setStatus({ state: 'offline', version: null }))
      .finally(() => window.clearTimeout(timer));
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);
  return status;
}

function ApiStatusPill() {
  const { state, version } = useApiStatus();
  const styles = {
    checking: { dot: 'bg-hp-faint', text: 'Checking API' },
    online: { dot: 'bg-hp-low', text: version ? `API online · v${version}` : 'API online' },
    offline: { dot: 'bg-hp-crit', text: 'API offline' },
  }[state];
  return (
    <span
      className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-hp-line bg-hp-surface text-[11px] font-medium text-hp-muted"
      role="status"
      title={state === 'offline' ? 'The backend /health endpoint did not respond' : undefined}
    >
      <span className="relative flex w-2 h-2">
        {state === 'online' && <span className={`absolute inset-0 rounded-full ${styles.dot} opacity-60 animate-ping`} />}
        <span className={`relative w-2 h-2 rounded-full ${styles.dot}`} />
      </span>
      {styles.text}
    </span>
  );
}

export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className="relative w-9 h-9 inline-flex items-center justify-center rounded-lg border border-hp-line bg-hp-surface text-hp-muted hover:text-hp-fg hover:border-hp-line-strong transition-colors cursor-pointer overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -14, opacity: 0, rotate: -60 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 14, opacity: 0, rotate: 60 }}
          transition={{ duration: 0.22 }}
          className="inline-flex"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export default function HomeNav({ user, theme, onToggleTheme, onStart, onNavigate, onScrollTo }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => {
    setOpen(false);
    onScrollTo(id);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled || open
          ? 'bg-hp-bg/85 backdrop-blur-xl border-b border-hp-line shadow-[var(--hp-shadow)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            aria-label="AISecGuard home"
          >
            <img
              src="/logos/logo-icon.png"
              alt="AISecGuard"
              className="w-8 h-8 rounded-lg shadow-sm shrink-0 object-contain"
            />
            <span className="flex flex-col leading-none text-left">
              <span className="text-[15px] font-bold tracking-tight text-hp-fg">AISecGuard</span>
              <span className="hidden sm:block text-[10px] font-medium uppercase tracking-wider whitespace-nowrap text-hp-faint">AI Supply Chain Security</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Sections">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => go(link.id)}
                className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-hp-muted hover:text-hp-fg hover:bg-hp-inset transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ApiStatusPill />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  <span className="hidden 2xl:inline text-xs font-medium text-hp-muted truncate max-w-[140px]">
                    {user.full_name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/dashboard')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-hp-accent hover:bg-hp-accent-strong text-hp-on-accent text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Dashboard <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('/login')}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-hp-muted hover:text-hp-fg hover:bg-hp-inset transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    id="nav-start-scanning"
                    onClick={onStart}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-hp-accent hover:bg-hp-accent-strong text-hp-on-accent text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Start Scanning <ArrowRight size={14} />
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-lg border border-hp-line bg-hp-surface text-hp-muted hover:text-hp-fg cursor-pointer"
              aria-label="Toggle navigation"
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden overflow-hidden border-t border-hp-line"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => go(link.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-hp-muted hover:text-hp-fg hover:bg-hp-inset cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <div className="sm:hidden pt-3 mt-2 border-t border-hp-line flex flex-col gap-2">
                {user ? (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onNavigate('/dashboard'); }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-hp-accent text-hp-on-accent text-sm font-semibold cursor-pointer"
                  >
                    Go to Dashboard <ArrowRight size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); onNavigate('/login'); }}
                      className="w-full px-4 py-2.5 rounded-lg border border-hp-line text-sm font-medium text-hp-fg cursor-pointer"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); onStart(); }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-hp-accent text-hp-on-accent text-sm font-semibold cursor-pointer"
                    >
                      Start Scanning <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
