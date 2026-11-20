/**
 * AISecGuard — Quarantine & Isolation Page
 * Redesigned with the modern cybersecurity SaaS dark navy theme.
 * Features:
 * - Squircle header with AI shield visual badge
 * - Isolated status warning panel
 * - 3 KPI metric cards (Quarantined, Total Artifacts, Containment Rate)
 * - Quarantined artifacts table with release action and report links
 * - Glassmorphic audit release/quarantine modal with justification logging
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { artifactsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../hooks/useTheme';
import {
  Lock,
  Unlock,
  Layers,
  Percent,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldAlert,
  FileSearch,
  Shield,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { deviceCache } from '../utils/deviceCache';

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

export default function QuarantinePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedArtifact = searchParams.get('artifact');
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [all, setAll] = useState(() => deviceCache.getArtifacts());
  const [quarantined, setQuarantined] = useState(() => deviceCache.getArtifacts().filter((a) => a.status === 'QUARANTINED'));
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadArtifacts = () => {
    setLoading(true);
    artifactsApi
      .list({ limit: 200 })
      .then((res) => {
        const arts = res.data.artifacts || [];
        if (arts.length > 0) {
          arts.forEach((a) => deviceCache.saveArtifact(a));
          const updated = deviceCache.getArtifacts();
          setAll(updated);
          setQuarantined(updated.filter((a) => a.status === 'QUARANTINED'));
        }
        if (preselectedArtifact) {
          const list = deviceCache.getArtifacts();
          const art = list.find((a) => a.id === preselectedArtifact);
          if (art && art.status !== 'QUARANTINED') {
            setModal({ mode: 'quarantine', artifact: art });
          }
        }
      })
      .catch(() => {
        const updated = deviceCache.getArtifacts();
        setAll(updated);
        setQuarantined(updated.filter((a) => a.status === 'QUARANTINED'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadArtifacts();
  }, [preselectedArtifact]);

  const handleAction = async () => {
    if (!reason.trim()) {
      setError('A justification reason is required for the audit trail.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      if (modal.mode === 'quarantine') {
        try {
          await artifactsApi.quarantine(modal.artifact.id, reason);
        } catch (e) {
          console.warn(e);
        }
        deviceCache.quarantineArtifact(modal.artifact.id, reason);
      } else {
        try {
          await artifactsApi.release(modal.artifact.id, reason);
        } catch (e) {
          console.warn(e);
        }
        deviceCache.releaseArtifact(modal.artifact.id, reason);
      }
      const updated = deviceCache.getArtifacts();
      setAll(updated);
      setQuarantined(updated.filter((a) => a.status === 'QUARANTINED'));
      toast.success(
        modal.mode === 'quarantine'
          ? `Artifact "${modal.artifact.original_filename}" moved to quarantine.`
          : `Artifact "${modal.artifact.original_filename}" released from quarantine.`
      );
      setModal(null);
      setReason('');
    } catch (err) {
      const errText = err.response?.data?.detail || 'Operation failed.';
      setError(errText);
      toast.error(errText);
    } finally {
      setActionLoading(false);
    }
  };

  const quarantineRate = all.length ? Math.round((quarantined.length / all.length) * 100) : 0;

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
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(147, 51, 234, 0.2) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              boxShadow: '0 8px 20px -4px rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            <Lock size={24} />
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
              Quarantine &amp; Isolation
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
              <span>Restricted and isolated AI artifacts blocked from production use.</span>
            </div>
          </div>
        </div>

        {/* Right side: AI Security Shield Badge + Counter */}
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
                background:
                  quarantined.length > 0
                    ? 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(168, 85, 247, 0.15) 50%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />
            <img
              src="/logos/logo-shield.png"
              alt="AISecGuard Shield"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                position: 'relative',
                filter:
                  quarantined.length > 0
                    ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.45))'
                    : 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.45))',
              }}
            />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: quarantined.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${quarantined.length > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              borderRadius: 999,
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: quarantined.length > 0 ? '#ef4444' : '#10b981',
            }}
          >
            <Lock size={15} />
            <span>{quarantined.length} Quarantined</span>
          </div>
        </div>
      </div>

      {/* ── Warning & Isolation Notice Banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
          border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 14,
          padding: '1rem 1.4rem',
          marginBottom: '1.75rem',
          color: isDark ? '#fca5a5' : '#b91c1c',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <ShieldAlert size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
        <span style={{ fontSize: '0.86rem', fontWeight: 500, lineHeight: 1.4 }}>
          <strong>Containment Protocol Active:</strong> Quarantined artifacts are strictly isolated in secure storage. They cannot be executed, integrated into pipelines, or deployed until an authorized analyst grants release.
        </span>
      </div>

      {/* ── 3 Summary KPI Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Quarantined Count */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '1.15rem 1.35rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Quarantined
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>
              {quarantined.length}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Blocked from production
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={20} />
          </div>
        </div>

        {/* Total Artifacts */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '1.15rem 1.35rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Total Workspace Artifacts
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.2rem' }}>
              {all.length}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Models, datasets &amp; deps
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={20} />
          </div>
        </div>

        {/* Containment Rate */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: '1.15rem 1.35rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
              Containment Rate
            </div>
            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: quarantineRate > 0 ? '#f59e0b' : '#10b981',
                marginTop: '0.2rem',
              }}
            >
              {quarantineRate}%
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Of active inventory
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Percent size={20} />
          </div>
        </div>
      </div>

      {/* ── Quarantined Artifacts Table Panel ── */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: 'var(--card-shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Isolated Artifact Inventory
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.2rem 0 0' }}>
              Physical path: <code className="font-mono">uploads/quarantine/</code>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadArtifacts}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : undefined} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem' }}>
            <span className="spinner" style={{ width: 26, height: 26 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Checking quarantine inventory…</span>
          </div>
        ) : quarantined.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', minWidth: 650 }}>
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
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Threat Level</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Quarantined On</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Findings</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quarantined.map((art) => {
                  const risk = getRiskBadge(art.risk_level || art.latest_risk_level);
                  const typeBadge = getTypeBadge(art.artifact_type);
                  const scanDate = art.last_scan_at || art.uploaded_at;
                  const findingsCount = art.findings_count ?? art.latest_findings_count ?? '—';

                  return (
                    <tr
                      key={art.id}
                      style={{
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
                      {/* Name */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Lock size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              maxWidth: 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={art.original_filename}
                          >
                            {art.original_filename}
                          </span>
                        </div>
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

                      {/* Threat Level */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 999,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: risk.color,
                            background: risk.bg,
                            border: `1px solid ${risk.border}`,
                          }}
                        >
                          {risk.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {formatDateTime(scanDate)}
                      </td>

                      {/* Findings */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        {findingsCount}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            onClick={() => navigate(`/scans?artifact=${art.id}`)}
                            title="Inspect scan report for this artifact"
                          >
                            <FileSearch size={14} />
                            <span>Report</span>
                          </button>
                          <button
                            id={`btn-release-${art.id}`}
                            type="button"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              padding: '0.35rem 0.75rem',
                              borderRadius: 8,
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                            }}
                            onClick={() => {
                              setModal({ mode: 'release', artifact: art });
                              setReason('');
                              setError('');
                            }}
                          >
                            <Unlock size={14} />
                            <span>Release</span>
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
            <CheckCircle2 size={46} style={{ color: '#10b981', margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.1rem', margin: '0 0 0.35rem' }}>
              All Clear — Zero Quarantined Artifacts
            </p>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', maxWidth: 440, margin: '0 auto' }}>
              All evaluated models, datasets, and dependencies are currently authorized for pipeline use. Run regular scans to detect tampering and supply chain threats.
            </p>
          </div>
        )}
      </div>

      {/* ── Release / Quarantine Modal ── */}
      {modal && (
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
              maxWidth: 480,
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
              onClick={() => {
                setModal(null);
                setReason('');
                setError('');
              }}
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
                  background: modal.mode === 'quarantine' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: modal.mode === 'quarantine' ? '#ef4444' : '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${modal.mode === 'quarantine' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                }}
              >
                {modal.mode === 'quarantine' ? <Lock size={20} /> : <Unlock size={20} />}
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                  {modal.mode === 'quarantine' ? 'Quarantine Artifact' : 'Release from Quarantine'}
                </h2>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Chain-of-Custody Security Audit Log</div>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.84rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1.25rem',
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                padding: '0.65rem 0.85rem',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
              }}
            >
              Target Artifact: <strong style={{ color: 'var(--color-text)' }}>{modal.artifact.original_filename}</strong>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                className="label"
                htmlFor="modal-reason"
                style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}
              >
                {modal.mode === 'quarantine' ? 'Quarantine Justification *' : 'Release Authorization Reason *'}
              </label>
              <textarea
                id="modal-reason"
                className="input"
                rows={3}
                placeholder={
                  modal.mode === 'quarantine'
                    ? 'e.g., Critical RCE pickle opcode detected during AST inspection'
                    : 'e.g., False positive verified by security analyst — authorized for pipeline'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ resize: 'vertical', fontSize: '0.85rem' }}
                autoFocus
              />
            </div>

            {error && (
              <div className="alert-error" style={{ marginBottom: '1.25rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setModal(null);
                  setReason('');
                  setError('');
                }}
              >
                Cancel
              </button>
              <button
                id="btn-modal-confirm"
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '0.5rem 1.1rem',
                  borderRadius: 10,
                  color: '#ffffff',
                  background:
                    modal.mode === 'quarantine'
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                  boxShadow:
                    modal.mode === 'quarantine'
                      ? '0 4px 14px rgba(239, 68, 68, 0.4)'
                      : '0 4px 14px rgba(16, 185, 129, 0.4)',
                }}
                disabled={actionLoading}
                onClick={handleAction}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner" style={{ width: 15, height: 15 }} />
                    <span>Processing…</span>
                  </>
                ) : modal.mode === 'quarantine' ? (
                  'Enforce Quarantine'
                ) : (
                  'Authorize & Release'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
