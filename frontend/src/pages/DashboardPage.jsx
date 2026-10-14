/**
 * AISecGuard — Dashboard Page
 * Real-time metrics from backend, Recharts risk distribution, findings breakdown, and recent scans.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scansApi, findingsApi, artifactsApi } from '../api/client';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertOctagon,
  ShieldAlert,
  Gauge,
  UploadCloud,
  ArrowUpRight,
  FileText,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const RISK_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#10b981',
  UNKNOWN: '#64748b',
};

const SEV_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#10b981',
  INFORMATIONAL: '#64748b',
};

function StatusBadge({ status }) {
  const norm = (status || 'pending').toLowerCase();
  return <span className={`badge badge-${norm}`}>{status}</span>;
}

function RiskBadge({ level }) {
  const norm = (level || 'info').toLowerCase();
  return <span className={`badge badge-${norm}`}>{level || 'UNKNOWN'}</span>;
}

function StatCard({ title, value, sub, color, icon: Icon, glowColor }) {
  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
          {title}
        </span>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: glowColor || 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color || '#3b82f6',
        }}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '2.1rem', fontWeight: 800, color: color || '#ffffff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

import { deviceCache } from '../utils/deviceCache';

export default function DashboardPage() {
  const navigate = useNavigate();
  // Initialize immediately from local device cache memory
  const [scans, setScans] = useState(() => deviceCache.getScans());
  const [findings, setFindings] = useState(() => deviceCache.getFindings());
  const [artifacts, setArtifacts] = useState(() => deviceCache.getArtifacts());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sync with backend API in background if online
    Promise.all([
      scansApi.list({ limit: 50 }).catch(() => null),
      findingsApi.list({ limit: 200 }).catch(() => null),
      artifactsApi.list({ limit: 100 }).catch(() => null),
    ]).then(([s, f, a]) => {
      if (s?.data?.scans && s.data.scans.length > 0) {
        s.data.scans.forEach(item => deviceCache.saveScan(item));
        setScans(deviceCache.getScans());
      }
      if (f?.data?.findings && f.data.findings.length > 0) {
        setFindings(deviceCache.getFindings());
      }
      if (a?.data?.artifacts && a.data.artifacts.length > 0) {
        a.data.artifacts.forEach(item => deviceCache.saveArtifact(item));
        setArtifacts(deviceCache.getArtifacts());
      }
    });
  }, []);

  // Derived stats
  const totalScans = scans.length;
  const criticalFindings = findings.filter(f => f.severity === 'CRITICAL').length;
  const quarantined = artifacts.filter(a => a.status === 'QUARANTINED').length;
  const avgRisk = scans.length
    ? Math.round(scans.reduce((s, sc) => s + (sc.risk_score || 0), 0) / scans.length)
    : 0;

  // Risk distribution pie data
  const riskDist = Object.entries(
    scans.reduce((acc, sc) => {
      const rl = sc.risk_level || 'UNKNOWN';
      acc[rl] = (acc[rl] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Severity bar data
  const sevBar = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'].map(sev => ({
    name: sev.charAt(0) + sev.slice(1).toLowerCase(),
    count: findings.filter(f => f.severity === sev).length,
    fill: SEV_COLORS[sev],
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.875rem' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading security intelligence…</span>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1300, margin: '0 auto' }}>
      {/* Page Title & Quick Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Security Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Unified view of AI supply chain scans, vulnerability findings, and quarantined assets.
          </p>
        </div>
        <button
          className="btn btn-primary"
          id="btn-new-scan"
          style={{ padding: '0.625rem 1.25rem' }}
          onClick={() => navigate('/upload')}
        >
          <UploadCloud size={17} />
          <span>Upload & Scan Artifact</span>
        </button>
      </div>

      {/* 4 Metric Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="Total Scans Executed"
          value={totalScans}
          sub="Across all artifact types"
          icon={Activity}
          color="#38bdf8"
          glowColor="rgba(56, 189, 248, 0.12)"
        />
        <StatCard
          title="Critical Threats"
          value={criticalFindings}
          sub="Requires immediate isolation"
          icon={AlertOctagon}
          color="#f87171"
          glowColor="rgba(248, 113, 113, 0.15)"
        />
        <StatCard
          title="Quarantined Artifacts"
          value={quarantined}
          sub="Isolated in secure containment"
          icon={ShieldAlert}
          color="#fb923c"
          glowColor="rgba(251, 146, 60, 0.15)"
        />
        <StatCard
          title="Average Risk Score"
          value={avgRisk}
          sub="Weighted heuristic index (0–50)"
          icon={Gauge}
          color={avgRisk > 6 ? '#f87171' : avgRisk > 3 ? '#fbbf24' : '#34d399'}
          glowColor={avgRisk > 6 ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)'}
        />
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Risk Distribution Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>Risk Level Distribution</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Aggregate scans</span>
          </div>

          {riskDist.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={riskDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskDist.map((entry) => (
                      <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                {Object.entries(RISK_COLORS).map(([k, c]) => (
                  <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                    <span>{k}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <ShieldCheck size={36} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
              <span>No scan telemetry available</span>
            </div>
          )}
        </div>

        {/* Findings by Severity Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>Findings by Severity Category</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Static inspection rules</span>
          </div>

          {findings.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sevBar} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.4)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                  }}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {sevBar.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <CheckCircle2 size={36} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
              <span>No security anomalies identified</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Scans Inventory Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Recent Security Scans</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
              Showing latest automated analysis results
            </p>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={() => navigate('/scans')}
          >
            <span>View All Scans</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {scans.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Scan Identifier</th>
                  <th>Artifact Class</th>
                  <th>Status</th>
                  <th>Risk Tier</th>
                  <th>Score</th>
                  <th>Execution Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 8).map(scan => (
                  <tr
                    key={scan.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/scans/${scan.id}`)}
                  >
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.825rem', color: '#60a5fa' }}>
                        {scan.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1' }}>
                        {scan.scan_type}
                      </span>
                    </td>
                    <td><StatusBadge status={scan.status} /></td>
                    <td><RiskBadge level={scan.risk_level} /></td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: scan.risk_score > 6 ? '#f87171' : scan.risk_score > 3 ? '#fbbf24' : '#34d399',
                      }}>
                        {scan.risk_score}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/scans/${scan.id}`);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
            <FileText size={42} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: '#94a3b8' }}>No scans registered yet</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Upload an AI/ML model, dataset, or dependency file to inspect for security risks.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '1.25rem' }}
              onClick={() => navigate('/upload')}
            >
              Upload First Artifact
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
