/**
 * AISecGuard — Scans Inventory & Audit History
 * Filterable, searchable scan inventory table with status indicators and quick-inspection click-throughs.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scansApi } from '../api/client';
import { 
  Search, 
  Filter, 
  UploadCloud, 
  ArrowUpRight, 
  FileText, 
  CheckCircle2,
  Clock
} from 'lucide-react';

import { deviceCache } from '../utils/deviceCache';

const RISK_COLORS = {
  CRITICAL: '#f87171',
  HIGH:     '#fb923c',
  MEDIUM:   '#fbbf24',
  LOW:      '#34d399',
  UNKNOWN:  '#94a3b8',
};

export default function ScansPage() {
  const navigate = useNavigate();
  // Initialize directly from local device cache memory
  const [scans, setScans] = useState(() => deviceCache.getScans());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    scansApi.list({ limit: 100 })
      .then(res => {
        if (res?.data?.scans && res.data.scans.length > 0) {
          res.data.scans.forEach(s => deviceCache.saveScan(s));
          setScans(deviceCache.getScans());
        }
      })
      .catch(() => {
        // Fall back to device cache
        setScans(deviceCache.getScans());
      });
  }, []);

  const filtered = scans.filter(s => {
    const matchesFilter = filter ? (s.risk_level === filter || s.status === filter) : true;
    const matchesSearch = searchQuery
      ? s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.scan_type && s.scan_type.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Title & Top Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Scan Inventory & History
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {scans.length} total security evaluations stored in local device cache memory (Zero DB).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            onClick={() => deviceCache.exportCacheAsJson()}
            title="Download JSON backup of all scans stored in device memory"
          >
            Export Cache Backup
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/upload')}
          >
            <UploadCloud size={16} />
            <span>Upload & Scan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
            placeholder="Search by Scan ID or Type…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: '0.25rem', textTransform: 'uppercase' }}>
            Filter:
          </span>
          {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'COMPLETED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', height: 32 }}
            >
              {f || 'All Scans'}
            </button>
          ))}
        </div>
      </div>

      {/* Scans Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.875rem' }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Loading scan logs…</span>
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Scan Identifier</th>
                  <th>Scanner Type</th>
                  <th>Execution State</th>
                  <th>Risk Tier</th>
                  <th>Risk Score</th>
                  <th>Findings</th>
                  <th>Completed At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(scan => (
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
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                        {scan.scan_type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${(scan.status || '').toLowerCase()}`}>
                        {scan.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${(scan.risk_level || 'info').toLowerCase()}`}>
                        {scan.risk_level || 'UNKNOWN'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: RISK_COLORS[scan.risk_level] || '#94a3b8',
                      }}>
                        {scan.risk_score ?? '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {scan.findings?.length ?? '—'}
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
                        <span>Details</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
            <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: '#94a3b8' }}>No scans matched your query</p>
            <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>Try clearing the active filter or search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
