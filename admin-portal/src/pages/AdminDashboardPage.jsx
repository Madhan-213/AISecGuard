/**
 * AISecGuard — Admin Dashboard Overview Page
 * Real-time operational telemetry, user stats, scan distribution, and incident alerts.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Shield,
  Layers,
  Cpu,
  AlertTriangle,
  Activity,
  History,
  Sliders,
  Database,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { adminDashboardApi, adminErrorMessage } from '../api/adminClient';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { adminUser, isSuperAdmin } = useAdminAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(14);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminDashboardApi.get(days);
      setData(res.data);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading administrative dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [days]);

  const stats = data?.stats || {};
  const risk = data?.risk_distribution || {};
  const timeline = data?.timeline || [];
  const activities = data?.recent_activities || [];
  const secEvents = data?.recent_security_events || [];

  const maxTimelineScans = Math.max(...timeline.map((t) => t.scans + t.uploads), 1);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '1px solid rgba(220, 38, 38, 0.25)',
        borderRadius: 16,
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #dc2626, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
          }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              System Command Dashboard
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
              Welcome back, <strong>{adminUser?.full_name || adminUser?.email}</strong>. Operating with <strong>{adminUser?.role}</strong> authority.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.78rem',
              borderRadius: 8,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>

          <button
            className="btn btn-ghost"
            onClick={fetchDashboard}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <span className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
          <div>Aggregating platform telemetry from database…</div>
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <AlertTriangle size={28} style={{ margin: '0 auto 0.5rem' }} />
          <div>{error}</div>
        </div>
      ) : (
        <>
          {/* Top 6 KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.15rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#38bdf8', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</span>
                <Users size={16} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {stats.total_users || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                {stats.active_users || 0} active • {stats.suspended_users || 0} suspended
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#a855f7', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artifacts Ingested</span>
                <Layers size={16} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {stats.total_artifacts || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Models, datasets, dependencies
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6366f1', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Scans</span>
                <Cpu size={16} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {stats.total_scans || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                AST bytecode executions
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ef4444', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical / High CVEs</span>
                <ShieldAlert size={16} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>
                {(stats.critical_findings || 0) + (stats.high_findings || 0)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                {stats.critical_findings || 0} critical • {stats.high_findings || 0} high
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Events</span>
                <AlertTriangle size={16} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {stats.total_security_events || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Platform incident logs
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ec4899', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed Logins (24h)</span>
                <History size={16} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (stats.failed_logins_24h || 0) > 0 ? '#ef4444' : 'var(--color-text)' }}>
                {stats.failed_logins_24h || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Auth failures intercepted
              </div>
            </div>
          </div>

          {/* Platform Activity Timeline & Risk Mix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Timeline */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                    Platform Activity Timeline ({days} Days)
                  </h2>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
                    Daily aggregate scans, artifact uploads, and security events.
                  </p>
                </div>
              </div>

              {/* Bar Chart Representation */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.45rem', height: 160, paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                {timeline.map((day) => {
                  const totalActivity = day.scans + day.uploads + day.security_events;
                  const heightPercent = Math.max((totalActivity / maxTimelineScans) * 100, 8);
                  return (
                    <div
                      key={day.date}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                      title={`${day.date}: ${day.scans} scans, ${day.uploads} uploads, ${day.security_events} events`}
                    >
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 24,
                          height: `${heightPercent}%`,
                          borderRadius: '4px 4px 0 0',
                          background: 'linear-gradient(180deg, #7c3aed 0%, #dc2626 100%)',
                          opacity: totalActivity > 0 ? 0.9 : 0.2,
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', transform: 'rotate(-45deg)', transformOrigin: 'left top' }}>
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Threat Risk Classification Mix
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 1.25rem' }}>
                Completed security scans classified by risk severity.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[
                  { label: 'Critical Risk', count: risk['CRITICAL'] || 0, color: '#ef4444' },
                  { label: 'High Risk', count: risk['HIGH'] || 0, color: '#f97316' },
                  { label: 'Medium Risk', count: risk['MEDIUM'] || 0, color: '#eab308' },
                  { label: 'Low / Clean', count: risk['LOW'] || 0, color: '#10b981' },
                ].map((item) => {
                  const pct = stats.total_scans ? Math.round((item.count / stats.total_scans) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: item.color }}>{item.label}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{item.count} scans ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Nav Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div
              className="card"
              onClick={() => navigate('/admin/users')}
              style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={18} style={{ color: '#38bdf8' }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)' }}>User Management</span>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            </div>

            <div
              className="card"
              onClick={() => navigate('/admin/security-events')}
              style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)' }}>Security Events</span>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            </div>

            <div
              className="card"
              onClick={() => navigate('/admin/system-health')}
              style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Activity size={18} style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)' }}>System Diagnostics</span>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            </div>

            <div
              className="card"
              onClick={() => navigate('/admin/backups')}
              style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Database size={18} style={{ color: '#a855f7' }} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text)' }}>Backup Snapshots</span>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </div>

          {/* Recent Administrative Actions & Incident Alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
            {/* Activities Table */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  Recent System Activities
                </h3>
                <button
                  type="button"
                  className="link-primary"
                  onClick={() => navigate('/admin/activity-logs')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  View All Logs
                </button>
              </div>

              {activities.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem' }}>
                  No recent activities recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      style={{ padding: '0.6rem 0.75rem', background: 'var(--color-table-header-bg)', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
                    >
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.details || a.action}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                          {a.user_email || 'System'} • {new Date(a.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--color-btn-ghost-bg)', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                        {a.action}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Incidents */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  Security Incident Alerts
                </h3>
                <button
                  type="button"
                  className="link-primary"
                  onClick={() => navigate('/admin/security-events')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Incident Feed
                </button>
              </div>

              {secEvents.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem' }}>
                  No active security incidents. Defense baseline normal.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {secEvents.map((e) => (
                    <div
                      key={e.id}
                      style={{ padding: '0.6rem 0.75rem', background: 'var(--color-table-header-bg)', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {e.description}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                          {e.event_type} • {new Date(e.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`badge badge-${(e.severity || 'info').toLowerCase()}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                        {e.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
