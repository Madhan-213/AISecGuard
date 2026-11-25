/**
 * AISecGuard — Root Application Router
 * Provides ThemeProvider, ToastProvider, AuthProvider, AdminAuthProvider,
 * protected user application shell, dedicated admin control portal shell,
 * public homepage, login/register, and route authorization.
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './admin/context/AdminAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import AdminLayout from './admin/components/AdminLayout';

// Public & User Portal Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ScansPage from './pages/ScansPage';
import ScanDetailPage from './pages/ScanDetailPage';
import QuarantinePage from './pages/QuarantinePage';
import SupplyChainPage from './pages/SupplyChainPage';
import SettingsPage from './pages/SettingsPage';
import ScanProgressPage from './pages/ScanProgressPage';
import ArtifactRegistryPage from './pages/ArtifactRegistryPage';
import ReportsPage from './pages/ReportsPage';
import VulnerabilitiesPage from './pages/VulnerabilitiesPage';
import ModelAnalysisPage from './pages/ModelAnalysisPage';
import DatasetAnalysisPage from './pages/DatasetAnalysisPage';
import IntegrityProvenancePage from './pages/IntegrityProvenancePage';
import NotificationsPage from './pages/NotificationsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SecurityPoliciesPage from './pages/SecurityPoliciesPage';
import AboutPage from './pages/AboutPage';

// Admin Control Portal Pages
import AdminLoginPage from './admin/pages/AdminLoginPage';
import AdminDashboardPage from './admin/pages/AdminDashboardPage';
import AdminUsersPage from './admin/pages/AdminUsersPage';
import AdminRolesPage from './admin/pages/AdminRolesPage';
import AdminActivityLogsPage from './admin/pages/AdminActivityLogsPage';
import AdminAuditReportsPage from './admin/pages/AdminAuditReportsPage';
import AdminSecurityEventsPage from './admin/pages/AdminSecurityEventsPage';
import AdminLoginHistoryPage from './admin/pages/AdminLoginHistoryPage';
import AdminSettingsPage from './admin/pages/AdminSettingsPage';
import AdminSecurityPoliciesPage from './admin/pages/AdminSecurityPoliciesPage';
import AdminScanConfigPage from './admin/pages/AdminScanConfigPage';
import AdminSystemHealthPage from './admin/pages/AdminSystemHealthPage';
import AdminBackupsPage from './admin/pages/AdminBackupsPage';

/**
 * Authentication and authorization guard wrapping protected user dashboard pages.
 * Redirects unauthenticated sessions to /login.
 */
function AppShell({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', background: 'var(--color-bg)' }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Verifying security credentials…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
}

/**
 * Privileged security guard wrapping administrative control portal pages.
 * Enforces Super-Admin / Admin role authentication and redirects unauthorized sessions to /admin/login.
 */
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
          <AuthProvider>
            <AdminAuthProvider>
              <Routes>
                {/* ── Public pages (no layout) ─────────────────────────── */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* ── Protected User Portal / App Shell pages ───────────── */}
                <Route
                  path="/dashboard"
                  element={
                    <AppShell>
                      <DashboardPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/upload"
                  element={
                    <AppShell>
                      <UploadPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/scans"
                  element={
                    <AppShell>
                      <ScansPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/scans/:scanId"
                  element={
                    <AppShell>
                      <ScanDetailPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/scans/:scanId/progress"
                  element={
                    <AppShell>
                      <ScanProgressPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/quarantine"
                  element={
                    <AppShell>
                      <QuarantinePage />
                    </AppShell>
                  }
                />
                <Route
                  path="/supply-chain"
                  element={
                    <AppShell>
                      <SupplyChainPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <AppShell>
                      <SettingsPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/artifacts"
                  element={
                    <AppShell>
                      <ArtifactRegistryPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <AppShell>
                      <ReportsPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/vulnerabilities"
                  element={
                    <AppShell>
                      <VulnerabilitiesPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/models"
                  element={
                    <AppShell>
                      <ModelAnalysisPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/datasets"
                  element={
                    <AppShell>
                      <DatasetAnalysisPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/integrity"
                  element={
                    <AppShell>
                      <IntegrityProvenancePage />
                    </AppShell>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <AppShell>
                      <NotificationsPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/activity-logs"
                  element={
                    <AppShell>
                      <ActivityLogsPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/policies"
                  element={
                    <AppShell>
                      <SecurityPoliciesPage />
                    </AppShell>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <AppShell>
                      <AboutPage />
                    </AppShell>
                  }
                />

                {/* ── Admin Control Portal Routes ───────────────────────── */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <AdminShell>
                      <AdminDashboardPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminShell>
                      <AdminUsersPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/roles"
                  element={
                    <AdminShell>
                      <AdminRolesPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/activity-logs"
                  element={
                    <AdminShell>
                      <AdminActivityLogsPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/audit-reports"
                  element={
                    <AdminShell>
                      <AdminAuditReportsPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/security-events"
                  element={
                    <AdminShell>
                      <AdminSecurityEventsPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/login-history"
                  element={
                    <AdminShell>
                      <AdminLoginHistoryPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <AdminShell>
                      <AdminSettingsPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/security-policies"
                  element={
                    <AdminShell>
                      <AdminSecurityPoliciesPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/scan-configuration"
                  element={
                    <AdminShell>
                      <AdminScanConfigPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/system-health"
                  element={
                    <AdminShell>
                      <AdminSystemHealthPage />
                    </AdminShell>
                  }
                />
                <Route
                  path="/admin/backups"
                  element={
                    <AdminShell>
                      <AdminBackupsPage />
                    </AdminShell>
                  }
                />

                {/* ── Catch-all: redirect to dashboard ─────────────────── */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AdminAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
