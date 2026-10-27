/**
 * AISecGuard — Supply chain panel (scan detail page)
 * Tabs: signature (approve + verify), lineage graph, EU AI Act evidence,
 * and documents (CycloneDX ML-BOM, generated model card).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck, FileJson, FileText, GitBranch, RefreshCw, Scale, ShieldAlert, ShieldCheck, ShieldQuestion,
} from 'lucide-react';
import { apiErrorMessage, scansApi, supplyChainApi } from '../../api/client';
import LineageGraph from './LineageGraph';

const TABS = [
  { id: 'signature', label: 'Signature', icon: BadgeCheck },
  { id: 'lineage', label: 'Lineage', icon: GitBranch },
  { id: 'compliance', label: 'Compliance', icon: Scale },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const STATUS_STYLE = {
  MET: { color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
  PARTIAL: { color: '#fbbf24', bg: 'rgba(202,138,4,0.12)', border: 'rgba(202,138,4,0.35)' },
  GAP: { color: '#f87171', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.35)' },
  NOT_APPLICABLE: { color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)' },
};

const muted = { fontSize: '0.8rem', color: '#94a3b8' };
const label = { fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' };

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
      load();
      onChanged?.();
    } catch (e) {
      setError(apiErrorMessage(e));
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
          <div style={{ fontWeight: 700, color, fontSize: '1rem' }}>
            {!state.signed ? 'Not signed' : state.valid ? 'Signature valid' : 'Signature INVALID'}
          </div>
          <p style={{ ...muted, marginTop: '0.25rem' }}>
            {!state.signed
              ? 'An analyst signs an artifact to approve it. The Ed25519 signature covers its SHA-256, so any later change is detected.'
              : state.valid
                ? 'The file is byte-for-byte the one that was approved.'
                : state.reasons.join(' ')}
          </p>
        </div>
      </div>

      {sig && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.83rem' }}>
          <div><div style={label}>Signed by</div><div style={{ color: '#e2e8f0' }}>{sig.signed_by}</div></div>
          <div><div style={label}>Signed at</div><div style={{ color: '#e2e8f0' }}>{new Date(sig.signed_at).toLocaleString()}</div></div>
          <div><div style={label}>Key ID</div><div className="font-mono" style={{ color: '#93c5fd' }}>{sig.key_id}</div></div>
          <div><div style={label}>Algorithm</div><div style={{ color: '#e2e8f0' }}>{sig.algorithm}</div></div>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={sign}
        disabled={busy || artifact.status !== 'SCANNED' || risky}
        title={risky ? `Latest scan is ${scan.risk_level}; resolve it before approving` : undefined}
      >
        <BadgeCheck size={15} />
        <span>{busy ? 'Signing…' : state.signed ? 'Re-sign after this scan' : 'Approve & sign'}</span>
      </button>
      {risky && <p style={{ ...muted, marginTop: '0.5rem' }}>HIGH or CRITICAL artifacts cannot be approved.</p>}
      {artifact.status === 'QUARANTINED' && <p style={{ ...muted, marginTop: '0.5rem' }}>Release the artifact from quarantine before signing.</p>}
    </div>
  );
}

function LineageTab({ artifact }) {
  const navigate = useNavigate();
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState('');
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    supplyChainApi.lineage(artifact.id).then((r) => setGraph(r.data)).catch((e) => setError(apiErrorMessage(e)));
  }, [artifact.id]);

  const rescan = async () => {
    setRescanning(true);
    try {
      const res = await scansApi.create(artifact.id);
      navigate(`/scans/${res.data.id}`);
    } catch (e) {
      setError(apiErrorMessage(e));
      setRescanning(false);
    }
  };

  return (
    <div>
      {error && <Message kind="error">{error}</Message>}
      {graph ? (
        <LineageGraph graph={graph} />
      ) : (
        <p style={muted}>Loading lineage…</p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(`/supply-chain?artifact=${artifact.id}`)}>
          <GitBranch size={15} />
          <span>Add or remove links</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={rescan} disabled={rescanning}>
          <RefreshCw size={15} />
          <span>{rescanning ? 'Re-scanning…' : 'Re-scan with lineage checks'}</span>
        </button>
      </div>
      <p style={{ ...muted, marginTop: '0.75rem' }}>
        Scans check upstream artifacts (LIN-001) and diff derived datasets against their parent (DATA-012 to DATA-014).
      </p>
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
  if (!report) return <p style={muted}>Loading compliance evidence…</p>;

  return (
    <div>
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
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        {report.controls.map((c) => {
          const s = STATUS_STYLE[c.status];
          return (
            <div key={c.ref} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.85rem 1rem', background: 'rgba(15,23,42,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <div>
                  <span className="font-mono" style={{ color: '#60a5fa', fontSize: '0.78rem', marginRight: '0.5rem' }}>{c.ref}</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.88rem' }}>{c.title}</span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: s.color }}>{c.status.replace('_', ' ')}</span>
              </div>
              {c.evidence.length > 0 && (
                <ul style={{ margin: '0.45rem 0 0 1.1rem', ...muted, listStyle: 'disc' }}>
                  {c.evidence.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
              {c.action && <p style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '0.4rem' }}>Next: {c.action}</p>}
            </div>
          );
        })}
      </div>
      <p style={{ ...muted, marginTop: '0.9rem', fontStyle: 'italic' }}>{report.disclaimer}</p>
    </div>
  );
}

function DocumentsTab({ artifact }) {
  const [card, setCard] = useState('');
  const [error, setError] = useState('');
  const base = artifact.original_filename;

  useEffect(() => {
    supplyChainApi.modelCard(artifact.id).then((r) => setCard(r.data)).catch((e) => setError(apiErrorMessage(e)));
  }, [artifact.id]);

  const getBom = async () => {
    try {
      const res = await supplyChainApi.mlbom(artifact.id);
      download(`${base}.cdx.json`, JSON.stringify(res.data, null, 2), 'application/vnd.cyclonedx+json');
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <div>
      {error && <Message kind="error">{error}</Message>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button type="button" className="btn btn-ghost" onClick={getBom}>
          <FileJson size={15} />
          <span>ML-BOM (CycloneDX 1.6)</span>
        </button>
        <button type="button" className="btn btn-ghost" disabled={!card} onClick={() => download(`${base}.model-card.md`, card, 'text/markdown')}>
          <FileText size={15} />
          <span>Model card (.md)</span>
        </button>
      </div>
      <div style={label}>Model card preview</div>
      <pre style={{
        marginTop: '0.4rem', maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.78rem',
        background: 'rgba(8,12,22,0.95)', border: '1px solid #1e293b', borderRadius: 8, padding: '0.9rem 1rem', color: '#cbd5e1',
      }}>
        {card || 'Generating…'}
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
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Supply chain</h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.125rem' }}>
            Approval signature, lineage, regulatory evidence and exportable documentation
          </p>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {TABS.map(({ id, label: text, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="btn"
              style={{
                padding: '0.4rem 0.75rem',
                background: tab === id ? 'rgba(59,130,246,0.18)' : 'transparent',
                border: `1px solid ${tab === id ? 'rgba(59,130,246,0.45)' : 'var(--color-border)'}`,
                color: tab === id ? '#93c5fd' : '#94a3b8',
              }}
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
