/**
 * AISecGuard — Standalone Admin Control Portal Router
 * Dedicated routing tree for administrative control portal.
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AdminLayout from './components/AdminLayout';

// Admin Control Portal Pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminRolesPage from './pages/AdminRolesPage';
import AdminActivityLogsPage from './pages/AdminActivityLogsPage';
import AdminAuditReportsPage from './pages/AdminAuditReportsPage';
import AdminSecurityEventsPage from './pages/AdminSecurityEventsPage';
import AdminLoginHistoryPage from './pages/AdminLoginHistoryPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminSecurityPoliciesPage from './pages/AdminSecurityPoliciesPage';
import AdminScanConfigPage from './pages/AdminScanConfigPage';
import AdminSystemHealthPage from './pages/AdminSystemHealthPage';
import AdminBackupsPage from './pages/AdminBackupsPage';

function AdminShell({ children }) {
  const { loading, isAdminAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', background: '#0b1120', color: '#94a3b8' }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <span style={{ fontSize: '0.85rem' }}>Verifying administrative security credentials…</span>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AdminAuthProvider>
            <Routes>
              {/* Public Admin Login */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/login" element={<Navigate to="/admin/login" replace />} />
              <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Protected Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminShell><AdminDashboardPage /></AdminShell>} />
              <Route path="/admin/users" element={<AdminShell><AdminUsersPage /></AdminShell>} />
              <Route path="/admin/roles" element={<AdminShell><AdminRolesPage /></AdminShell>} />
              <Route path="/admin/activity-logs" element={<AdminShell><AdminActivityLogsPage /></AdminShell>} />
              <Route path="/admin/audit-reports" element={<AdminShell><AdminAuditReportsPage /></AdminShell>} />
              <Route path="/admin/security-events" element={<AdminShell><AdminSecurityEventsPage /></AdminShell>} />
              <Route path="/admin/login-history" element={<AdminShell><AdminLoginHistoryPage /></AdminShell>} />
              <Route path="/admin/settings" element={<AdminShell><AdminSettingsPage /></AdminShell>} />
              <Route path="/admin/security-policies" element={<AdminShell><AdminSecurityPoliciesPage /></AdminShell>} />
              <Route path="/admin/scan-configuration" element={<AdminShell><AdminScanConfigPage /></AdminShell>} />
              <Route path="/admin/system-health" element={<AdminShell><AdminSystemHealthPage /></AdminShell>} />
              <Route path="/admin/backups" element={<AdminShell><AdminBackupsPage /></AdminShell>} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AdminAuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
