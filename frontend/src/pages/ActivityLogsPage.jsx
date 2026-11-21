/**
 * AISecGuard — Activity Logs Page
 * Comprehensive audit trail of system events, artifact uploads, scans, quarantine, policies, and auth.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  User,
  Clock,
  Shield,
  Layers,
  Play,
  Sliders,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { activityLogsApi, apiErrorMessage } from '../api/client';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await activityLogsApi.list({ limit: 150 });
      setLogs(res.data?.logs || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading activity audit logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const actionMatch = actionFilter === 'ALL' || log.action?.includes(actionFilter);
      const q = searchQuery.trim().toLowerCase();
      const searchMatch =
        !q ||
        log.user_email?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.entity_type?.toLowerCase().includes(q);
      return actionMatch && searchMatch;
    });
  }, [logs, actionFilter, searchQuery]);

  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('QUARANTINE')) {
      return <span className="badge badge-critical" style={{ fontSize: '0.72rem' }}>{action}</span>;
    }
    if (act.includes('SCAN')) {
      return <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{action}</span>;
    }
    if (act.includes('UPLOAD')) {
      return <span className="badge badge-low" style={{ fontSize: '0.72rem' }}>{action}</span>;
    }
    if (act.includes('POLICY')) {
      return <span className="badge badge-medium" style={{ fontSize: '0.72rem' }}>{action}</span>;
    }
    return <span className="badge" style={{ fontSize: '0.72rem', background: 'var(--color-btn-ghost-bg)', color: 'var(--color-text)' }}>{action}</span>;
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}>
            <ScrollText size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Activity Audit Trail
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Immutable timeline of system operations, user interactions, scan telemetry, and security events.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchLogs}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={14} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'UPLOAD', 'SCAN', 'QUARANTINE', 'POLICY', 'SYSTEM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActionFilter(cat)}
              style={{
                fontSize: '0.78rem',
                fontWeight: actionFilter === cat ? 700 : 500,
                padding: '0.4rem 0.8rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: actionFilter === cat ? 'var(--color-primary)' : 'var(--color-border)',
                background: actionFilter === cat ? 'var(--color-primary-light)' : 'transparent',
                color: actionFilter === cat ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat === 'ALL' ? 'All Activities' : cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.1rem',
              paddingRight: '0.75rem',
              paddingTop: '0.4rem',
              paddingBottom: '0.4rem',
              fontSize: '0.8rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Loading audit stream…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <ScrollText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No activity events recorded yet.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Initiator</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Entity</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Operation Details</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Client IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={13} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{log.user_email || 'System'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getActionBadge(log.action)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      <span style={{ fontSize: '0.75rem' }}>{log.entity_type}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text)', maxWidth: 450 }}>
                      <span style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{log.details || '—'}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
