/**
 * AISecGuard — Root Application Router
 * Provides ThemeProvider, ToastProvider, AuthProvider, protected dashboard routes,
 * public homepage, login/register, and scroll restoration.
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
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

/**
 * Authentication and authorization guard wrapping protected dashboard pages.
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

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* ── Public pages (no layout) ─────────────────────────── */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ── Protected / App Shell pages ───────────────────────── */}
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

              {/* ── Catch-all: redirect to dashboard ─────────────────── */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
