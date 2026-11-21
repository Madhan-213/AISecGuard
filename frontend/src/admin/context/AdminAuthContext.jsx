/**
 * AISecGuard — Admin Authentication Context
 * Manages privileged administrative sessions, token storage, and role verification.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { adminAuthApi, adminErrorMessage } from '../api/adminClient';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem('admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const isRoleAdmin = (user) => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'SUPER_ADMIN' || r === 'ADMIN' || user.is_admin === true;
  };

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('admin_access_token');
      if (!token) {
        setAdminUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await adminAuthApi.me();
        const user = res.data;
        if (isRoleAdmin(user)) {
          setAdminUser(user);
          localStorage.setItem('admin_user', JSON.stringify(user));
        } else {
          logoutAdmin();
        }
      } catch {
        logoutAdmin();
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const loginAdmin = async (email, password) => {
    try {
      const res = await adminAuthApi.login(email, password);
      const { access_token } = res.data;
      localStorage.setItem('admin_access_token', access_token);

      // Verify user profile & role
      const meRes = await adminAuthApi.me();
      const user = meRes.data;

      if (!isRoleAdmin(user)) {
        logoutAdmin();
        throw new Error('Access denied: Account lacks administrative privileges.');
      }

      setAdminUser(user);
      localStorage.setItem('admin_user', JSON.stringify(user));
      return { success: true, user };
    } catch (err) {
      throw err;
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
  };

  const value = {
    adminUser,
    isAdminAuthenticated: !!adminUser && isRoleAdmin(adminUser),
    isSuperAdmin: (adminUser?.role || '').toUpperCase() === 'SUPER_ADMIN',
    loading,
    loginAdmin,
    logoutAdmin,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
}
