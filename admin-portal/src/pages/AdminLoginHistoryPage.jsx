/**
 * AISecGuard — Admin Login History Page
 * Immutable authentication logs: Email, timestamp, IP, User-Agent, status, and failure reason.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { adminSecurityApi, adminErrorMessage } from '../api/adminClient';

export default function AdminLoginHistoryPage() {
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogins = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminSecurityApi.loginHistory({ limit: 150 });
      setLogins(res.data?.items || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading login history.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogins();
  }, []);

  const filtered = useMemo(() => {
    return logins.filter((l) => {
      const isSuccess = l.status === 'SUCCESS';
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'SUCCESS' && isSuccess) ||
        (statusFilter === 'FAILED' && !isSuccess);
      const q = searchQuery.trim().toLowerCase();
      const searchMatch =
        !q ||
        l.email?.toLowerCase().includes(q) ||
        l.ip_address?.toLowerCase().includes(q) ||
        l.failure_reason?.toLowerCase().includes(q);
      return statusMatch && searchMatch;
    });
  }, [logins, statusFilter, searchQuery]);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)' }}>
            <History size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Login History & Authentication Stream
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Forensic audit log of all successful and intercepted authentication attempts.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchLogins}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} />
          <span>Refresh Stream</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {['ALL', 'SUCCESS', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                fontSize: '0.75rem',
                fontWeight: statusFilter === s ? 700 : 500,
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: statusFilter === s ? '#dc2626' : 'var(--color-border)',
                background: statusFilter === s ? 'rgba(220, 38, 38, 0.12)' : 'transparent',
                color: statusFilter === s ? '#dc2626' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {s === 'ALL' ? 'All Logins' : s === 'SUCCESS' ? 'Successful' : 'Failed Attempts'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search email or IP address..."
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
            <div>Streaming login history…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <History size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No login records found.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.85rem 1rem' }}>User Email</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Failure Reason</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Client IP</th>
                  <th style={{ padding: '0.85rem 1rem' }}>User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(l.login_time).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {l.email}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {l.status === 'SUCCESS' ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700 }}>
                          <CheckCircle2 size={13} /> SUCCESS
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700 }}>
                          <XCircle size={13} /> {l.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      {l.failure_reason || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text)' }}>
                      {l.ip_address || '127.0.0.1'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.72rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.user_agent}>
                      {l.user_agent || 'Unknown'}
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
