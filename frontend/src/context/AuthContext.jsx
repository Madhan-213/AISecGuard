/**
 * AISecGuard — Authentication Context
 * Week 6: Provides JWT auth state to the entire app.
 * Supports NO_LOGIN_REQUIRED mode (backend standalone mode).
 *
 * - Reads access/refresh tokens from localStorage
 * - Exposes user, login, logout helpers via useAuth() hook
 * - In standalone mode (NO_LOGIN_REQUIRED=true on backend), auto-creates
 *   a guest analyst session so the dashboard is accessible without login
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

// Guest user shown when backend is in no-login-required mode
const GUEST_USER = {
  id: 'guest',
  email: 'analyst@aisecguard.local',
  full_name: 'Security Analyst',
  is_active: true,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session from stored token, or use guest mode
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi.me()
        .then(res => setUser(res.data))
        .catch(() => {
          // Token expired/invalid — clear and fall through to guest mode
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(GUEST_USER); // Standalone guest mode
        })
        .finally(() => setLoading(false));
    } else {
      // No token — operate as guest analyst (standalone mode)
      setUser(GUEST_USER);
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    // Fetch user profile
    const me = await authApi.me();
    setUser(me.data);
    return me.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(GUEST_USER); // Revert to guest instead of null
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
