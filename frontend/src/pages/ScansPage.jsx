/**
 * AISecGuard — Scan Inventory & History Page
 * Redesigned with the modern cybersecurity SaaS dark navy theme.
 * Features:
 * - Squircle header with AI security shield badge
 * - 4 summary KPI metric cards
 * - Search bar with filter pills
 * - Formatted scan table with real backend data and device cache fallback
 * - Full Dark and Light theme support
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { scansApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../hooks/useTheme';
import {
  History,
  Search,
  UploadCloud,
  RefreshCw,
  WifiOff,
  Wifi,
  FileText,
  Eye,
  Trash2,
  X,
  Download,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { deviceCache } from '../utils/deviceCache';

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

export default function ScansPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [scans, setScans] = useState(() => deviceCache.getScans());
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadScans = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await scansApi.list({ limit: 200 });
      if (res?.data?.scans) {
        res.data.scans.forEach((s) => deviceCache.saveScan(s));
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

  const handleDelete = async (scan) => {
    setDeleting(true);
    try {
      await scansApi.delete(scan.id, true);
    } catch (e) {
      console.warn('Backend delete error (falling back to cache):', e);
    }
    deviceCache.deleteScan(scan.id);
    setScans((prev) => prev.filter((s) => s.id !== scan.id));
    toast.success(`Deleted scan "${scan.artifact?.original_filename || scan.id.slice(0, 8)}" and associated files.`);
    setDeleteModal(null);
    setDeleting(false);
  };

  useEffect(() => {
    loadScans();
  }, []);

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      const matchesFilter = filter
        ? s.risk_level === filter || s.status === filter
        : true;
      const q = searchQuery.toLowerCase().trim();
      const filename = s.artifact?.original_filename || s.filename || s.artifact_name || '';
      const matchesSearch = q
        ? s.id.toLowerCase().includes(q) ||
          (s.scan_type && s.scan_type.toLowerCase().includes(q)) ||
          filename.toLowerCase().includes(q)
        : true;
      return matchesFilter && matchesSearch;
    });
  }, [scans, filter, searchQuery]);

  // Summary Metrics
  const criticalHighCount = scans.filter((s) => s.risk_level === 'CRITICAL' || s.risk_level === 'HIGH').length;
  const cleanLowCount = scans.filter((s) => s.risk_level === 'LOW' || s.risk_level === 'CLEAN').length;
  const completedCount = scans.filter((s) => s.status === 'COMPLETED').length;

  return (
    <div className="fade-in" style={{ padding: '1.75rem 2rem', maxWidth: 1240, margin: '0 auto' }}>
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Header Squircle Icon */}
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
            <History size={24} />
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
              Scan History
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
              <span>Automated security evaluations, risk assessments, and vulnerability audits.</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                {backendOnline ? (
                  <>
                    <Wifi size={13} style={{ color: '#10b981' }} />
                    <span style={{ color: '#10b981', fontWeight: 600 }}>Live sync</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={13} style={{ color: '#eab308' }} />
                    <span style={{ color: '#eab308', fontWeight: 600 }}>Cached</span>
                  </>
                )}
                <span>· {scans.length} total evaluations</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right side: AI Security Shield Badge + Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => {
                loadScans(false);
                toast.info('Scan history refreshed.');
              }}
              title="Refresh scan list"
            >
              <RefreshCw size={14} className={loading ? 'spin' : undefined} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => {
                deviceCache.exportCacheAsJson();
                toast.success('Local scan backup downloaded.');
              }}
              title="Download JSON backup of scan records"
            >
              <Download size={14} />
              <span>Export</span>
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
              }}
            >
              <UploadCloud size={15} />
              <span>Upload &amp; Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 Summary Metric Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Total Scans */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '1.1rem 1.25rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Total Scans
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.2rem' }}>
              {scans.length}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Evaluated artifacts
            </div>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={18} />
          </div>
        </div>

        {/* High / Critical Threats */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '1.1rem 1.25rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              High / Critical
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f97316', marginTop: '0.2rem' }}>
              {criticalHighCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Requires mitigation
            </div>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              color: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={18} />
          </div>
        </div>

        {/* Clean / Low Risk */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '1.1rem 1.25rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Clean &amp; Low Risk
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
              {cleanLowCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Safe for deployment
            </div>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Completed */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '1.1rem 1.25rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Completed
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.2rem' }}>
              {completedCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Finished analysis
            </div>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              color: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={18} />
          </div>
        </div>
      </div>

      {/* ── Search Bar & Filter Pills ── */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: '1.1rem 1.4rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            id="scan-search"
            className="input"
            style={{ paddingLeft: '2.3rem', fontSize: '0.85rem' }}
            placeholder="Search by filename, scan ID, or type…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginRight: '0.25rem', textTransform: 'uppercase' }}>
            Filter:
          </span>
          {[
            { key: '', label: 'All Scans' },
            { key: 'CRITICAL', label: 'Critical' },
            { key: 'HIGH', label: 'High' },
            { key: 'MEDIUM', label: 'Medium' },
            { key: 'LOW', label: 'Low' },
            { key: 'COMPLETED', label: 'Completed' },
            { key: 'FAILED', label: 'Failed' },
          ].map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                id={`filter-${f.key || 'all'}`}
                onClick={() => setFilter(f.key)}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: isActive ? 700 : 500,
                  padding: '0.35rem 0.75rem',
                  borderRadius: 999,
                  border: isActive
                    ? '1px solid #8b5cf6'
                    : '1px solid var(--color-border)',
                  background: isActive
                    ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.04)',
                  color: isActive ? '#ffffff' : 'var(--color-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(124, 58, 237, 0.35)' : 'none',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scans Table Panel ── */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem' }}>
            <span className="spinner" style={{ width: 26, height: 26 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Loading scan history…</span>
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textAlign: 'left',
                    background: 'var(--color-table-header-bg)',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Artifact Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Scan ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Risk Tier</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Score</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Findings</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Completed</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((scan) => {
                  const typeBadge = getTypeBadge(scan.scan_type);
                  const riskBadge = getRiskBadge(scan.risk_level);
                  const filename =
                    scan.artifact?.original_filename ||
                    scan.filename ||
                    scan.artifact_name ||
                    `artifact_${scan.artifact_id?.slice(0, 8) || scan.id.slice(0, 8)}`;
                  const scoreDisplay = formatScore(scan.risk_score);
                  const findingsCount = scan.findings?.length ?? scan.findings_count ?? 0;

                  return (
                    <tr
                      key={scan.id}
                      onClick={() => navigate(`/scans/${scan.id}`)}
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
                      {/* Artifact Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <FileText size={16} style={{ color: typeBadge.color, flexShrink: 0 }} />
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={filename}
                          >
                            {filename}
                          </span>
                        </div>
                      </td>

                      {/* Scan ID */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="font-mono" style={{ fontSize: '0.8rem', color: '#8b5cf6' }}>
                          {scan.id.slice(0, 8)}…
                        </span>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '0.85rem 1rem' }}>
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

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge badge-${(scan.status || '').toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                          {scan.status}
                        </span>
                      </td>

                      {/* Risk Tier */}
                      <td style={{ padding: '0.85rem 1rem' }}>
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

                      {/* Score */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        <span>{scoreDisplay}</span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginLeft: 3 }}>/ 10</span>
                      </td>

                      {/* Findings */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--color-text)' }}>
                        {findingsCount}
                      </td>

                      {/* Completed */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {formatDateTime(scan.completed_at || scan.started_at)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/scans/${scan.id}`);
                            }}
                            title="View Scan Report"
                            style={{
                              width: 32,
                              height: 32,
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
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal(scan);
                            }}
                            title="Delete Scanned File & Report"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                              e.currentTarget.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <FileText size={42} style={{ margin: '0 auto 0.75rem', opacity: 0.35, color: '#8b5cf6' }} />
            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1.05rem', margin: '0 0 0.25rem' }}>
              {searchQuery || filter ? 'No scans matched your search criteria' : 'No scans recorded yet'}
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
              {searchQuery || filter
                ? 'Try clearing the active filter or adjusting your search term.'
                : 'Upload an AI model, dataset, or dependency file to begin automated evaluation.'}
            </p>
            {!searchQuery && !filter && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                onClick={() => navigate('/upload')}
              >
                <UploadCloud size={15} />
                <span>Upload First Artifact</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            className="card fade-in"
            style={{
              width: '100%',
              maxWidth: 440,
              position: 'relative',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 18,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              padding: '1.75rem',
            }}
          >
            <button
              type="button"
              onClick={() => setDeleteModal(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                  Delete Scanned File
                </h2>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Permanently remove scan record &amp; file</div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete{' '}
              <strong style={{ color: 'var(--color-text)' }}>
                {deleteModal.artifact?.original_filename || deleteModal.filename || deleteModal.id.slice(0, 8)}
              </strong>
              ? This action will permanently remove the evaluation findings and delete the stored artifact file from storage.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={deleting}
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '0.5rem 1.1rem',
                  borderRadius: 10,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
                onClick={() => handleDelete(deleteModal)}
              >
                {deleting ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
