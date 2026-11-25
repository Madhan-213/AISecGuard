/**
 * AISecGuard — Dataset Analysis Page
 * Security and integrity analysis for AI training and evaluation datasets (CSV, JSON, Parquet).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Search,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileSpreadsheet,
  Binary,
  Layers,
  Sparkles,
} from 'lucide-react';
import { artifactsApi, scansApi, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function DatasetAnalysisPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await artifactsApi.list({ limit: 100 });
      const allArts = res.data?.artifacts || [];
      const dsArts = allArts.filter(
        (a) => (a.artifact_type || '').toUpperCase() === 'DATASET' ||
               ['.csv', '.json', '.tsv', '.parquet'].some((ext) =>
                 a.original_filename?.toLowerCase().endsWith(ext)
               )
      );
      setDatasets(dsArts);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading dataset inventory.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleScan = async (id) => {
    try {
      toast.info('Triggering dataset integrity and poisoning scan...');
      const res = await scansApi.create(id);
      navigate(`/scans/${res.data.id}/progress`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to trigger scan.'));
    }
  };

  const filteredDatasets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return datasets;
    return datasets.filter(
      (d) =>
        d.original_filename?.toLowerCase().includes(q) ||
        d.sha256?.toLowerCase().includes(q)
    );
  }, [datasets, searchQuery]);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)' }}>
            <Database size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Dataset Security Analysis
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Training data poisoning heuristics, script injection detection, and distribution anomaly checks.
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
        >
          Scan New Dataset
        </button>
      </div>

      {/* Dataset Security Safeguards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ec4899', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <ShieldAlert size={16} />
            <span>Data Poisoning Detection</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Identifies sudden label skew, flipped classes, adversarial triggers, and duplicate rows injected to degrade model training accuracy.
          </p>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#eab308', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <Binary size={16} />
            <span>Malicious Payload Injection</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Scans text columns for embedded HTML, base64 blobs, command execution strings, and unescaped prompt injection payloads.
          </p>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <Sparkles size={16} />
            <span>Lineage Version Tracking</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Tracks dataset provenance across fine-tuning iterations to ensure training runs only use verified, cryptographically signed data.
          </p>
        </div>
      </div>

      {/* Dataset Inventory */}
      <div className="card" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Ingested Datasets ({filteredDatasets.length})
          </h2>

          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search dataset name or hash..."
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

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Loading dataset catalog…</div>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Database size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No training datasets uploaded yet.</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Upload a CSV, JSON, or TSV dataset to analyze poisoning and leakage.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredDatasets.map((d) => (
              <div
                key={d.id}
                style={{
                  background: 'var(--color-table-header-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
                className="card-hover-border"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Database size={18} />
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.original_filename}>
                          {d.original_filename}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {(d.file_size / 1024).toFixed(1)} KB • {d.file_extension || 'Dataset'}
                        </div>
                      </div>
                    </div>
                    <span className={`badge badge-${d.status === 'QUARANTINED' ? 'critical' : d.status === 'SCANNED' ? 'low' : 'info'}`} style={{ fontSize: '0.7rem' }}>
                      {d.status}
                    </span>
                  </div>

                  <div style={{ background: 'var(--color-bg)', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: '1rem', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Format:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Structured Tabular / JSON</span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      SHA-256: {d.sha256}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    onClick={() => navigate('/artifacts')}
                  >
                    Registry Details
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={() => handleScan(d.id)}
                  >
                    <Play size={12} />
                    <span>Run Dataset Scan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
