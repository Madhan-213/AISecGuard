/**
 * AISecGuard — Admin Activity Logs Page
 * Centralized audit trail with user email, action, entity type, details, client IP, timestamp.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  User,
  AlertTriangle,
} from 'lucide-react';
import { adminAuditApi, adminErrorMessage } from '../api/adminClient';

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAuditApi.logs({ limit: 150 });
      setLogs(res.data?.logs || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading activity logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const actMatch = actionFilter === 'ALL' || l.action?.includes(actionFilter);
      const q = searchQuery.trim().toLowerCase();
      const searchMatch =
        !q ||
        l.user_email?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q);
      return actMatch && searchMatch;
    });
  }, [logs, actionFilter, searchQuery]);

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
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Full operational timeline across logins, policy updates, scans, uploads, and administrative commands.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchLogs}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'LOGIN', 'USER', 'POLICY', 'SCAN', 'ARTIFACT', 'BACKUP'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActionFilter(cat)}
              style={{
                fontSize: '0.75rem',
                fontWeight: actionFilter === cat ? 700 : 500,
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: actionFilter === cat ? '#dc2626' : 'var(--color-border)',
                background: actionFilter === cat ? 'rgba(220, 38, 38, 0.12)' : 'transparent',
                color: actionFilter === cat ? '#dc2626' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {cat === 'ALL' ? 'All Operations' : cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search email, action, details..."
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
            <div>Streaming audit records…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <ScrollText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No activity events recorded.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Initiator</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Action Code</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Entity</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Operation Details</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Client IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr
                    key={l.id}
                    style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={13} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{l.user_email || 'System Engine'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge" style={{ fontSize: '0.68rem', background: 'var(--color-btn-ghost-bg)', color: 'var(--color-text)' }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      {l.entity_type}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text)', maxWidth: 450 }}>
                      <span style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{l.details}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {l.ip_address || '127.0.0.1'}
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
