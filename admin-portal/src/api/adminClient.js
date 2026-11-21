/**
 * AISecGuard — Admin API Client
 * Dedicated HTTP client for administrative API operations with Bearer token interceptor.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const adminApiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: attach admin token
adminApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_access_token') || localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: handle 401/403
adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login?session_expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export const adminAuthApi = {
  login: (email, password) =>
    adminApiClient.post('/api/v1/auth/admin-login', { email, password }),
  me: () => adminApiClient.get('/api/v1/auth/me'),
};

export const adminDashboardApi = {
  get: (days = 14) => adminApiClient.get('/api/v1/admin/dashboard', { params: { days } }),
};

export const adminUsersApi = {
  list: (params) => adminApiClient.get('/api/v1/admin/users', { params }),
  get: (id) => adminApiClient.get(`/api/v1/admin/users/${id}`),
  updateStatus: (id, is_active) => adminApiClient.patch(`/api/v1/admin/users/${id}/status`, { is_active }),
  updateRole: (id, role) => adminApiClient.patch(`/api/v1/admin/users/${id}/role`, { role }),
  delete: (id) => adminApiClient.delete(`/api/v1/admin/users/${id}`),
};

export const adminRolesApi = {
  get: () => adminApiClient.get('/api/v1/admin/roles'),
};

export const adminAuditApi = {
  logs: (params) => adminApiClient.get('/api/v1/activity-logs/', { params }),
  exportUrl: (format = 'csv') => `${API_BASE}/api/v1/admin/audit-reports/export?format=${format}`,
  downloadExport: async (format = 'csv') => {
    const res = await adminApiClient.get('/api/v1/admin/audit-reports/export', {
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json',
    });
    const blob = format === 'csv' ? res.data : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aisecguard_audit_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

export const adminSecurityApi = {
  loginHistory: (params) => adminApiClient.get('/api/v1/admin/login-history', { params }),
  events: (params) => adminApiClient.get('/api/v1/admin/security-events', { params }),
  reportEvent: (data) => adminApiClient.post('/api/v1/admin/security-events', data),
};

export const adminSettingsApi = {
  list: () => adminApiClient.get('/api/v1/admin/settings'),
  update: (key, value) => adminApiClient.put(`/api/v1/admin/settings/${key}`, { value }),
};

export const adminPoliciesApi = {
  list: () => adminApiClient.get('/api/v1/policies/'),
  update: (id, data) => adminApiClient.put(`/api/v1/policies/${id}`, data),
};

export const adminHealthApi = {
  get: () => adminApiClient.get('/api/v1/admin/system-health'),
};

export const adminBackupsApi = {
  list: () => adminApiClient.get('/api/v1/admin/backups'),
  create: () => adminApiClient.post('/api/v1/admin/backups'),
  restore: (id) => adminApiClient.post(`/api/v1/admin/backups/${id}/restore`),
};

export function adminErrorMessage(error, fallback = 'Operation failed.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ');
  return error?.message || fallback;
}
