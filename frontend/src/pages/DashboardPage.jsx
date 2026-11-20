/**
 * AISecGuard — Security Dashboard (Cybersecurity SaaS Redesign)
 *
 * Professional dark navy cybersecurity aesthetic with restrained purple/blue accents,
 * clean typography, 5 compact stat cards, interactive charts, and live backend data.
 * Supports both Light and Dark modes seamlessly.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  LayoutDashboard,
  Boxes,
  ScanSearch,
  AlertTriangle,
  Lock,
  BadgeCheck,
  RefreshCw,
  Download,
  UploadCloud,
  Activity,
  PieChart as PieIcon,
  History,
  ShieldAlert,
  BarChart3,
  ArrowRight,
  Eye,
  FileText,
  GitBranch,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { API_ORIGIN, apiErrorMessage, exportsApi, statsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../hooks/useTheme';

const RISK_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#10b981',
  CLEAN: '#10b981',
  UNKNOWN: '#94a3b8',
};

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
const SEV_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#10b981',
  INFORMATIONAL: '#64748b',
};

const TYPE_LABEL = {
  MODEL: ['model', 'models'],
  DATASET: ['dataset', 'datasets'],
  DEPENDENCY: ['dependency', 'dependencies'],
};

function formatScore(rawScore) {
  if (rawScore == null) return '0.0';
  const num = Number(rawScore);
  return num > 10 ? (num / 10).toFixed(1) : num.toFixed(1);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRiskBadge(riskLevel) {
  const level = (riskLevel || 'UNKNOWN').toUpperCase();
  const styles = {
    CRITICAL: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.35)', label: 'Critical' },
    HIGH:     { color: '#f97316', bg: 'rgba(249, 115, 22, 0.16)', border: 'rgba(249, 115, 22, 0.35)', label: 'High' },
    MEDIUM:   { color: '#eab308', bg: 'rgba(234, 179, 8, 0.16)', border: 'rgba(234, 179, 8, 0.35)', label: 'Medium' },
    LOW:      { color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.35)', label: 'Low' },
    CLEAN:    { color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.35)', label: 'Clean' },
    UNKNOWN:  { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)', label: 'Unknown' },
  };
  return styles[level] || styles.UNKNOWN;
}

function getTypeBadge(artifactType) {
  const type = (artifactType || '').toUpperCase();
  if (type.includes('MODEL')) {
    return { label: 'Model', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' };
  }
  if (type.includes('DATASET')) {
    return { label: 'Dataset', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
  }
  if (type.includes('DEP')) {
    return { label: 'Dependency', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
  }
  return { label: artifactType || 'Artifact', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' };
}

/** 5 Compact KPI Stat Cards */
function Kpi({ icon: Icon, label, value, sub, tone = '#4F7EF7', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="dashboard-kpi-card"
      style={{
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        background: 'var(--color-surface-card)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            marginBottom: '0.35rem',
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>
          {value ?? 0}
        </div>
        {sub && (
          <div
            style={{
              marginTop: '0.3rem',
              fontSize: '0.74rem',
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${tone}1a`,
          border: `1px solid ${tone}33`,
          color: tone,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>
    </button>
  );
}

/** Dashboard Panel Container */
function Panel({ icon: Icon, title, sub, action, children, style }) {
  return (
    <div
      style={{
        padding: '1.4rem 1.5rem',
        background: 'var(--color-surface-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        boxShadow: 'var(--card-shadow)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {Icon && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6',
                flexShrink: 0,
              }}
            >
              <Icon size={17} />
            </div>
          )}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{title}</h2>
            {sub && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [exporting, setExporting] = useState(null);

  const fetchStats = useCallback(() => {
    return statsApi.get().then(
      (res) => {
        setStats(res.data);
        setError('');
        setRefreshedAt(new Date());
        setLoading(false);
      },
      (e) => {
        setError(apiErrorMessage(e, 'The backend did not respond.'));
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 30000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  const load = () => {
    setLoading(true);
    toast.info('Refreshing scan metrics…');
    fetchStats();
  };

  const exportFindings = async (format) => {
    setExporting(format);
    try {
      await exportsApi.downloadFindings(format);
      toast.success(`Exported findings as ${format.toUpperCase()}.`);
    } catch (e) {
      const msg = apiErrorMessage(e, 'Export failed.');
      setError(msg);
      toast.error(msg);
    } finally {
      setExporting(null);
    }
  };

  const tooltipStyle = {
    background: isDark ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-text)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  };

  /* ── Header ── */
  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Squircle Header Icon */}
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            boxShadow: '0 8px 20px -4px rgba(147, 51, 234, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a855f7',
            flexShrink: 0,
          }}
        >
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--color-text)',
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Security Dashboard
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginTop: '0.35rem',
              fontSize: '0.84rem',
              color: 'var(--color-text-muted)',
              flexWrap: 'wrap',
            }}
          >
            <span>Live threat intelligence, artifact integrity, and AI supply chain metrics.</span>
            {refreshedAt && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} className="pulse-glow" />
                <span>Refreshed {refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: AI Security Shield + Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Subtle AISecGuard AI-Security Visual Badge */}
        <div
          className="desktop-only"
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
          <img
            src="/logos/logo-shield.png"
            alt="AISecGuard AI Security Shield"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'relative',
              filter: 'drop-shadow(0 0 10px rgba(147, 51, 234, 0.45))',
            }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={load}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : undefined} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportFindings('csv')}
            disabled={!stats || exporting !== null}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
          >
            <Download size={14} />
            <span>{exporting === 'csv' ? 'Exporting…' : 'CSV'}</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => exportFindings('json')}
            disabled={!stats || exporting !== null}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
          >
            <Download size={14} />
            <span>{exporting === 'json' ? 'Exporting…' : 'JSON'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/upload')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              padding: '0.5rem 1.1rem',
              borderRadius: 10,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <UploadCloud size={15} />
            <span>Upload &amp; Scan</span>
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Loading / Error State ── */
  if (!stats) {
    return (
      <div className="fade-in" style={{ padding: '1.75rem 2rem', maxWidth: 1240, margin: '0 auto' }}>
        {header}
        {error ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 16,
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <WifiOff size={42} style={{ color: '#EF4444', margin: '0 auto 0.75rem' }} />
            <h2 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '1.15rem', margin: '0 0 0.5rem' }}>
              Backend not reachable
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 520, margin: '0 auto 1.25rem' }}>
              Could not load data from <span className="font-mono">{API_ORIGIN}/api/v1/stats</span>. {error}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}
              onClick={load}
            >
              <RefreshCw size={15} />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)', padding: '3rem 0' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
            <span>Loading security dashboard…</span>
          </div>
        )}
      </div>
    );
  }

  /* ── Data Derivations ── */
  const types = stats.artifacts_by_type || {};
  const typeLine =
    Object.entries(types)
      .map(([t, n]) => `${n} ${(TYPE_LABEL[t] || [t.toLowerCase(), t.toLowerCase()])[n === 1 ? 0 : 1]}`)
      .join(' · ') || 'none yet';

  const riskData = Object.entries(stats.risk_distribution || {})
    .filter(([, n]) => n > 0)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => Object.keys(RISK_COLORS).indexOf(a.level) - Object.keys(RISK_COLORS).indexOf(b.level));

  const totalRiskCount = riskData.reduce((acc, cur) => acc + cur.count, 0);

  const sevData = SEVERITIES.map((s) => ({
    severity: s === 'INFORMATIONAL' ? 'INFO' : s,
    key: s,
    count: stats.severity_distribution?.[s] || 0,
  }));

  const timeline = (stats.scans_over_time || []).map((d) => ({
    ...d,
    label: shortDate(d.date),
    other: Math.max(0, (d.scans || 0) - (d.high_risk || 0)),
  }));

  const empty = stats.total_scans === 0;

  return (
    <div className="fade-in dashboard-page" style={{ padding: '1.75rem 2rem', maxWidth: 1240, margin: '0 auto' }}>
      {header}

      {error && <div className="alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

      {/* Empty State Banner */}
      {empty && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            boxShadow: 'var(--card-shadow)',
            padding: '1.2rem 1.5rem',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ScanSearch size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '0.98rem' }}>No scans recorded yet</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Upload an AI model, dataset or requirements file to scan for vulnerabilities and supply chain threats.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem' }}
          >
            <span>Scan first artifact</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── 5 Compact Statistic Cards ── */}
      <div className="kpi-grid">
        {/* 1. Artifacts */}
        <Kpi
          icon={Boxes}
          label="Artifacts"
          value={stats.total_artifacts}
          sub={typeLine}
          tone="#38bdf8"
          onClick={() => navigate('/scans')}
        />

        {/* 2. Scans Run */}
        <Kpi
          icon={ScanSearch}
          label="Scans Run"
          value={stats.total_scans}
          sub={`Avg score ${stats.avg_risk_score}`}
          tone="#a855f7"
          onClick={() => navigate('/scans')}
        />

        {/* 3. High / Critical */}
        <Kpi
          icon={AlertTriangle}
          label="High / Critical"
          value={stats.high_risk_scans}
          sub={`${stats.known_vulnerabilities} CVEs detected`}
          tone="#f97316"
          onClick={() => navigate('/scans')}
        />

        {/* 4. Quarantined */}
        <Kpi
          icon={Lock}
          label="Quarantined"
          value={stats.quarantined_artifacts}
          sub="Blocked from use"
          tone="#ef4444"
          onClick={() => navigate('/quarantine')}
        />

        {/* 5. Signed */}
        <Kpi
          icon={BadgeCheck}
          label="Signed"
          value={stats.signed_artifacts}
          sub={`${stats.lineage_links} lineage link(s)`}
          tone="#10b981"
          onClick={() => navigate('/supply-chain')}
        />
      </div>

      {/* ── Two-Column Main Analytics Grid ── */}
      <div className="dashboard-main-grid">
        {/* LEFT COLUMN: Scan Activity & Recent Scans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0, width: '100%' }}>
          {/* 1. Scan Activity Chart */}
          <Panel
            icon={Activity}
            title="Scan Activity"
            sub="Scans per day, last 14 days"
            action={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.74rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                  Low / Medium
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                  High / Critical
                </span>
              </div>
            }
          >
            <div style={{ height: 230, width: '100%', minWidth: 0, position: 'relative' }}>
              {timeline.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashOther" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="dashHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="3 3" opacity={0.6} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="other"
                      name="Low / Medium"
                      stackId="1"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#dashOther)"
                    />
                    <Area
                      type="monotone"
                      dataKey="high_risk"
                      name="High / Critical"
                      stackId="1"
                      stroke="#f97316"
                      strokeWidth={2}
                      fill="url(#dashHigh)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  No activity recorded for this period.
                </div>
              )}
            </div>
          </Panel>

          {/* 2. Recent Scans Table */}
          <Panel
            icon={History}
            title="Recent Scans"
            sub="Latest security analyses and vulnerability findings"
            action={
              <Link
                to="/scans"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#8b5cf6',
                  textDecoration: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 8,
                  background: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                }}
              >
                <span>View All</span>
                <ArrowRight size={13} />
              </Link>
            }
          >
            {stats.recent_scans?.length ? (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', minWidth: 540 }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Artifact Name</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Type</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Risk</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Score</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Scanned On</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_scans.map((s) => {
                      const typeBadge = getTypeBadge(s.scan_type);
                      const riskBadge = getRiskBadge(s.risk_level);
                      const displayName = s.artifact_name || s.artifact_id?.slice(0, 10) || `scan_${s.id.slice(0, 6)}`;
                      const scoreDisplay = formatScore(s.risk_score);

                      return (
                        <tr
                          key={s.id}
                          onClick={() => navigate(`/scans/${s.id}`)}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--color-border)',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.025)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: '0.8rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <FileText size={15} style={{ color: typeBadge.color, flexShrink: 0 }} />
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: 'var(--color-text)',
                                  maxWidth: 180,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={displayName}
                              >
                                {displayName}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem 0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 999,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: typeBadge.color,
                                background: typeBadge.bg,
                                border: `1px solid ${typeBadge.border}`,
                              }}
                            >
                              {typeBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem 0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 999,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: riskBadge.color,
                                background: riskBadge.bg,
                                border: `1px solid ${riskBadge.border}`,
                              }}
                            >
                              {riskBadge.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem 0.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
                            <span>{scoreDisplay}</span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginLeft: 3 }}>/ 10</span>
                          </td>
                          <td style={{ padding: '0.8rem 0.75rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {formatDateTime(s.completed_at || s.started_at)}
                          </td>
                          <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/scans/${s.id}`);
                              }}
                              title="View Scan Report"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#8b5cf6';
                                e.currentTarget.style.borderColor = '#8b5cf6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--color-text)';
                                e.currentTarget.style.borderColor = 'var(--color-border)';
                              }}
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-muted)' }}>
                <CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5, color: '#10b981' }} />
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>No scans run yet</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                  Upload an artifact to begin automated vulnerability analysis.
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* RIGHT COLUMN: Risk Mix & Top Rules */}
        <div className="dashboard-sidebar-panels">
          {/* 3. Risk Mix Chart */}
          <Panel icon={PieIcon} title="Risk Mix" sub="All scans by risk severity level">
            {riskData.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: 170, height: 170, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskData}
                        dataKey="count"
                        nameKey="level"
                        innerRadius={50}
                        outerRadius={74}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {riskData.map((d) => (
                          <Cell key={d.level} fill={RISK_COLORS[d.level] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Total Count in Donut */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>
                      {totalRiskCount}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: 2 }}>
                      Scans
                    </span>
                  </div>
                </div>

                {/* Severity Breakdown Legend */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {riskData.map((d) => {
                    const pct = totalRiskCount > 0 ? Math.round((d.count / totalRiskCount) * 100) : 0;
                    const badge = getRiskBadge(d.level);
                    return (
                      <div
                        key={d.level}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.35rem 0.55rem',
                          borderRadius: 8,
                          background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                          fontSize: '0.82rem',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: '50%',
                              background: badge.color,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{badge.label}</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{d.count}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'right' }}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                No completed scans yet.
              </div>
            )}
          </Panel>

          {/* 4. Top Rules Section */}
          <Panel icon={ShieldAlert} title="Top Rules" sub="Frequently triggered security detections">
            {stats.top_rules?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {stats.top_rules.map((r) => {
                  const sevColor = SEV_COLORS[r.severity] || '#64748b';
                  return (
                    <div
                      key={r.rule_id}
                      style={{
                        padding: '0.65rem 0.75rem',
                        borderRadius: 10,
                        background: isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: sevColor,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--color-primary)',
                              background: isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(79, 126, 247, 0.1)',
                              padding: '0.1rem 0.35rem',
                              borderRadius: 4,
                            }}
                          >
                            {r.rule_id}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.76rem',
                            color: 'var(--color-text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={r.title}
                        >
                          {r.title}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 999,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: sevColor,
                            background: `${sevColor}1a`,
                            border: `1px solid ${sevColor}33`,
                          }}
                        >
                          {r.count} hits
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                Rules appear here once scans detect vulnerabilities.
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ── Findings by Severity (Horizontal Bar Chart) ── */}
      <Panel
        icon={BarChart3}
        title="Findings by Severity"
        sub={`${stats.total_findings || 0} findings detected across active workspace artifacts`}
        style={{ marginBottom: '1.5rem' }}
      >
        <div style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sevData} layout="vertical" margin={{ top: 5, right: 36, left: 4, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="severity"
                width={85}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-table-row-hover)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'var(--color-text-muted)', fontSize: 11 }}>
                {sevData.map((d) => (
                  <Cell key={d.key} fill={SEV_COLORS[d.key] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ── Lineage & Scan Methodology Note ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          padding: '0 0.25rem',
        }}
      >
        <GitBranch size={14} style={{ color: '#8b5cf6', flexShrink: 0 }} />
        <span>
          High / critical threats, CVEs, and rule counts evaluate each artifact&apos;s latest scan; re-scans automatically update metrics.
        </span>
      </div>
    </div>
  );
}
