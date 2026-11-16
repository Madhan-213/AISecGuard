/**
 * AISecGuard — Scan Inventory & History Page
 * Week 6: Loads scans from backend with deviceCache fallback.
 * Filterable by risk level / status, searchable by ID or type.
 * Shows total count, links to detail view, and supports CSV export.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scansApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  Search,
  UploadCloud,
  ArrowUpRight,
  FileText,
  RefreshCw,
  WifiOff,
  Wifi,
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
  const toast = useToast();

  const [scans, setScans] = useState(() => deviceCache.getScans());
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadScans = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await scansApi.list({ limit: 200 });
      if (res?.data?.scans) {
        res.data.scans.forEach(s => deviceCache.saveScan(s));
        setScans(deviceCache.getScans());
        setBackendOnline(true);
      }
    } catch {
      setBackendOnline(false);
      setScans(deviceCache.getScans());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScans();
  }, []);

  const filtered = scans.filter(s => {
    const matchesFilter = filter
      ? (s.risk_level === filter || s.status === filter)
      : true;
    const q = searchQuery.toLowerCase();
    const matchesSearch = q
      ? s.id.toLowerCase().includes(q) ||
        (s.scan_type && s.scan_type.toLowerCase().includes(q))
      : true;
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: '100%', margin: '0 auto' }}>
      {/* ── Title & Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
            Scan Inventory & History
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
            {backendOnline ? (
              <><Wifi size={13} style={{ color: '#10b981' }} /><span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Live</span></>
            ) : (
              <><WifiOff size={13} style={{ color: '#fbbf24' }} /><span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>Cache</span></>
            )}
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem' }}>
              · {scans.length} total security evaluations
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            onClick={() => {
              loadScans(false);
              toast.info('Scan inventory refreshed.');
            }}
            title="Refresh scan list"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            onClick={() => {
              deviceCache.exportCacheAsJson();
              toast.success('Local scan backup downloaded.');
            }}
            title="Download JSON backup of all scan data"
          >
            Export Backup
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

      {/* ── Filter & Search Controls ── */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            id="scan-search"
            className="input"
            style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
            placeholder="Search by Scan ID or Type…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: '0.25rem', textTransform: 'uppercase' }}>
            Filter:
          </span>
          {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'COMPLETED', 'FAILED'].map(f => (
            <button
              key={f}
              id={`filter-${f || 'all'}`}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', height: 32 }}
            >
              {f || 'All Scans'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scans Table ── */}
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
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
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
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {scan.findings?.length ?? scan.findings_count ?? '—'}
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
            <p style={{ fontWeight: 600, color: '#94a3b8' }}>
              {searchQuery || filter ? 'No scans matched your query' : 'No scans recorded yet'}
            </p>
            <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
              {searchQuery || filter
                ? 'Try clearing the active filter or search term.'
                : 'Upload an AI/ML artifact to begin your first scan.'}
            </p>
            {!searchQuery && !filter && (
              <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => navigate('/upload')}>
                Upload First Artifact
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
