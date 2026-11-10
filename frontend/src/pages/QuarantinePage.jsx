/**
 * AISecGuard — Quarantine Containment Management Page
 * Isolated artifacts containment, administrative release modal, and chain-of-custody logging.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { artifactsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  Lock,
  Unlock,
  Layers,
  Percent,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

import { deviceCache } from '../utils/deviceCache';

export default function QuarantinePage() {
  const [searchParams] = useSearchParams();
  const preselectedArtifact = searchParams.get('artifact');
  const toast = useToast();

  // Initialize from local device cache memory
  const [all, setAll] = useState(() => deviceCache.getArtifacts());
  const [quarantined, setQuarantined] = useState(() => deviceCache.getArtifacts().filter(a => a.status === 'QUARANTINED'));
  const [loading, setLoading] = useState(false);

  // Quarantine / Release modal state
  const [modal, setModal] = useState(null); // { mode: 'quarantine'|'release', artifact }
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    artifactsApi.list({ limit: 200 })
      .then(res => {
        const arts = res.data.artifacts || [];
        if (arts.length > 0) {
          arts.forEach(a => deviceCache.saveArtifact(a));
          const updated = deviceCache.getArtifacts();
          setAll(updated);
          setQuarantined(updated.filter(a => a.status === 'QUARANTINED'));
        }

        // Auto-open modal if artifact= query param is specified
        if (preselectedArtifact) {
          const list = deviceCache.getArtifacts();
          const art = list.find(a => a.id === preselectedArtifact);
          if (art && art.status !== 'QUARANTINED') {
            setModal({ mode: 'quarantine', artifact: art });
          }
        }
      })
      .catch(() => {
        // Fall back to device cache
        const updated = deviceCache.getArtifacts();
        setAll(updated);
        setQuarantined(updated.filter(a => a.status === 'QUARANTINED'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [preselectedArtifact]);

  const handleAction = async () => {
    if (!reason.trim()) {
      setError('A justification reason is required for the audit record.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      if (modal.mode === 'quarantine') {
        try { await artifactsApi.quarantine(modal.artifact.id, reason); } catch (e) { console.warn(e); }
        deviceCache.quarantineArtifact(modal.artifact.id, reason);
      } else {
        try { await artifactsApi.release(modal.artifact.id, reason); } catch (e) { console.warn(e); }
        deviceCache.releaseArtifact(modal.artifact.id, reason);
      }
      // Refresh list from device memory
      const updated = deviceCache.getArtifacts();
      setAll(updated);
      setQuarantined(updated.filter(a => a.status === 'QUARANTINED'));
      toast.success(modal.mode === 'quarantine' ? `Artifact "${modal.artifact.original_filename}" moved to quarantine.` : `Artifact "${modal.artifact.original_filename}" released from quarantine.`);
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
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1150, margin: '0 auto' }}>
      {/* Title & Description */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
          Containment & Quarantine Vault
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Isolated high-threat AI artifacts restricted from deployment pipelines and runtime services.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              Currently Quarantined
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f87171', lineHeight: 1.1 }}>
            {quarantined.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            Restricted from production access
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              Total Repository Artifacts
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>
            {all.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            Ingested models, datasets & dependencies
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
              Containment Ratio
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: quarantineRate > 0 ? '#fb923c' : '#34d399', lineHeight: 1.1 }}>
            {quarantineRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            Of scanned inventory isolated
          </div>
        </div>
      </div>

      {/* Quarantined Artifacts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Isolated Artifact Inventory
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
              Physically isolated in <code>uploads/quarantine/</code>
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.875rem' }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Loading quarantine records…</span>
          </div>
        ) : quarantined.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Original Artifact Filename</th>
                  <th>Classification</th>
                  <th>Payload Size</th>
                  <th>SHA-256 Digest</th>
                  <th>Upload Date</th>
                  <th style={{ textAlign: 'right' }}>Containment Actions</th>
                </tr>
              </thead>
              <tbody>
                {quarantined.map(art => (
                  <tr key={art.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Lock size={15} style={{ color: '#f87171' }} />
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{art.original_filename}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{art.artifact_type}</span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                      {(art.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.78rem', color: '#93c5fd' }}>
                        {art.sha256?.slice(0, 16)}…
                      </span>
                    </td>
                    <td style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      {new Date(art.uploaded_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        id={`btn-release-${art.id}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', gap: '0.35rem' }}
                        onClick={() => {
                          setModal({ mode: 'release', artifact: art });
                          setReason('');
                          setError('');
                        }}
                      >
                        <Unlock size={14} style={{ color: '#34d399' }} />
                        <span>Authorize Release</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
            <CheckCircle2 size={42} style={{ color: '#10b981', margin: '0 auto 0.75rem', opacity: 0.8 }} />
            <p style={{ fontWeight: 600, color: '#34d399', fontSize: '1rem' }}>No Quarantined Assets</p>
            <p style={{ fontSize: '0.825rem', marginTop: '0.25rem', color: '#94a3b8' }}>
              All ingested models and dependencies are currently in valid deployment states.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Action Modal */}
      {modal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 16, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
            <button
              type="button"
              onClick={() => { setModal(null); setReason(''); setError(''); }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: modal.mode === 'quarantine' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: modal.mode === 'quarantine' ? '#f87171' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {modal.mode === 'quarantine' ? <Lock size={18} /> : <Unlock size={18} />}
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {modal.mode === 'quarantine' ? 'Quarantine AI Artifact' : 'Release from Quarantine'}
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Chain-of-Custody Audit Entry
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', background: 'var(--color-card-subtle-bg)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
              Target: <strong style={{ color: 'var(--color-text)' }}>{modal.artifact.original_filename}</strong>
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" htmlFor="modal-reason">
                {modal.mode === 'quarantine' ? 'Quarantine Justification *' : 'Release Authorization Note *'}
              </label>
              <textarea
                id="modal-reason"
                className="input"
                rows={3}
                placeholder={modal.mode === 'quarantine'
                  ? 'e.g., Critical RCE pickle opcode detected during static scan'
                  : 'e.g., False positive confirmed by ML security engineer — approved for use'}
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ resize: 'vertical' }}
                autoFocus
              />
            </div>

            {error && (
              <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setModal(null); setReason(''); setError(''); }}
              >
                Cancel
              </button>
              <button
                id="btn-modal-confirm"
                type="button"
                className={`btn ${modal.mode === 'quarantine' ? 'btn-danger' : 'btn-primary'}`}
                disabled={actionLoading}
                onClick={handleAction}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner" style={{ width: 15, height: 15 }} />
                    <span>Recording Event…</span>
                  </>
                ) : (
                  modal.mode === 'quarantine' ? 'Enforce Quarantine' : 'Authorize & Release'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
