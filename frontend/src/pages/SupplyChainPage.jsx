/**
 * AISecGuard — Supply Chain Page (Modern SaaS Light Theme)
 * Lineage graph, provenance records, audit log integrity, Ed25519 key management.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  Copy,
  GitBranch,
  History,
  KeyRound,
  Link2,
  RefreshCw,
  RotateCw,
  ScrollText,
  ShieldCheck,
  Trash2,
  Plus,
  Database,
} from 'lucide-react';
import { apiErrorMessage, artifactsApi, supplyChainApi } from '../api/client';
import LineageGraph from '../components/supply/LineageGraph';
import { useToast } from '../context/ToastContext';

const RELATIONS = {
  TRAINED_ON:    { label: 'was trained on',    types: ['DATASET', 'MODEL'] },
  FINE_TUNED_FROM: { label: 'was fine-tuned from', types: ['MODEL', 'MODEL'] },
  DERIVED_FROM:  { label: 'was derived from',  types: ['DATASET', 'DATASET'] },
  DEPENDS_ON:    { label: 'depends on',        types: ['DEPENDENCY', 'MODEL'] },
};

const fieldLabel = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600,
  color: 'var(--color-text-muted)', marginBottom: '0.3rem',
};

function ArtifactSelect({ id, value, onChange, artifacts, placeholder }) {
  return (
    <select id={id} className="input" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {artifacts.map(a => (
        <option key={a.id} value={a.id}>{a.original_filename} · {a.artifact_type}</option>
      ))}
    </select>
  );
}

export default function SupplyChainPage() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  // All existing state preserved
  const [artifacts, setArtifacts] = useState([]);
  const [focusId, setFocusId] = useState(params.get('artifact') || '');
  const [graph, setGraph] = useState(null);
  const [audit, setAudit] = useState(null);
  const [key, setKey] = useState(null);
  const [keyring, setKeyring] = useState([]);
  const [showKeyring, setShowKeyring] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [form, setForm] = useState({ child: params.get('artifact') || '', relation: 'TRAINED_ON', parent: '', note: '' });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Tab state: 'lineage' | 'provenance'
  const [activeTab, setActiveTab] = useState('lineage');

  const byId = useMemo(() => Object.fromEntries(artifacts.map(a => [a.id, a])), [artifacts]);

  const loadKeys = useCallback(() => {
    supplyChainApi.publicKey().then(r => setKey(r.data)).catch(() => {});
    supplyChainApi.keys().then(r => setKeyring(r.data || [])).catch(() => setKeyring([]));
  }, []);

  useEffect(() => {
    artifactsApi.list({ limit: 200 }).then(r => setArtifacts(r.data.artifacts || [])).catch(() => setArtifacts([]));
    loadKeys();
  }, [loadKeys]);

  const verifyAudit = useCallback(() => {
    supplyChainApi.verifyAudit().then(r => setAudit(r.data)).catch(e => setAudit({ error: apiErrorMessage(e) }));
  }, []);
  useEffect(verifyAudit, [verifyAudit]);

  const loadGraph = useCallback(id => {
    if (!id) return;
    supplyChainApi.lineage(id).then(r => setGraph(r.data)).catch(() => setGraph(null));
  }, []);
  useEffect(() => loadGraph(focusId), [focusId, loadGraph]);

  const focus = id => {
    setFocusId(id);
    setParams(id ? { artifact: id } : {});
  };

  const child = byId[form.child];
  const relationOptions = Object.entries(RELATIONS).filter(([, r]) => !child || r.types[1] === child.artifact_type);
  const parentType = RELATIONS[form.relation]?.types[0];
  const parentOptions = artifacts.filter(a => a.artifact_type === parentType && a.id !== form.child);

  const chooseChild = id => {
    const type = byId[id]?.artifact_type;
    setForm(f => {
      const fits = !type || RELATIONS[f.relation].types[1] === type;
      const relation = fits ? f.relation : Object.keys(RELATIONS).find(k => RELATIONS[k].types[1] === type);
      return { ...f, child: id, relation, parent: fits ? f.parent : '' };
    });
  };

  const addLink = async e => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await supplyChainApi.link(form.parent, form.child, form.relation, form.note);
      const succMsg = `Linked: ${byId[form.child]?.original_filename} ${RELATIONS[form.relation].label} ${byId[form.parent]?.original_filename}.`;
      setMessage({ kind: 'success', text: `${succMsg} Re-scan it to apply lineage checks.` });
      toast.success(succMsg);
      setForm(f => ({ ...f, parent: '', note: '' }));
      focus(form.child);
      loadGraph(form.child);
      setShowAddForm(false);
    } catch (err) {
      setMessage({ kind: 'error', text: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const removeLink = async edgeId => {
    try {
      await supplyChainApi.unlink(edgeId);
      loadGraph(focusId);
      toast.success('Lineage link removed.');
    } catch (err) {
      setMessage({ kind: 'error', text: apiErrorMessage(err) });
    }
  };

  const copyPem = (pemText, id = 'active') => {
    if (!pemText) return;
    navigator.clipboard.writeText(pemText);
    setCopiedId(id);
    toast.success('Public signing key PEM copied.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRotateKey = async () => {
    setRotating(true);
    try {
      const res = await supplyChainApi.rotateKey();
      toast.success(`Key rotated successfully! New Key ID: ${res.data.new_key_id}`);
      loadKeys();
      setConfirmRotate(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Key rotation failed.'));
    } finally {
      setRotating(false);
    }
  };

  // Tab styles
  const tabBtn = (name) => ({
    padding: '0.5rem 1.25rem',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
    transition: 'all 0.15s ease',
    background: activeTab === name ? 'var(--color-primary)' : 'transparent',
    color: activeTab === name ? '#fff' : 'var(--color-text-muted)',
  });

  return (
    <div className="fade-in" style={{ padding: '1.75rem 2rem', maxWidth: 1180, margin: '0 auto' }}>

      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Supply Chain</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          AI artifact lineage, provenance, and dependency graph
        </p>
      </div>

      {/* Integrity Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {/* Audit Log Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ScrollText size={17} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>Audit Log Integrity</span>
            </div>
            <button type="button" className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={verifyAudit}>
              <RefreshCw size={13} /><span>Verify</span>
            </button>
          </div>
          {!audit ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Checking…</p>
          ) : audit.error ? (
            <p style={{ fontSize: '0.82rem', color: '#EF4444' }}>{audit.error}</p>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: audit.valid ? '#10B981' : '#EF4444', fontSize: '1rem' }}>
                {audit.valid ? '✓ Hash chain intact' : '✗ Chain BROKEN — record was altered'}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                {audit.checked} chained event(s) checked
                {audit.unchained ? `, ${audit.unchained} unchained` : ''}.
                {audit.broken_at && <> First bad: <code>{audit.broken_at.slice(0, 8)}</code>.</>}
              </p>
            </>
          )}
        </div>

        {/* Signing Key Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={17} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>Ed25519 Signing Key</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setShowKeyring(p => !p)}>
                <History size={13} /><span>Keyring ({keyring.length || 1})</span>
              </button>
              <button type="button" className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => copyPem(key?.public_key_pem, 'active')} disabled={!key}>
                {copiedId === 'active' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedId === 'active' ? 'Copied' : 'Copy PEM'}</span>
              </button>
            </div>
          </div>
          {key ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>ACTIVE</span>
                <span className="font-mono" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{key.key_id}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>({key.algorithm})</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Past signatures remain verifiable after rotation.</p>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                {!confirmRotate ? (
                  <button type="button" className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }} onClick={() => setConfirmRotate(true)}>
                    <RotateCw size={13} /><span>Rotate signing key</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600 }}>Archive current and issue new pair?</span>
                    <button type="button" className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={handleRotateKey} disabled={rotating}>
                      <ShieldCheck size={13} /><span>{rotating ? 'Rotating…' : 'Confirm'}</span>
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setConfirmRotate(false)} disabled={rotating}>Cancel</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Backend not reachable.</p>
          )}
        </div>
      </div>

      {/* Keyring History (expandable) */}
      {showKeyring && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '1.25rem', marginBottom: '1.5rem' }} className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={16} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Server Keyring History</h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{keyring.length} registered key(s)</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr><th>Key ID</th><th>Status</th><th>Algorithm</th><th>Created</th><th>Rotated</th><th style={{ textAlign: 'right' }}>Action</th></tr>
              </thead>
              <tbody>
                {keyring.map(k => (
                  <tr key={k.key_id}>
                    <td><span className="font-mono" style={{ color: k.status === 'ACTIVE' ? 'var(--color-primary)' : 'var(--color-text)', fontSize: '0.82rem' }}>{k.key_id}</span></td>
                    <td><span className={k.status === 'ACTIVE' ? 'badge badge-success' : 'badge badge-info'} style={{ fontSize: '0.68rem' }}>{k.status}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{k.algorithm}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{k.rotated_at ? new Date(k.rotated_at).toLocaleDateString() : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }} onClick={() => copyPem(k.public_key_pem, k.key_id)}>
                        {copiedId === k.key_id ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === k.key_id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.35rem', width: 'fit-content', boxShadow: 'var(--card-shadow)' }}>
        <button style={tabBtn('lineage')} onClick={() => setActiveTab('lineage')}>
          <GitBranch size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Lineage Graph
        </button>
        <button style={tabBtn('provenance')} onClick={() => setActiveTab('provenance')}>
          <Database size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Provenance Records
        </button>
      </div>

      {/* Lineage Graph Tab */}
      {activeTab === 'lineage' && (
        <div>
          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ minWidth: 260 }}>
              <ArtifactSelect id="focus-artifact" value={focusId} onChange={focus} artifacts={artifacts} placeholder="Choose an artifact to explore" />
            </div>
            <button className="btn btn-primary" style={{ fontSize: '0.875rem' }} onClick={() => setShowAddForm(p => !p)}>
              <Plus size={15} /><span>Add Lineage Link</span>
            </button>
          </div>

          {/* Add Lineage Form Panel */}
          {showAddForm && (
            <form className="fade-in" onSubmit={addLink} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Link2 size={17} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Record Lineage</h2>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Read as: <em>artifact</em> {RELATIONS[form.relation]?.label} <em>source</em>.
              </p>
              {message && (
                <div className={message.kind === 'error' ? 'alert-error' : 'alert-success'} style={{ marginBottom: '1rem' }}>{message.text}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem', alignItems: 'end' }}>
                <div>
                  <label htmlFor="link-child" style={fieldLabel}>Artifact</label>
                  <ArtifactSelect id="link-child" value={form.child} onChange={chooseChild} artifacts={artifacts.filter(a => a.artifact_type !== 'DEPENDENCY')} placeholder="Choose a model or dataset" />
                </div>
                <div>
                  <label htmlFor="link-relation" style={fieldLabel}>Relation</label>
                  <select id="link-relation" className="input" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value, parent: '' }))}>
                    {relationOptions.map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="link-parent" style={fieldLabel}>Source ({parentType?.toLowerCase()})</label>
                  <ArtifactSelect id="link-parent" value={form.parent} onChange={v => setForm(f => ({ ...f, parent: v }))} artifacts={parentOptions} placeholder={parentOptions.length ? 'Choose the source' : `No ${parentType?.toLowerCase()} uploaded yet`} />
                </div>
                <div>
                  <label htmlFor="link-note" style={fieldLabel}>Note (optional)</label>
                  <input id="link-note" className="input" value={form.note} maxLength={2000} placeholder="e.g. deduplicated, 10 epochs" onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={busy || !form.child || !form.parent}>
                  <Link2 size={15} /><span>{busy ? 'Linking…' : 'Add Link'}</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {/* Graph / Table */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', padding: '1.5rem' }}>
            {focusId && graph ? (
              <>
                <LineageGraph graph={graph} onSelect={node => focus(node.id)} />
                {graph.edges.length > 0 && (
                  <div style={{ overflowX: 'auto', marginTop: '1.25rem' }}>
                    <table className="table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Parent Artifact</th>
                          <th>Relation</th>
                          <th>Child Artifact</th>
                          <th>Note</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {graph.edges.map(e => {
                          const name = id => graph.nodes.find(n => n.id === id)?.name || id.slice(0, 8);
                          return (
                            <tr key={e.id}>
                              <td style={{ fontWeight: 500 }}>{name(e.parent_id)}</td>
                              <td>
                                <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 6, padding: '0.2rem 0.6rem', fontSize: '0.78rem', fontWeight: 600 }}>
                                  {RELATIONS[e.relation]?.label || e.relation}
                                </span>
                              </td>
                              <td style={{ fontWeight: 500 }}>{name(e.child_id)}</td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{e.note || '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button type="button" className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => removeLink(e.id)} aria-label="Remove link">
                                  <Trash2 size={13} style={{ color: '#EF4444' }} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <GitBranch size={40} style={{ color: 'var(--color-primary)', opacity: 0.4, margin: '0 auto 0.875rem', display: 'block' }} />
                <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                  {artifacts.length ? 'Select an artifact to explore its lineage' : 'Upload artifacts first'}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Choose an artifact above to see where it came from and what was built from it.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provenance Records Tab */}
      {activeTab === 'provenance' && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, boxShadow: 'var(--card-shadow)', overflow: 'hidden' }}>
          <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Provenance Records</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>Artifact hash, source URL, and timestamp records</p>
          </div>
          {artifacts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Artifact</th>
                    <th>Type</th>
                    <th>SHA-256 Hash</th>
                    <th>Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{a.original_filename}</td>
                      <td><span className="badge badge-info">{a.artifact_type}</span></td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--color-primary)' }}>
                          {a.sha256 ? `${a.sha256.slice(0, 20)}…` : '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                        {a.uploaded_at ? new Date(a.uploaded_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <Database size={40} style={{ color: 'var(--color-primary)', opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>No provenance records yet</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Upload artifacts to begin tracking provenance.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
