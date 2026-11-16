/**
 * AISecGuard — Security Dashboard (Modern SaaS Light Theme Redesign)
 *
 * Shows only real data from GET /api/v1/stats. When the backend cannot be
 * reached the page says so and offers a retry; it never fills in sample numbers.
 * Per-artifact figures (high risk, CVEs, top rules) use each artifact's latest scan.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, BadgeCheck, Boxes, Bug, Download, GitBranch, Lock, RefreshCw, ScanSearch, UploadCloud, WifiOff,
} from 'lucide-react';
import { API_ORIGIN, apiErrorMessage, exportsApi, statsApi } from '../api/client';
import { useToast } from '../context/ToastContext';

const RISK_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#10b981', UNKNOWN: '#64748b' };
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
const SEV_COLORS = { ...RISK_COLORS, INFORMATIONAL: '#64748b' };
const TYPE_LABEL = { MODEL: ['model', 'models'], DATASET: ['dataset', 'datasets'], DEPENDENCY: ['manifest', 'manifests'] };

const muted = { fontSize: '0.8rem', color: 'var(--color-text-muted)' };
const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-text)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

/** KPI Card — flat white, left = label+number+sub, right = colored icon bubble */
function Kpi({ icon: Icon, label, value, sub, tone = '#4F7EF7', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card dashboard-kpi-card"
      style={{
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.65rem',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        background: 'var(--color-surface-card)',
        boxShadow: 'var(--card-shadow)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Left: label + number + sub */}
      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: '0.3rem',
        }}>
          {label}
        </div>
        <div className="dashboard-kpi-value" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ ...muted, marginTop: '0.25rem', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sub}
          </div>
        )}
      </div>
      {/* Right: icon bubble */}
      <div className="dashboard-kpi-icon" style={{
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: `${tone}1a`,
        color: tone,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={19} />
      </div>
    </button>
  );
}

function RiskBadge({ level }) {
  return <span className={`badge badge-${(level || 'info').toLowerCase()}`}>{level || 'UNKNOWN'}</span>;
}

function Panel({ title, sub, action, children, style }) {
  return (
    <div className="card" style={{
      padding: '1.25rem 1.4rem',
      background: 'var(--color-surface-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      boxShadow: 'var(--card-shadow)',
      ...style,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{title}</h2>
          {sub && <p style={{ ...muted, marginTop: '0.2rem' }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return '—';
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [exporting, setExporting] = useState(null);

  // State only changes in the request's callbacks, never synchronously inside the effect.
  const fetchStats = useCallback(() => statsApi.get().then(
    (res) => {
      setStats(res.data);
      setError('');
      setRefreshedAt(new Date());
      setLoading(false);
    },
    (e) => {
      setError(apiErrorMessage(e, 'The backend did not respond.'));
      setLoading(false);
    },
  ), []);

  // Initial load and 30 s polling; `loading` starts true, so only manual refreshes set it.
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

  const pageStyle = { padding: '1.75rem 2rem', maxWidth: '100%', margin: '0 auto' };

  /* ── Page header ── */
  const header = (
    <div className="dashboard-header">
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
          Security Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.3rem', fontSize: '0.85rem' }}>
          {refreshedAt
            ? `Live data · refreshed ${refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · updates every 30s`
            : 'Loading live data…'}
        </p>
      </div>
      <div className="dashboard-header-actions">
        <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <RefreshCw size={14} className={loading ? 'spin' : undefined} /><span>Refresh</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => exportFindings('csv')} disabled={!stats || exporting !== null}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <Download size={14} /><span>{exporting === 'csv' ? 'Exporting…' : 'Download CSV'}</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => exportFindings('json')} disabled={!stats || exporting !== null}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <Download size={14} /><span>{exporting === 'json' ? 'Exporting…' : 'Download JSON'}</span>
        </button>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/upload')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <UploadCloud size={14} /><span>Upload &amp; Scan</span>
        </button>
      </div>
    </div>
  );

  /* ── Loading / Error state ── */
  if (!stats) {
    return (
      <div className="fade-in" style={pageStyle}>
        {header}
        {error ? (
          <div className="card" style={{
            textAlign: 'center', padding: '3rem 1.5rem',
            background: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)',
          }}>
            <WifiOff size={40} style={{ color: '#EF4444', margin: '0 auto 0.75rem' }} />
            <h2 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '1.1rem', margin: '0 0 0.5rem' }}>Backend not reachable</h2>
            <p style={{ ...muted, maxWidth: 520, marginInline: 'auto' }}>
              Could not load data from <span className="font-mono">{API_ORIGIN}/api/v1/stats</span>. {error} Start the API
              (<span className="font-mono">docker compose up</span> or <span className="font-mono">uvicorn main:app</span>) and retry.
            </p>
            <button type="button" className="btn btn-primary" style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} onClick={load}>
              <RefreshCw size={15} /><span>Retry</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)', padding: '2rem 0' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} /> Loading dashboard…
          </div>
        )}
      </div>
    );
  }

  /* ── Data derivations ── */
  const types = stats.artifacts_by_type || {};
  const typeLine = Object.entries(types)
    .map(([t, n]) => `${n} ${(TYPE_LABEL[t] || [t.toLowerCase(), t.toLowerCase()])[n === 1 ? 0 : 1]}`)
    .join(' · ') || 'none yet';
  const riskData = Object.entries(stats.risk_distribution || {})
    .filter(([, n]) => n > 0)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => Object.keys(RISK_COLORS).indexOf(a.level) - Object.keys(RISK_COLORS).indexOf(b.level));
  const sevData = SEVERITIES.map((s) => ({ severity: s === 'INFORMATIONAL' ? 'INFO' : s, key: s, count: stats.severity_distribution?.[s] || 0 }));
  const timeline = (stats.scans_over_time || []).map((d) => ({ ...d, label: shortDate(d.date), other: d.scans - d.high_risk }));
  const empty = stats.total_scans === 0;

  return (
    <div className="fade-in dashboard-page">
      {header}
      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Empty state banner */}
      {empty && (
        <div className="card" style={{
          display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap',
          background: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '1.1rem 1.4rem',
        }}>
          <ScanSearch size={28} style={{ color: 'var(--color-primary)' }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '0.95rem' }}>No scans yet</div>
            <div style={muted}>Upload a model, dataset or requirements file to see results here.</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/upload')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <span>Scan your first artifact</span><ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* KPI Cards Row — responsive 6 cards */}
      <div className="kpi-grid">
        <Kpi icon={Boxes} label="Artifacts" value={stats.total_artifacts} sub={typeLine} tone="#4F7EF7" onClick={() => navigate('/scans')} />
        <Kpi icon={ScanSearch} label="Scans Run" value={stats.total_scans} sub={`avg score ${stats.avg_risk_score}`} tone="#06B6D4" onClick={() => navigate('/scans')} />
        <Kpi icon={AlertTriangle} label="High / Critical" value={stats.high_risk_scans} sub="artifacts, latest scan" tone="#F97316" />
        <Kpi icon={Bug} label="Known CVEs" value={stats.known_vulnerabilities} sub="pinned dependencies" tone="#EF4444" />
        <Kpi icon={Lock} label="Quarantined" value={stats.quarantined_artifacts} sub="blocked from use" tone="#F87171" onClick={() => navigate('/quarantine')} />
        <Kpi icon={BadgeCheck} label="Signed" value={stats.signed_artifacts} sub={`${stats.lineage_links} lineage link(s)`} tone="#10B981" onClick={() => navigate('/supply-chain')} />
      </div>

      {/* Two-column layout: responsive grid */}
      <div className="dashboard-main-grid">

        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0, width: '100%' }}>

          {/* Scan Activity */}
          <Panel title="Scan Activity" sub="Scans per day, last 14 days" style={{ minWidth: 0 }}>
            <div style={{ height: 220, width: '100%', minWidth: 0, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                <AreaChart data={timeline} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashOther" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F7EF7" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#4F7EF7" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="dashHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="4 2" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="other" name="Low / medium" stackId="1" stroke="#4F7EF7" strokeWidth={2} fill="url(#dashOther)" />
                  <Area type="monotone" dataKey="high_risk" name="High / critical" stackId="1" stroke="#f97316" strokeWidth={2} fill="url(#dashHigh)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Recent Scans */}
          <Panel
            title="Recent Scans"
            sub="Click a row for the full report"
            style={{ minWidth: 0 }}
            action={
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/scans')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                <span>All scans</span><ArrowRight size={13} />
              </button>
            }
          >
            {stats.recent_scans.length ? (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', minWidth: 0 }}>
                <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead>
                    <tr>
                      {['Artifact', 'Type', 'Risk', 'Score', 'Findings', 'When'].map(col => (
                        <th key={col} style={{
                          padding: '0.6rem 0.75rem',
                          textAlign: 'left',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--color-text-muted)',
                          background: 'var(--color-table-header-bg)',
                          borderBottom: '1px solid var(--color-border)',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_scans.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/scans/${s.id}`)}
                        style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-table-row-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600, color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>
                          {s.artifact_name || s.artifact_id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{s.scan_type}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                          <RiskBadge level={s.risk_level} />
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700, color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>
                          {s.risk_score}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>
                          {s.findings_count}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
                          {timeAgo(s.completed_at || s.started_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={muted}>No scans yet.</p>}
          </Panel>
        </div>

        {/* RIGHT column */}
        <div className="dashboard-sidebar-panels">

          {/* Risk Mix Pie */}
          <Panel title="Risk Mix" sub="All scans by risk level" style={{ minWidth: 0 }}>
            {riskData.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                <div style={{ width: 160, height: 160, minWidth: 0, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={160}>
                    <PieChart>
                      <Pie data={riskData} dataKey="count" nameKey="level" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                        {riskData.map((d) => <Cell key={d.level} fill={RISK_COLORS[d.level] || '#64748b'} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                  {riskData.map((d) => (
                    <li key={d.level} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: RISK_COLORS[d.level] || '#64748b', flexShrink: 0 }} />
                        {d.level}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{d.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p style={muted}>No completed scans yet.</p>}
          </Panel>

          {/* Top Rules */}
          <Panel title="Top Rules" sub="Most frequent across all scans" style={{ minWidth: 0 }}>
            {stats.top_rules?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.top_rules.map((r) => (
                  <div key={r.rule_id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                    padding: '0.55rem 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      {/* Severity dot */}
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: SEV_COLORS[r.severity] || '#64748b',
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                          {r.rule_id}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.title}>
                          {r.title}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <RiskBadge level={r.severity === 'INFORMATIONAL' ? 'INFO' : r.severity} />
                      <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-text)', minWidth: 24, textAlign: 'right' }}>{r.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p style={muted}>Rules appear here once scans find something.</p>}
          </Panel>
        </div>
      </div>

      {/* Findings by severity (bar) — full width */}
      <Panel title="Findings by Severity" sub={`${stats.total_findings} findings across all scans`} style={{ marginBottom: '1.25rem' }}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sevData} layout="vertical" margin={{ top: 0, right: 32, left: 4, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="severity" width={80} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-table-row-hover)' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: 'var(--color-text-muted)', fontSize: 11 }}>
                {sevData.map((d) => <Cell key={d.key} fill={SEV_COLORS[d.key]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <p style={{ ...muted, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <GitBranch size={13} /> High / critical, CVE and rule counts use each artifact&apos;s most recent scan; re-scans replace older results.
      </p>
    </div>
  );
}
