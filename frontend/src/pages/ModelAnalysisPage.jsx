/**
 * AISecGuard — Model Analysis Page
 * Dedicated security inspection center for AI Model files (PyTorch, Pickle, SafeTensors, ONNX).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Play,
  FileCode,
  CheckCircle2,
  Lock,
  Code2,
  Terminal,
} from 'lucide-react';
import { artifactsApi, scansApi, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ModelAnalysisPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await artifactsApi.list({ limit: 100 });
      const allArts = res.data?.artifacts || [];
      const modelArts = allArts.filter(
        (a) => (a.artifact_type || '').toUpperCase() === 'MODEL' ||
               ['.pt', '.pth', '.pkl', '.bin', '.onnx', '.h5', '.safetensors'].some((ext) =>
                 a.original_filename?.toLowerCase().endsWith(ext)
               )
      );
      setModels(modelArts);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading model inventory.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleScan = async (id) => {
    try {
      toast.info('Triggering model AST inspection...');
      const res = await scansApi.create(id);
      navigate(`/scans/${res.data.id}/progress`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to trigger scan.'));
    }
  };

  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.original_filename?.toLowerCase().includes(q) ||
        m.sha256?.toLowerCase().includes(q)
    );
  }, [models, searchQuery]);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)' }}>
            <Cpu size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Model Security Analysis
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Deep static bytecode inspection, PyTorch unpickler AST checks, and backdoor detection.
            </p>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/upload')}
          style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
        >
          Scan New Model
        </button>
      </div>

      {/* Heuristic Capabilities Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <Terminal size={16} />
            <span>Pickle AST Bytecode Sandbox</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Intercepts <code style={{ color: '#ec4899' }}>GLOBAL</code> opcodes attempting <code style={{ color: '#ec4899' }}>os.system</code>, <code style={{ color: '#ec4899' }}>subprocess.Popen</code>, or socket connections without executing untrusted weights.
          </p>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0ea5e9', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <Lock size={16} />
            <span>Format Safety Rating</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Evaluates format resilience (SafeTensors is immune to arbitrary deserialization; legacy Pickle/PyTorch carries inherent RCE vulnerability).
          </p>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <CheckCircle2 size={16} />
            <span>Zero Weight Execution</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            100% passive static stream inspection. Analysis never invokes <code style={{ color: '#10b981' }}>torch.load()</code> or python <code style={{ color: '#10b981' }}>pickle.loads()</code> directly.
          </p>
        </div>
      </div>

      {/* Model Inventory */}
      <div className="card" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Ingested AI Models ({filteredModels.length})
          </h2>

          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search model name or hash..."
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
            <div>Loading AI models…</div>
          </div>
        ) : filteredModels.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Cpu size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No AI models uploaded yet.</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Upload a .pt, .pkl, or .onnx model in Upload & Scan to analyze it.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredModels.map((m) => {
              const ext = m.file_extension?.toLowerCase() || '';
              const isSafeFormat = ext === '.safetensors';
              return (
                <div
                  key={m.id}
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
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Cpu size={18} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.original_filename}>
                            {m.original_filename}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {(m.file_size / (1024 * 1024)).toFixed(2)} MB • {m.file_extension || 'Model'}
                          </div>
                        </div>
                      </div>
                      <span className={`badge badge-${m.status === 'QUARANTINED' ? 'critical' : m.status === 'SCANNED' ? 'low' : 'info'}`} style={{ fontSize: '0.7rem' }}>
                        {m.status}
                      </span>
                    </div>

                    <div style={{ background: 'var(--color-bg)', padding: '0.65rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: '1rem', fontSize: '0.72rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Format Safety:</span>
                        <span style={{ fontWeight: 600, color: isSafeFormat ? '#10b981' : '#f97316' }}>
                          {isSafeFormat ? 'Safe (No Pickle)' : 'Pickle Based (Inspect)'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        SHA-256: {m.sha256}
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
                      onClick={() => handleScan(m.id)}
                    >
                      <Play size={12} />
                      <span>Run AST Scan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
