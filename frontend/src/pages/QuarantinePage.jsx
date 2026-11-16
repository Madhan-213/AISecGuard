/**
 * AISecGuard — Quarantine Page (Modern SaaS Light Theme)
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  ShieldAlert,
  FileSearch,
} from 'lucide-react';
import { deviceCache } from '../utils/deviceCache';

const RISK_BADGE = {
  CRITICAL: { cls: 'badge-critical', label: 'Critical' },
  HIGH:     { cls: 'badge-high',     label: 'High' },
  MEDIUM:   { cls: 'badge-medium',   label: 'Medium' },
  LOW:      { cls: 'badge-low',      label: 'Low' },
};

function getRiskBadge(art) {
  const level = art.risk_level || art.latest_risk_level || 'LOW';
  return RISK_BADGE[level] || { cls: 'badge-info', label: level || 'Unknown' };
}

export default function QuarantinePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedArtifact = searchParams.get('artifact');
  const toast = useToast();

  const [all, setAll] = useState(() => deviceCache.getArtifacts());
  const [quarantined, setQuarantined] = useState(() => deviceCache.getArtifacts().filter(a => a.status === 'QUARANTINED'));
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(null);
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
        if (preselectedArtifact) {
          const list = deviceCache.getArtifacts();
          const art = list.find(a => a.id === preselectedArtifact);
          if (art && art.status !== 'QUARANTINED') {
            setModal({ mode: 'quarantine', artifact: art });
          }
        }
      })
      .catch(() => {
        const updated = deviceCache.getArtifacts();
        setAll(updated);
        setQuarantined(updated.filter(a => a.status === 'QUARANTINED'));
      })
      .finally(() => setLoading(false));
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
      const updated = deviceCache.getArtifacts();
      setAll(updated);
      setQuarantined(updated.filter(a => a.status === 'QUARANTINED'));
      toast.success(modal.mode === 'quarantine'
        ? `Artifact "${modal.artifact.original_filename}" moved to quarantine.`
        : `Artifact "${modal.artifact.original_filename}" released from quarantine.`);
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
    <div className="fade-in" style={{ padding: '1.75rem 2rem', maxWidth: 1150, margin: '0 auto' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Quarantine
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Artifacts blocked from use due to security violations
          </p>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: quarantined.length > 0 ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${quarantined.length > 0 ? '#FCA5A5' : '#BBF7D0'}`,
          borderRadius: 20,
          padding: '0.4rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: quarantined.length > 0 ? '#DC2626' : '#16A34A',
        }}>
          <Lock size={15} />
          {quarantined.length} Quarantined
        </div>
      </div>

      {/* Warning Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 10,
        padding: '0.875rem 1.25rem',
        marginBottom: '1.75rem',
        color: '#92400E',
        fontSize: '0.875rem',
        fontWeight: 500,
      }}>
        <ShieldAlert size={18} style={{ color: '#D97706', flexShrink: 0 }} />
        <span>These artifacts have been isolated — they cannot be used in production systems</span>
      </div>

      {/* Stat Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Quarantined</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={15} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>{quarantined.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>Restricted from production</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Total Artifacts</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(79,126,247,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={15} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{all.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>Models, datasets &amp; deps</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Containment Rate</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={15} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: quarantineRate > 0 ? '#F59E0B' : '#10B981', lineHeight: 1 }}>{quarantineRate}%</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>Of scanned inventory</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Quarantined Artifacts</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>Isolated in <code>uploads/quarantine/</code></p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem' }}>
            <span className="spinner" style={{ width: 26, height: 26 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>Loading quarantine records…</span>
          </div>
        ) : quarantined.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Type</th>
                  <th>Threat Level</th>
                  <th>Scan Date</th>
                  <th>Findings</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quarantined.map(art => {
                  const risk = getRiskBadge(art);
                  const findingsCount = art.findings_count ?? art.latest_findings_count ?? '—';
                  const scanDate = art.last_scan_at || art.uploaded_at;
                  return (
                    <tr key={art.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Lock size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{art.original_filename}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-info">{art.artifact_type}</span></td>
                      <td><span className={`badge ${risk.cls}`}>{risk.label}</span></td>
                      <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                        {scanDate ? new Date(scanDate).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                        {findingsCount}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                            onClick={() => navigate(`/scans?artifact=${art.id}`)}
                          >
                            <FileSearch size={13} />
                            <span>View Report</span>
                          </button>
                          <button
                            id={`btn-release-${art.id}`}
                            className="btn btn-danger"
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
                            onClick={() => { setModal({ mode: 'release', artifact: art }); setReason(''); setError(''); }}
                          >
                            <Unlock size={13} />
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
            <CheckCircle2 size={48} style={{ color: '#10B981', margin: '0 auto 0.875rem', display: 'block' }} />
            <p style={{ fontWeight: 700, color: '#10B981', fontSize: '1.05rem', margin: '0 0 0.35rem' }}>All Clear — No quarantined artifacts</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              All artifacts are in valid deployment states. Run regular scans to maintain security.
            </p>
          </div>
        )}
      </div>

      {/* Release / Quarantine Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1.5rem',
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
            <button
              type="button"
              onClick={() => { setModal(null); setReason(''); setError(''); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: modal.mode === 'quarantine' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                color: modal.mode === 'quarantine' ? '#EF4444' : '#10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {modal.mode === 'quarantine' ? <Lock size={18} /> : <Unlock size={18} />}
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                  {modal.mode === 'quarantine' ? 'Quarantine Artifact' : 'Release from Quarantine'}
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Chain-of-Custody Audit Entry</div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', background: 'var(--color-card-subtle-bg)', padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
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
                  : 'e.g., False positive confirmed — approved for use'}
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
              <button type="button" className="btn btn-ghost" onClick={() => { setModal(null); setReason(''); setError(''); }}>
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
                  <><span className="spinner" style={{ width: 15, height: 15 }} /><span>Processing…</span></>
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
