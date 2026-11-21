/**
 * AISecGuard — Axios API Client
 * Week 5: Configured with base URL, JWT Bearer interceptor, and token refresh logic.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach access token ---
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: handle 401 (token expired) ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          original.headers['Authorization'] = `Bearer ${access_token}`;
          return apiClient(original);
        } catch {
          // Refresh failed — clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth helpers ---
export const authApi = {
  register: (email, password, full_name, role) =>
    apiClient.post('/api/v1/auth/register', { email, password, full_name, role }),
  login: (email, password) =>
    apiClient.post('/api/v1/auth/login', { email, password }),
  me: () => apiClient.get('/api/v1/auth/me'),
};

// --- Artifacts ---
export const artifactsApi = {
  list: (params) => apiClient.get('/api/v1/artifacts/', { params }),
  get: (id) => apiClient.get(`/api/v1/artifacts/${id}`),
  upload: (formData) =>
    apiClient.post('/api/v1/artifacts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  quarantine: (id, reason) =>
    apiClient.post(`/api/v1/artifacts/${id}/quarantine`, { reason }),
  release: (id, reason) =>
    apiClient.post(`/api/v1/artifacts/${id}/release`, { reason }),
  events: (id) => apiClient.get(`/api/v1/artifacts/${id}/events`),
  delete: (id) => apiClient.delete(`/api/v1/artifacts/${id}`),
};

// --- Scans ---
export const scansApi = {
  list: (params) => apiClient.get('/api/v1/scans/', { params }),
  get: (id) => apiClient.get(`/api/v1/scans/${id}`),
  create: (artifact_id) => apiClient.post('/api/v1/scans/', { artifact_id }),
  delete: (id, deleteFile = true) =>
    apiClient.delete(`/api/v1/scans/${id}`, { params: { delete_file: deleteFile } }),
  scanModel: (formData) =>
    apiClient.post('/api/v1/scans/model', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  scanDataset: (formData) =>
    apiClient.post('/api/v1/scans/dataset', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  scanDependency: (formData) =>
    apiClient.post('/api/v1/scans/dependency', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  reportUrl: (id, format = 'json') =>
    `${API_BASE}/api/v1/scans/${id}/report?format=${format}`,
};

// --- Findings ---
export const findingsApi = {
  list: (params) => apiClient.get('/api/v1/findings/', { params }),
  get: (id) => apiClient.get(`/api/v1/findings/${id}`),
};

// --- Stats (dashboard aggregate) ---
export const statsApi = {
  get: () => apiClient.get('/api/v1/stats/'),
};

// --- Supply chain: signing, lineage, ML-BOM, compliance, audit (Week 8) ---
export const supplyChainApi = {
  sign: (artifactId) => apiClient.post(`/api/v1/artifacts/${artifactId}/sign`),
  signature: (artifactId) => apiClient.get(`/api/v1/artifacts/${artifactId}/signature`),
  publicKey: () => apiClient.get('/api/v1/signing/public-key'),
  keys: () => apiClient.get('/api/v1/signing/keys'),
  rotateKey: () => apiClient.post('/api/v1/signing/rotate'),
  lineage: (artifactId) => apiClient.get(`/api/v1/artifacts/${artifactId}/lineage`),
  link: (parent_id, child_id, relation, note) =>
    apiClient.post('/api/v1/lineage', { parent_id, child_id, relation, note: note || null }),
  unlink: (edgeId) => apiClient.delete(`/api/v1/lineage/${edgeId}`),
  compliance: (artifactId) => apiClient.get(`/api/v1/artifacts/${artifactId}/compliance`),
  mlbom: (artifactId, spec_version = '1.5') =>
    apiClient.get(`/api/v1/artifacts/${artifactId}/mlbom`, { params: { spec_version } }),
  modelCard: (artifactId) =>
    apiClient.get(`/api/v1/artifacts/${artifactId}/model-card`, { responseType: 'text' }),
  verifyAudit: () => apiClient.get('/api/v1/audit/verify'),
};

/** Human-readable message from an API error. */
export function apiErrorMessage(error, fallback = 'Request failed.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ');
  return error?.message || fallback;
}

// --- System info, data export, API keys (Week 9) ---
export const systemApi = {
  info: () => apiClient.get('/api/v1/system/info'),
};

export const exportsApi = {
  /** Download all findings (latest scan per artifact) as a CSV or JSON file. */
  downloadFindings: async (format = 'csv', params = {}) => {
    const res = await apiClient.get('/api/v1/exports/findings', {
      params: { format, ...params },
      responseType: format === 'csv' ? 'blob' : 'json',
    });
    const blob = format === 'csv' ? res.data : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aisecguard-findings-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

export const apiKeysApi = {
  list: () => apiClient.get('/api/v1/api-keys'),
  create: (name) => apiClient.post('/api/v1/api-keys', { name }),
  revoke: (id) => apiClient.delete(`/api/v1/api-keys/${id}`),
};

// --- Activity Logs ---
export const activityLogsApi = {
  list: (params) => apiClient.get('/api/v1/activity-logs/', { params }),
  create: (data) => apiClient.post('/api/v1/activity-logs/', data),
};

// --- Security Policies ---
export const policiesApi = {
  list: () => apiClient.get('/api/v1/policies/'),
  update: (id, data) => apiClient.put(`/api/v1/policies/${id}`, data),
};

// --- Notifications ---
export const notificationsApi = {
  list: () => apiClient.get('/api/v1/notifications/'),
  markAsRead: (id) => apiClient.patch(`/api/v1/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post('/api/v1/notifications/read-all'),
  delete: (id) => apiClient.delete(`/api/v1/notifications/${id}`),
};

// --- Security Reports ---
export const reportsApi = {
  list: (params) => apiClient.get('/api/v1/reports/', { params }),
  get: (scanId, format = 'json') =>
    apiClient.get(`/api/v1/scans/${scanId}/report`, {
      params: { format },
      responseType: format === 'pdf' ? 'blob' : 'json',
    }),
};

// --- Cryptographic Integrity & Provenance ---
export const integrityApi = {
  overview: () => apiClient.get('/api/v1/integrity/overview'),
};

/** Where the browser reaches the API: VITE_API_BASE_URL, or this site's own origin. */
export const API_ORIGIN = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
