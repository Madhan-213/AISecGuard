/**
 * AISecGuard — Supply Chain page (Week 8)
 * Link artifacts into a lineage graph, explore it, check the tamper-evident
 * audit log and copy the public key that verifies approval signatures.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Copy, GitBranch, KeyRound, Link2, RefreshCw, ScrollText, Trash2 } from 'lucide-react';
import { apiErrorMessage, artifactsApi, supplyChainApi } from '../api/client';
import LineageGraph from '../components/supply/LineageGraph';

// relation → [parent type, child type]; mirrors ALLOWED_RELATIONS in lineage_service.py
const RELATIONS = {
  TRAINED_ON: { label: 'was trained on', types: ['DATASET', 'MODEL'] },
  FINE_TUNED_FROM: { label: 'was fine-tuned from', types: ['MODEL', 'MODEL'] },
  DERIVED_FROM: { label: 'was derived from', types: ['DATASET', 'DATASET'] },
  DEPENDS_ON: { label: 'depends on', types: ['DEPENDENCY', 'MODEL'] },
};

const sectionTitle = { fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' };
const muted = { fontSize: '0.8rem', color: '#94a3b8' };
const fieldLabel = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' };

function ArtifactSelect({ id, value, onChange, artifacts, placeholder }) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {artifacts.map((a) => (
        <option key={a.id} value={a.id}>{a.original_filename} · {a.artifact_type}</option>
      ))}
    </select>
  );
}

export default function SupplyChainPage() {
  const [params, setParams] = useSearchParams();
  const [artifacts, setArtifacts] = useState([]);
  const [focusId, setFocusId] = useState(params.get('artifact') || '');
  const [graph, setGraph] = useState(null);
  const [audit, setAudit] = useState(null);
  const [key, setKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ child: params.get('artifact') || '', relation: 'TRAINED_ON', parent: '', note: '' });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => Object.fromEntries(artifacts.map((a) => [a.id, a])), [artifacts]);

  useEffect(() => {
    artifactsApi.list({ limit: 200 }).then((r) => setArtifacts(r.data.artifacts || [])).catch(() => setArtifacts([]));
    supplyChainApi.publicKey().then((r) => setKey(r.data)).catch(() => {});
  }, []);

  const verifyAudit = useCallback(() => {
    supplyChainApi.verifyAudit().then((r) => setAudit(r.data)).catch((e) => setAudit({ error: apiErrorMessage(e) }));
  }, []);
  useEffect(verifyAudit, [verifyAudit]);

  const loadGraph = useCallback((id) => {
    if (!id) return;  // nothing selected: the explorer shows its placeholder
    supplyChainApi.lineage(id).then((r) => setGraph(r.data)).catch(() => setGraph(null));
  }, []);
  useEffect(() => loadGraph(focusId), [focusId, loadGraph]);

  const focus = (id) => {
    setFocusId(id);
    setParams(id ? { artifact: id } : {});
  };

  // Only offer relations that fit the chosen child; only offer parents that fit the relation.
  const child = byId[form.child];
  const relationOptions = Object.entries(RELATIONS).filter(([, r]) => !child || r.types[1] === child.artifact_type);
  const parentType = RELATIONS[form.relation]?.types[0];
  const parentOptions = artifacts.filter((a) => a.artifact_type === parentType && a.id !== form.child);

  const chooseChild = (id) => {
    const type = byId[id]?.artifact_type;
    setForm((f) => {
      const fits = !type || RELATIONS[f.relation].types[1] === type;
      const relation = fits ? f.relation : Object.keys(RELATIONS).find((k) => RELATIONS[k].types[1] === type);
      return { ...f, child: id, relation, parent: fits ? f.parent : '' };
    });
  };

  const addLink = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await supplyChainApi.link(form.parent, form.child, form.relation, form.note);
      setMessage({ kind: 'success', text: `Linked: ${byId[form.child]?.original_filename} ${RELATIONS[form.relation].label} ${byId[form.parent]?.original_filename}. Re-scan it to apply lineage checks.` });
      setForm((f) => ({ ...f, parent: '', note: '' }));
      focus(form.child);
      loadGraph(form.child);
    } catch (err) {
      setMessage({ kind: 'error', text: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const removeLink = async (edgeId) => {
    try {
      await supplyChainApi.unlink(edgeId);
      loadGraph(focusId);
    } catch (err) {
      setMessage({ kind: 'error', text: apiErrorMessage(err) });
    }
  };

  const copyKey = () => {
    if (!key) return;
    navigator.clipboard.writeText(key.public_key_pem);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Supply chain</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Record which data and base models every artifact was built from, and check that approvals and audit records are intact.
        </p>
      </div>

      {/* Integrity cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ScrollText size={18} style={{ color: '#60a5fa' }} />
              <span style={{ fontWeight: 700, color: '#fff' }}>Audit log integrity</span>
            </div>
            <button type="button" className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }} onClick={verifyAudit}>
              <RefreshCw size={13} /><span>Verify</span>
            </button>
          </div>
          {!audit ? <p style={muted}>Checking…</p> : audit.error ? <p style={{ ...muted, color: '#f87171' }}>{audit.error}</p> : (
            <>
              <div style={{ fontWeight: 700, color: audit.valid ? '#34d399' : '#f87171', fontSize: '1.05rem' }}>
                {audit.valid ? 'Hash chain intact' : 'Chain BROKEN: a record was altered'}
              </div>
              <p style={{ ...muted, marginTop: '0.3rem' }}>
                {audit.checked} chained quarantine/release event(s) checked
                {audit.unchained ? `, ${audit.unchained} older unchained event(s)` : ''}.
                {audit.broken_at && <> First bad record: <span className="font-mono">{audit.broken_at.slice(0, 8)}</span>.</>}
              </p>
            </>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} style={{ color: '#60a5fa' }} />
              <span style={{ fontWeight: 700, color: '#fff' }}>Signing key</span>
            </div>
            <button type="button" className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }} onClick={copyKey} disabled={!key}>
              {copied ? <Check size={13} /> : <Copy size={13} />}<span>{copied ? 'Copied' : 'Copy public key'}</span>
            </button>
          </div>
          {key ? (
            <>
              <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{key.algorithm} · <span className="font-mono" style={{ color: '#93c5fd' }}>{key.key_id}</span></div>
              <p style={{ ...muted, marginTop: '0.3rem' }}>Anyone with the public key can check an approval signature independently of AISecGuard.</p>
            </>
          ) : <p style={muted}>Backend not reachable.</p>}
        </div>
      </div>

      {/* Link form */}
      <form className="card" onSubmit={addLink} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Link2 size={18} style={{ color: '#60a5fa' }} />
          <h2 style={sectionTitle}>Record lineage</h2>
        </div>
        <p style={{ ...muted, marginBottom: '1rem' }}>Read it as a sentence: <em>artifact</em> {RELATIONS[form.relation]?.label} <em>source</em>.</p>
        {message && <div className={message.kind === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>{message.text}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem', alignItems: 'end' }}>
          <div>
            <label htmlFor="link-child" style={fieldLabel}>Artifact</label>
            <ArtifactSelect id="link-child" value={form.child} onChange={chooseChild} artifacts={artifacts.filter((a) => a.artifact_type !== 'DEPENDENCY')} placeholder="Choose a model or dataset" />
          </div>
          <div>
            <label htmlFor="link-relation" style={fieldLabel}>Relation</label>
            <select id="link-relation" className="input" value={form.relation} onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value, parent: '' }))}>
              {relationOptions.map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="link-parent" style={fieldLabel}>Source ({parentType?.toLowerCase()})</label>
            <ArtifactSelect id="link-parent" value={form.parent} onChange={(v) => setForm((f) => ({ ...f, parent: v }))} artifacts={parentOptions} placeholder={parentOptions.length ? 'Choose the source' : `No ${parentType?.toLowerCase()} uploaded yet`} />
          </div>
          <div>
            <label htmlFor="link-note" style={fieldLabel}>Note (optional)</label>
            <input id="link-note" className="input" value={form.note} maxLength={2000} placeholder="e.g. deduplicated, 10 epochs" onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={busy || !form.child || !form.parent}>
          <Link2 size={15} /><span>{busy ? 'Linking…' : 'Add link'}</span>
        </button>
      </form>

      {/* Explorer */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitBranch size={18} style={{ color: '#60a5fa' }} />
              <h2 style={sectionTitle}>Lineage explorer</h2>
            </div>
            <p style={muted}>Click a box to centre the graph on it. The coloured bar on each box shows its latest risk.</p>
          </div>
          <div style={{ minWidth: 260 }}>
            <ArtifactSelect id="focus-artifact" value={focusId} onChange={focus} artifacts={artifacts} placeholder="Choose an artifact" />
          </div>
        </div>

        {focusId && graph ? (
          <>
            <LineageGraph graph={graph} onSelect={(node) => focus(node.id)} />
            {graph.edges.length > 0 && (
              <table style={{ width: '100%', marginTop: '1.25rem', fontSize: '0.83rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem' }}>Artifact</th><th style={{ padding: '0.4rem' }}>Relation</th>
                    <th style={{ padding: '0.4rem' }}>Source</th><th style={{ padding: '0.4rem' }}>Note</th><th />
                  </tr>
                </thead>
                <tbody>
                  {graph.edges.map((e) => {
                    const name = (id) => graph.nodes.find((n) => n.id === id)?.name || id.slice(0, 8);
                    return (
                      <tr key={e.id} style={{ borderTop: '1px solid var(--color-border)', color: '#e2e8f0' }}>
                        <td style={{ padding: '0.5rem 0.4rem' }}>{name(e.child_id)}</td>
                        <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>{RELATIONS[e.relation]?.label || e.relation}</td>
                        <td style={{ padding: '0.5rem 0.4rem' }}>{name(e.parent_id)}</td>
                        <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>{e.note || '—'}</td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>
                          <button type="button" className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => removeLink(e.id)} aria-label="Remove link">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p style={muted}>{artifacts.length ? 'Choose an artifact to see where it came from and what was built from it.' : 'Upload artifacts first.'}</p>
        )}
      </div>
    </div>
  );
}
