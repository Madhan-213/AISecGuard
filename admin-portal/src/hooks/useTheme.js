/**
 * AISecGuard — Theme Hook
 * Seamlessly interfaces with ThemeContext for global light/dark theme synchronization.
 */

import { useState, useCallback } from 'react';
import { useThemeContext } from '../context/ThemeContext';

export function useTheme() {
  const { theme, toggleTheme: ctxToggleTheme, setTheme, isDark } = useThemeContext();
  const [fading, setFading] = useState(false);

  const toggleTheme = useCallback(() => {
    setFading(true);
    ctxToggleTheme();
    window.setTimeout(() => setFading(false), 300);
  }, [ctxToggleTheme]);

  return { theme, toggleTheme, setTheme, isDark, fading };
}
