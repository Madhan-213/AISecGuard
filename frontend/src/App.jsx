/**
 * AISecGuard — Root Application Router
 * Week 6: Full routing setup with AuthProvider, protected dashboard routes,
 * public homepage, login/register, and scroll restoration.
 *
 * Routes:
 *   /            → HomePage (public, light/dark theme preserved)
 *   /login       → LoginPage
 *   /register    → RegisterPage
 *   /dashboard   → DashboardPage (inside Layout)
 *   /upload      → UploadPage (inside Layout)
 *   /scans       → ScansPage (inside Layout)
 *   /scans/:id   → ScanDetailPage (inside Layout)
 *   /quarantine  → QuarantinePage (inside Layout)
 *   *            → redirect to /dashboard
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ScansPage from './pages/ScansPage';
import ScanDetailPage from './pages/ScanDetailPage';
import QuarantinePage from './pages/QuarantinePage';

/**
 * Wrap dashboard-area pages in the sidebar Layout.
 */
function AppShell({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
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
            path="/quarantine"
            element={
              <AppShell>
                <QuarantinePage />
              </AppShell>
            }
          />

          {/* ── Catch-all: redirect to dashboard ─────────────────── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
