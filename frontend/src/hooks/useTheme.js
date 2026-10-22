/**
 * AISecGuard — Homepage theme hook
 * Light/dark preference: stored choice, else the OS setting.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'aisecguard-theme';

function readInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage unavailable (private mode, SSR) — fall through
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(readInitialTheme);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const onChange = (e) => {
      let stored = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
      if (!stored) setTheme(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setFading(true);
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
    window.setTimeout(() => setFading(false), 350);
  }, []);

  return { theme, toggleTheme, fading };
}
