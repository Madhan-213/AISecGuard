/**
 * AISecGuard — Supply chain panel (scan detail page)
 * Week 8 & Roadmap Task 3.
 * Tabs: signature (approve + verify + key status), lineage graph,
 * EU AI Act Compliance Scorecard (Articles 10 & 15), and exportable documents
 * (CycloneDX 1.5 ML-BOM, CycloneDX 1.6, and generated Model Card).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  GitBranch,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import { apiErrorMessage, scansApi, supplyChainApi } from '../../api/client';
import LineageGraph from './LineageGraph';
import { useToast } from '../../context/ToastContext';

const TABS = [
  { id: 'signature', label: 'Signature', icon: BadgeCheck },
  { id: 'lineage', label: 'Lineage', icon: GitBranch },
  { id: 'compliance', label: 'Compliance & Audit', icon: Scale },
  { id: 'documents', label: 'Documents & ML-BOM', icon: FileText },
];

const STATUS_STYLE = {
  MET: { color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
  PARTIAL: { color: '#fbbf24', bg: 'rgba(202,138,4,0.12)', border: 'rgba(202,138,4,0.35)' },
  GAP: { color: '#f87171', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.35)' },
  NOT_APPLICABLE: { color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)' },
};

const GRADE_STYLE = {
  A: { color: '#34d399', bg: 'rgba(16,185,129,0.15)', border: '#34d399' },
  B: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: '#60a5fa' },
  C: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: '#fbbf24' },
  F: { color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: '#f87171' },
};

const muted = { fontSize: '0.8rem', color: 'var(--color-text-muted)' };
const label = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' };

function download(filename, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Message({ kind, children }) {
  return <div className={kind === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>{children}</div>;
}

function SignatureTab({ artifact, scan, onChanged }) {
  const toast = useToast();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    supplyChainApi.signature(artifact.id).then((r) => setState(r.data)).catch((e) => setError(apiErrorMessage(e)));
  }, [artifact.id]);
  useEffect(load, [load]);

  const sign = async () => {
    setBusy(true);
    setError('');
    try {
      await supplyChainApi.sign(artifact.id);
      toast.success('Artifact successfully signed and approved.');
      load();
      onChanged?.();
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (!state) return <p style={muted}>Checking signature…</p>;
  const sig = state.signature;
  const Icon = !state.signed ? ShieldQuestion : state.valid ? ShieldCheck : ShieldAlert;
  const color = !state.signed ? '#94a3b8' : state.valid ? '#34d399' : '#f87171';
  const risky = ['HIGH', 'CRITICAL'].includes(scan.risk_level);

  return (
    <div>
      {error && <Message kind="error">{error}</Message>}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <Icon size={36} style={{ color, flexShrink: 0 }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontWeight: 700, color, fontSize: '1.05rem' }}>
              {!state.signed ? 'Not signed' : state.valid ? 'Signature valid' : 'Signature INVALID'}
            </span>
            {state.key_status && (
              <span
                className={state.key_status === 'ACTIVE' ? 'badge badge-success' : 'badge badge-info'}
                style={{ fontSize: '0.68rem' }}
              >
                KEY: {state.key_status}
              </span>
            )}
          </div>
          <p style={{ ...muted, marginTop: '0.25rem' }}>
            {!state.signed
              ? 'An analyst signs an artifact to approve it. The Ed25519 signature covers its SHA-256, so any later change is detected.'
              : state.valid
                ? state.key_status === 'ARCHIVED'
                  ? 'File matches the approved SHA-256. Verified using an archived signing key from the server keyring (backward-compatible).'
                  : 'The file is byte-for-byte the one that was approved with the current active server key.'
                : state.reasons.join(' ')}
          </p>
        </div>
      </div>

      {sig && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.83rem' }}>
          <div><div style={label}>Signed by</div><div style={{ color: 'var(--color-text)' }}>{sig.signed_by}</div></div>
          <div><div style={label}>Signed at</div><div style={{ color: 'var(--color-text)' }}>{new Date(sig.signed_at).toLocaleString()}</div></div>
          <div><div style={label}>Key ID</div><div className="font-mono" style={{ color: 'var(--color-primary)' }}>{sig.key_id}</div></div>
          <div><div style={label}>Algorithm</div><div style={{ color: 'var(--color-text)' }}>{sig.algorithm}</div></div>
        </div>
      )}

      <div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={sign}
          disabled={busy || state.valid || risky}
          title={risky ? 'High/critical risk artifacts cannot be signed' : state.valid ? 'Already signed' : 'Approve and sign'}
        >
          <BadgeCheck size={16} />
          <span>{busy ? 'Signing…' : state.signed ? 'Re-sign (update)' : 'Approve and sign'}</span>
        </button>
        {risky && (
          <p style={{ ...muted, color: '#f87171', marginTop: '0.5rem' }}>
            Artifacts rated HIGH or CRITICAL cannot be signed. Resolve findings first.
          </p>
        )}
      </div>
    </div>
  );
}

function LineageTab({ artifact }) {
  const navigate = useNavigate();
  const [graph, setGraph] = useState(null);
  const [rescanning, setRescanning] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    supplyChainApi.lineage(artifact.id).then((r) => setGraph(r.data)).catch(() => setGraph(null));
  }, [artifact.id]);
  useEffect(load, [load]);

  const rescan = async () => {
    setRescanning(true);
    setMessage(null);
    try {
      await scansApi.create(artifact.id);
      setMessage({ kind: 'success', text: 'Re-scan initiated with upstream lineage checks.' });
    } catch (e) {
      setMessage({ kind: 'error', text: apiErrorMessage(e) });
    } finally {
      setRescanning(false);
    }
  };

  if (!graph) return <p style={muted}>Loading lineage…</p>;

  return (
    <div>
      {message && <Message kind={message.kind}>{message.text}</Message>}
      <LineageGraph graph={graph} onSelect={(node) => navigate(`/artifacts/${node.id}`)} />
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(`/supply-chain?artifact=${artifact.id}`)}>
          <GitBranch size={15} />
          <span>Add or remove links</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={rescan} disabled={rescanning}>
          <RefreshCw size={15} />
          <span>{rescanning ? 'Re-scanning…' : 'Re-scan with lineage checks'}</span>
        </button>
      </div>
    </div>
  );
}

function ComplianceTab({ artifact }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supplyChainApi.compliance(artifact.id).then((r) => setReport(r.data)).catch((e) => setError(apiErrorMessage(e)));
  }, [artifact.id]);

  if (error) return <Message kind="error">{error}</Message>;
  if (!report) return <p style={muted}>Loading compliance scorecard…</p>;

  const gradeStyle = GRADE_STYLE[report.grade] || GRADE_STYLE.C;

  return (
    <div>
      {/* Automated Compliance Scorecard Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        padding: '1.25rem',
        borderRadius: 12,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        marginBottom: '1.25rem',
        alignItems: 'center',
      }}>
        {/* Score & Grade Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: gradeStyle.bg,
            border: `2px solid ${gradeStyle.border}`,
            color: gradeStyle.color,
            fontWeight: 800,
            fontSize: '1.25rem',
          }}>
            {report.score}%
            <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>GRADE {report.grade}</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              EU AI Act Scorecard
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.15rem' }}>
              {report.overall_status?.replace('_', ' ')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
              Articles 10–15 Regulatory Evaluation
            </div>
          </div>
        </div>

        {/* Sub-Article Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Art. 10 (Data & Governance):</span>
            <span className={report.article_10_status === 'COMPLIANT' ? 'badge badge-success' : report.article_10_status === 'PARTIAL' ? 'badge badge-warning' : 'badge badge-danger'} style={{ fontSize: '0.7rem' }}>
              {report.article_10_status?.replace('_', ' ')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Art. 15 (Cybersecurity & Robustness):</span>
            <span className={report.article_15_status === 'COMPLIANT' ? 'badge badge-success' : report.article_15_status === 'PARTIAL' ? 'badge badge-warning' : 'badge badge-danger'} style={{ fontSize: '0.7rem' }}>
              {report.article_15_status?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Controls Counts */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {Object.entries(report.summary).filter(([, n]) => n).map(([key, n]) => {
          const s = STATUS_STYLE[key];
          return (
            <span key={key} style={{ padding: '0.25rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
              {n} {key.replace('_', ' ')}
            </span>
          );
        })}
      </div>

      {/* Controls List */}
      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {report.controls.map((c) => {
          const s = STATUS_STYLE[c.status];
          return (
            <div key={c.ref} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.85rem 1rem', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="font-mono" style={{ color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 700 }}>
                    {c.ref}
                  </span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '0.88rem' }}>{c.title}</span>
                  {c.article && (
                    <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: 'var(--color-primary)' }}>
                      {c.article}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color }}>{c.status.replace('_', ' ')}</span>
              </div>
              {c.evidence.length > 0 && (
                <ul style={{ margin: '0.45rem 0 0 1.1rem', ...muted, listStyle: 'disc' }}>
                  {c.evidence.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
              {c.action && <p style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '0.4rem' }}>Next Action: {c.action}</p>}
            </div>
          );
        })}
      </div>

      <p style={{ ...muted, marginTop: '0.9rem', fontStyle: 'italic' }}>{report.disclaimer}</p>
    </div>
  );
}

function DocumentsTab({ artifact }) {
  const toast = useToast();
  const [card, setCard] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const base = artifact.original_filename;

  useEffect(() => {
    supplyChainApi.modelCard(artifact.id).then((r) => setCard(r.data)).catch((e) => setError(apiErrorMessage(e)));
  }, [artifact.id]);

  const getBom = async (specVersion = '1.5') => {
    setDownloading(true);
    try {
      const res = await supplyChainApi.mlbom(artifact.id, specVersion);
      download(`${base}.cdx-${specVersion}.json`, JSON.stringify(res.data, null, 2), 'application/vnd.cyclonedx+json');
      toast.success(`ML-BOM (CycloneDX ${specVersion}) downloaded.`);
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {error && <Message kind="error">{error}</Message>}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button type="button" className="btn btn-primary" onClick={() => getBom('1.5')} disabled={downloading}>
          <FileJson size={15} />
          <span>ML-BOM (CycloneDX 1.5 JSON)</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => getBom('1.6')} disabled={downloading}>
          <FileJson size={15} />
          <span>CycloneDX 1.6 JSON</span>
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!card}
          onClick={() => {
            download(`${base}.model-card.md`, card, 'text/markdown');
            toast.success('Model card (.md) downloaded.');
          }}
        >
          <FileText size={15} />
          <span>Model Card (.md)</span>
        </button>
      </div>

      <div style={label}>Model Card & Compliance Preview</div>
      <pre style={{
        marginTop: '0.4rem',
        maxHeight: 380,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontSize: '0.78rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: '0.9rem 1rem',
        color: 'var(--color-text)',
        fontFamily: 'monospace',
      }}>
        {card || 'Generating model card…'}
      </pre>
    </div>
  );
}

export default function SupplyChainPanel({ artifact, scan, onChanged }) {
  const [tab, setTab] = useState('signature');
  if (!artifact) return null;

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>Supply chain & Governance</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
            Approval signatures, EU AI Act scorecard, lineage graph, and standardized CycloneDX 1.5 ML-BOM documentation
          </p>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {TABS.map(({ id, label: text, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              type="button"
              className={`btn btn-ghost ${tab === id ? 'active' : ''}`}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.82rem',
                borderBottom: tab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
                borderRadius: '6px 6px 0 0',
                color: tab === id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
              onClick={() => setTab(id)}
            >
              <Icon size={14} />
              <span>{text}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'signature' && <SignatureTab artifact={artifact} scan={scan} onChanged={onChanged} />}
      {tab === 'lineage' && <LineageTab artifact={artifact} />}
      {tab === 'compliance' && <ComplianceTab artifact={artifact} />}
      {tab === 'documents' && <DocumentsTab artifact={artifact} />}
    </div>
  );
}
