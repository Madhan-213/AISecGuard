/**
 * AISecGuard — Authentication & Authorization Context
 * Real JWT authentication, user session persistence, and isolated workspace management.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '../api/client';
import { deviceCache } from '../utils/deviceCache';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore authenticated session from localStorage on startup
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (token) {
      authApi.me()
        .then((res) => {
          setUser(res.data);
          deviceCache.setCurrentUser(res.data);
        })
        .catch(() => {
          // Token is expired or invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
          deviceCache.setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      deviceCache.setCurrentUser(null);
      setLoading(false);
    }
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const res = await authApi.login(email, password);
      const { access_token, refresh_token } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Fetch user profile from backend
      const meRes = await authApi.me();
      setUser(meRes.data);
      deviceCache.setCurrentUser(meRes.data);
      return meRes.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please verify credentials.';
      setAuthError(msg);
      throw err;
    }
  }, []);

  /**
   * Register a new user account with complete access
   */
  const register = useCallback(async (email, password, full_name) => {
    setAuthError(null);
    try {
      // New users get standard analyst role with full complete access
      const res = await authApi.register(email, password, full_name, 'ANALYST');
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please check your inputs.';
      setAuthError(msg);
      throw err;
    }
  }, []);

  /**
   * Sign out and clear stored tokens & user cache
   */
  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    deviceCache.setCurrentUser(null);
    setUser(null);
  }, []);

  const role = user?.role || 'ANALYST';
  const isAdmin = Boolean(user?.is_admin || user?.role === 'ADMIN');
  const isAuthenticated = Boolean(user);

  const value = useMemo(() => ({
    user,
    loading,
    authError,
    isAuthenticated,
    role,
    isAdmin,
    login,
    register,
    logout,
  }), [
    user,
    loading,
    authError,
    isAuthenticated,
    role,
    isAdmin,
    login,
    register,
    logout,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
