/**
 * AISecGuard — Integrity & Provenance Page
 * Cryptographic SHA-256 verification, Ed25519 digital signatures, and tamper detection.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Cpu,
  Database,
  FileCode,
  Archive,
} from 'lucide-react';
import { integrityApi, supplyChainApi, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import PaginationControl from '../components/PaginationControl';

export default function IntegrityProvenancePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signingId, setSigningId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, currentPage, PAGE_SIZE]);

  const fetchIntegrity = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await integrityApi.overview();
      setItems(res.data?.items || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading integrity verification status.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrity();
  }, []);

  const stats = useMemo(() => {
    let verified = 0;
    let signed = 0;
    let tampered = 0;
    let unsigned = 0;

    for (const item of items) {
      if (item.disk_integrity_ok) verified++;
      else tampered++;
      if (item.is_signed) signed++;
      else unsigned++;
    }

    return {
      total: items.length,
      verified,
      signed,
      tampered,
      unsigned,
    };
  }, [items]);

  const handleSign = async (artifactId) => {
    try {
      setSigningId(artifactId);
      await supplyChainApi.sign(artifactId);
      toast.success('Artifact cryptographically approved and signed with Ed25519 key.');
      await fetchIntegrity();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Signing failed. Artifact must be completed scan and meet policy.'));
    } finally {
      setSigningId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Hash copied to clipboard!');
  };

  const getTypeIcon = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('MODEL')) return <Cpu size={15} className="text-purple-400" />;
    if (t.includes('DATASET')) return <Database size={15} className="text-pink-400" />;
    if (t.includes('DEP')) return <FileCode size={15} className="text-amber-400" />;
    return <Archive size={15} className="text-emerald-400" />;
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}>
            <Fingerprint size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Integrity & Provenance
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Cryptographic SHA-256 baseline verification, Ed25519 digital signatures, and supply chain anti-tamper.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchIntegrity}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={14} />
          <span>Verify Hashes</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hash Verified
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', marginTop: '0.3rem' }}>
            {stats.verified} / {stats.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Storage match vs ingestion hash
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Digitally Signed
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.3rem' }}>
            {stats.signed}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Ed25519 signed releases
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tampered / Mismatched
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', marginTop: '0.3rem' }}>
            {stats.tampered}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Corrupted or substituted files
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Unsigned Models
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
            {stats.unsigned}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Pending analyst sign-off
          </div>
        </div>
      </div>

      {/* Verification Table */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Computing cryptographic hashes…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Fingerprint size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No artifacts in registry to verify.</div>
          </div>
        ) : (
          <>
            <PaginationControl
              currentPage={currentPage}
              totalItems={items.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="integrity records"
            />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Artifact</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Asset Type</th>
                    <th style={{ padding: '0.85rem 1rem' }}>SHA-256 Digest</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Disk Storage Match</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Ed25519 Signature</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Integrity Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                  <tr
                    key={item.artifact_id}
                    style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        {getTypeIcon(item.artifact_type)}
                        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.filename}>
                          {item.filename}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      {item.artifact_type}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <code style={{ fontSize: '0.72rem', background: 'var(--color-bg)', padding: '0.15rem 0.35rem', borderRadius: 4, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                          {item.sha256}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.sha256)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
                          title="Copy SHA-256"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {item.disk_integrity_ok ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          <AlertTriangle size={13} /> Tampered
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {item.is_signed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <ShieldCheck size={14} className="text-emerald-400" />
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Signed</span>
                          {item.signer_email && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>({item.signer_email})</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          Unsigned
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge badge-${item.status === 'VERIFIED' ? 'low' : item.status === 'TAMPERED' ? 'critical' : 'info'}`} style={{ fontSize: '0.72rem' }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {!item.is_signed ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                          onClick={() => handleSign(item.artifact_id)}
                          disabled={signingId === item.artifact_id}
                          title="Sign with Ed25519 key"
                        >
                          <KeyRound size={13} />
                          <span style={{ marginLeft: '0.3rem' }}>{signingId === item.artifact_id ? 'Signing…' : 'Sign'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => navigate('/supply-chain')}
                          title="Inspect signature & lineage"
                        >
                          Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
