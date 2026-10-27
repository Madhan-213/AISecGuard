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
  register: (email, password, full_name) =>
    apiClient.post('/api/v1/auth/register', { email, password, full_name }),
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
};

// --- Scans ---
export const scansApi = {
  list: (params) => apiClient.get('/api/v1/scans/', { params }),
  get: (id) => apiClient.get(`/api/v1/scans/${id}`),
  create: (artifact_id) => apiClient.post('/api/v1/scans/', { artifact_id }),
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
  lineage: (artifactId) => apiClient.get(`/api/v1/artifacts/${artifactId}/lineage`),
  link: (parent_id, child_id, relation, note) =>
    apiClient.post('/api/v1/lineage', { parent_id, child_id, relation, note: note || null }),
  unlink: (edgeId) => apiClient.delete(`/api/v1/lineage/${edgeId}`),
  compliance: (artifactId) => apiClient.get(`/api/v1/artifacts/${artifactId}/compliance`),
  mlbom: (artifactId) => apiClient.get(`/api/v1/artifacts/${artifactId}/mlbom`),
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
