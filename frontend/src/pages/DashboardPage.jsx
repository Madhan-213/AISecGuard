/**
 * AISecGuard — Security Dashboard (Week 9 redesign)
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

const cardTitle = { fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' };
const muted = { fontSize: '0.8rem', color: 'var(--color-text-muted)' };
const tooltipStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text)' };

function Kpi({ icon: Icon, label, value, sub, tone = '#60a5fa', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{ textAlign: 'left', padding: '1.1rem 1.25rem', cursor: onClick ? 'pointer' : 'default', width: '100%' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <span style={cardTitle}>{label}</span>
        <span style={{ padding: 6, borderRadius: 8, background: `${tone}1f`, color: tone, display: 'inline-flex' }}><Icon size={16} /></span>
      </div>
      <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ ...muted, marginTop: '0.3rem' }}>{sub}</div>}
    </button>
  );
}

function RiskBadge({ level }) {
  return <span className={`badge badge-${(level || 'info').toLowerCase()}`}>{level || 'UNKNOWN'}</span>;
}

function Panel({ title, sub, action, children, style }) {
  return (
    <div className="card" style={{ padding: '1.25rem 1.4rem', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{title}</h2>
          {sub && <p style={{ ...muted, marginTop: '0.15rem' }}>{sub}</p>}
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

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>Security dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          {refreshedAt ? `Live data · refreshed ${refreshedAt.toLocaleTimeString()} · updates every 30 s` : 'Loading live data…'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : undefined} /><span>Refresh</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => exportFindings('csv')} disabled={!stats || exporting !== null}>
          <Download size={15} /><span>{exporting === 'csv' ? 'Exporting…' : 'Findings CSV'}</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => exportFindings('json')} disabled={!stats || exporting !== null}>
          <Download size={15} /><span>{exporting === 'json' ? 'Exporting…' : 'JSON'}</span>
        </button>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/upload')}>
          <UploadCloud size={15} /><span>Upload & scan</span>
        </button>
      </div>
    </div>
  );

  const page = { padding: '2rem 2.5rem', maxWidth: 1280, margin: '0 auto' };

  if (!stats) {
    return (
      <div className="fade-in" style={page}>
        {header}
        {error ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <WifiOff size={40} style={{ color: '#f87171', margin: '0 auto 0.75rem' }} />
            <h2 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '1.1rem' }}>Backend not reachable</h2>
            <p style={{ ...muted, marginTop: '0.4rem', maxWidth: 520, marginInline: 'auto' }}>
              Could not load data from <span className="font-mono">{API_ORIGIN}/api/v1/stats</span>. {error} Start the API
              (<span className="font-mono">docker compose up</span> or <span className="font-mono">uvicorn main:app</span>) and retry.
            </p>
            <button type="button" className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={load}>
              <RefreshCw size={15} /><span>Retry</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} /> Loading dashboard…
          </div>
        )}
      </div>
    );
  }

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
    <div className="fade-in" style={page}>
      {header}
      {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {empty && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <ScanSearch size={28} style={{ color: '#60a5fa' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>No scans yet</div>
            <div style={muted}>Upload a model, dataset or requirements file to see results here.</div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/upload')}>
            <span>Scan your first artifact</span><ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <Kpi icon={Boxes} label="Artifacts" value={stats.total_artifacts} sub={typeLine} onClick={() => navigate('/scans')} />
        <Kpi icon={ScanSearch} label="Scans run" value={stats.total_scans} sub={`avg score ${stats.avg_risk_score}`} onClick={() => navigate('/scans')} />
        <Kpi icon={AlertTriangle} label="High / critical" value={stats.high_risk_scans} sub="artifacts, latest scan" tone="#f97316" />
        <Kpi icon={Bug} label="Known CVEs" value={stats.known_vulnerabilities} sub="pinned dependencies" tone="#ef4444" />
        <Kpi icon={Lock} label="Quarantined" value={stats.quarantined_artifacts} sub="blocked from use" tone="#f87171" onClick={() => navigate('/quarantine')} />
        <Kpi icon={BadgeCheck} label="Signed" value={stats.signed_artifacts} sub={`${stats.lineage_links} lineage link(s)`} tone="#34d399" onClick={() => navigate('/supply-chain')} />
      </div>

      {/* Activity + risk mix */}
      <div className="dash-grid dash-grid--wide-left">
        <Panel title="Scan activity" sub="Scans per day, last 14 days">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashOther" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="other" name="Low / medium" stackId="1" stroke="#3b82f6" fill="url(#dashOther)" />
                <Area type="monotone" dataKey="high_risk" name="High / critical" stackId="1" stroke="#f97316" fill="url(#dashHigh)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Risk mix" sub="All scans by risk level">
          {riskData.length ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem 1.5rem', flexWrap: 'wrap' }}>
              <div style={{ width: 150, height: 150, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="count" nameKey="level" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
                      {riskData.map((d) => <Cell key={d.level} fill={RISK_COLORS[d.level] || '#64748b'} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul style={{ display: 'grid', gap: '0.45rem', flex: '1 1 120px', maxWidth: 220, minWidth: 0 }}>
                {riskData.map((d) => (
                  <li key={d.level} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: RISK_COLORS[d.level] || '#64748b' }} />{d.level}
                    </span>
                    <span style={{ fontWeight: 700 }}>{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p style={muted}>No completed scans yet.</p>}
        </Panel>
      </div>

      {/* Severity + top rules */}
      <div className="dash-grid">
        <Panel title="Findings by severity" sub={`${stats.total_findings} findings across all scans`}>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sevData} layout="vertical" margin={{ top: 0, right: 24, left: 4, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="severity" width={78} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#e2e8f0', fontSize: 11 }}>
                  {sevData.map((d) => <Cell key={d.key} fill={SEV_COLORS[d.key]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Most frequent rules" sub="Across each artifact's latest scan">
          {stats.top_rules?.length ? (
            <table style={{ width: '100%', fontSize: '0.83rem', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {stats.top_rules.map((r) => (
                  <tr key={r.rule_id} style={{ borderTop: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.5rem 0.25rem', width: 82 }}>
                      <span className="font-mono" style={{ color: '#60a5fa', fontSize: '0.78rem' }}>{r.rule_id}</span>
                    </td>
                    <td title={r.title} style={{ padding: '0.5rem 0.25rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</td>
                    <td style={{ padding: '0.5rem 0.25rem', width: 92 }}><RiskBadge level={r.severity === 'INFORMATIONAL' ? 'INFO' : r.severity} /></td>
                    <td style={{ padding: '0.5rem 0.25rem', width: 34, textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={muted}>Rules appear here once scans find something.</p>}
        </Panel>
      </div>

      {/* Recent scans */}
      <Panel
        title="Recent scans"
        sub="Click a row for the full report"
        action={<button type="button" className="btn btn-ghost" onClick={() => navigate('/scans')}><span>All scans</span><ArrowRight size={14} /></button>}
      >
        {stats.recent_scans.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Artifact</th><th style={{ padding: '0.4rem 0.5rem' }}>Type</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Risk</th><th style={{ padding: '0.4rem 0.5rem' }}>Score</th>
                  <th style={{ padding: '0.4rem 0.5rem' }}>Findings</th><th style={{ padding: '0.4rem 0.5rem' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_scans.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/scans/${s.id}`)}
                    style={{ borderTop: '1px solid #1e293b', cursor: 'pointer', color: '#e2e8f0' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{s.artifact_name || s.artifact_id.slice(0, 8)}</td>
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--color-text-muted)' }}>{s.scan_type}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}><RiskBadge level={s.risk_level} /></td>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700 }}>{s.risk_score}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{s.findings_count}</td>
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--color-text-muted)' }}>{timeAgo(s.completed_at || s.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={muted}>No scans yet.</p>}
      </Panel>

      <p style={{ ...muted, marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <GitBranch size={13} /> High / critical, CVE and rule counts use each artifact&apos;s most recent scan; re-scans replace older results.
      </p>
    </div>
  );
}
