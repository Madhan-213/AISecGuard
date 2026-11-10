/**
 * AISecGuard — Upload & Scan (Week 9 redesign)
 *
 * Queue several artifacts, attach provenance (source URL, expected SHA-256,
 * what each file was built from), then upload → link lineage → scan each one
 * against the real backend. Every result links to its full report.
 * Nothing is executed: the backend scanners are static.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronDown, Cpu, Database, FileQuestion, Fingerprint, GitBranch, Link2,
  Loader2, Package, Play, ShieldCheck, Trash2, UploadCloud, X,
} from 'lucide-react';
import { apiErrorMessage, artifactsApi, scansApi, supplyChainApi, systemApi } from '../api/client';
import { useToast } from '../context/ToastContext';

const FALLBACK_INFO = {
  max_upload_mb: 100,
  scanners: [
    { artifact_type: 'MODEL', extensions: ['.pkl', '.joblib', '.h5', '.pt', '.pth', '.onnx', '.bin', '.safetensors', '.zip'] },
    { artifact_type: 'DATASET', extensions: ['.csv', '.json', '.parquet', '.jsonl'] },
    { artifact_type: 'DEPENDENCY', extensions: ['.txt', '.toml'] },
  ],
};

const TYPE_META = {
  MODEL: { label: 'Model', icon: Cpu, color: '#38bdf8', hint: 'Pickle, PyTorch, SafeTensors, ONNX, or .zip (Hugging Face repo)' },
  DATASET: { label: 'Dataset', icon: Database, color: '#a78bfa', hint: 'Duplicates, outliers, label skew, version diffs' },
  DEPENDENCY: { label: 'Dependencies', icon: Package, color: '#34d399', hint: 'Pinning, typosquatting, known CVEs' },
};

// child type → parent type → relation (mirrors ALLOWED_RELATIONS in lineage_service.py)
const RELATION_FOR = {
  MODEL: { DATASET: 'TRAINED_ON', MODEL: 'FINE_TUNED_FROM', DEPENDENCY: 'DEPENDS_ON' },
  DATASET: { DATASET: 'DERIVED_FROM' },
};
const RELATION_TEXT = {
  TRAINED_ON: 'trained on', FINE_TUNED_FROM: 'fine-tuned from', DEPENDS_ON: 'depends on', DERIVED_FROM: 'derived from',
};

const STEPS = ['Upload', 'Link', 'Scan'];
const muted = { fontSize: '0.8rem', color: 'var(--color-text-muted)' };
const fieldLabel = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.3rem' };

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

let nextId = 0;

export default function UploadPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [info, setInfo] = useState(FALLBACK_INFO);
  const [items, setItems] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  const [parentId, setParentId] = useState('');
  const [note, setNote] = useState('');
  const [showProvenance, setShowProvenance] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    systemApi.info().then((r) => setInfo(r.data)).catch(() => {});
    artifactsApi.list({ limit: 200 }).then((r) => setArtifacts(r.data.artifacts || [])).catch(() => {});
  }, []);

  const extToType = useMemo(() => {
    const map = {};
    info.scanners.forEach((s) => s.extensions.forEach((e) => { map[e.toLowerCase()] = s.artifact_type; }));
    return map;
  }, [info]);

  const onDrop = useCallback((files) => {
    const maxBytes = info.max_upload_mb * 1024 * 1024;
    setItems((prev) => [
      ...prev,
      ...files.map((file) => {
        const type = extToType[extOf(file.name)];
        let error = null;
        if (!type) error = `Unsupported file type ${extOf(file.name) || '(no extension)'}.`;
        else if (file.size === 0) error = 'File is empty.';
        else if (file.size > maxBytes) error = `Larger than the ${info.max_upload_mb} MB limit.`;
        if (error) {
          toast.warning(`${file.name}: ${error}`);
        }
        return { id: ++nextId, file, type, status: error ? 'invalid' : 'queued', step: -1, error, scan: null };
      }),
    ]);
  }, [extToType, info.max_upload_mb, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true, disabled: running });

  const update = (id, patch) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const queued = items.filter((it) => it.status === 'queued');
  const done = items.filter((it) => it.status === 'done');
  const parent = artifacts.find((a) => a.id === parentId);
  const relationFor = (type) => (parent ? RELATION_FOR[type]?.[parent.artifact_type] : null);
  const hashValid = !expectedHash || /^[0-9a-fA-F]{64}$/.test(expectedHash.trim());
  const singleFile = queued.length === 1;

  const runAll = async () => {
    setRunning(true);
    for (const item of queued) {
      try {
        update(item.id, { status: 'running', step: 0, error: null });
        const form = new FormData();
        form.append('file', item.file);
        if (sourceUrl.trim()) form.append('source_url', sourceUrl.trim());
        if (singleFile && expectedHash.trim()) form.append('expected_sha256', expectedHash.trim());
        const uploaded = (await artifactsApi.upload(form)).data;

        update(item.id, { step: 1, artifactId: uploaded.id });
        const relation = relationFor(item.type);
        let linkNote = null;
        if (relation) {
          try {
            await supplyChainApi.link(parent.id, uploaded.id, relation, note);
            linkNote = `${RELATION_TEXT[relation]} ${parent.original_filename}`;
          } catch (e) {
            linkNote = `Lineage not recorded: ${apiErrorMessage(e)}`;
          }
        }

        update(item.id, { step: 2, linkNote });
        const scan = (await scansApi.create(uploaded.id)).data;
        update(item.id, { status: 'done', step: 3, scan });

        // For single-file batches, navigate to real-time progress page
        if (queued.length === 1) {
          navigate(`/scans/${scan.id}/progress`);
        }
      } catch (e) {
        const errMsg = apiErrorMessage(e, 'Upload or scan failed.');
        update(item.id, { status: 'failed', error: errMsg });
        toast.error(errMsg);
      }
    }
    setRunning(false);
    artifactsApi.list({ limit: 200 }).then((r) => setArtifacts(r.data.artifacts || [])).catch(() => {});
  };

  const summary = done.reduce((acc, it) => ({ ...acc, [it.scan.risk_level]: (acc[it.scan.risk_level] || 0) + 1 }), {});

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>Upload & scan</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Drop models, datasets or dependency files. Each one is fingerprinted, linked to its sources and scanned statically. Nothing is executed.
        </p>
      </div>

      <div className="dash-grid dash-grid--wide-left">
        <div>
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className="card"
            style={{
              textAlign: 'center', padding: '2.5rem 1.5rem', cursor: running ? 'not-allowed' : 'pointer',
              borderStyle: 'dashed', borderWidth: 2,
              borderColor: isDragActive ? '#3b82f6' : 'var(--color-border)',
              background: isDragActive ? 'rgba(59,130,246,0.08)' : undefined,
              marginBottom: '1.25rem',
            }}
          >
            <input {...getInputProps()} />
            <UploadCloud size={40} style={{ color: isDragActive ? '#60a5fa' : '#64748b', margin: '0 auto 0.75rem' }} />
            <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '1.05rem' }}>
              {isDragActive ? 'Drop to add to the queue' : 'Drag files here or click to choose'}
            </div>
            <p style={{ ...muted, marginTop: '0.35rem' }}>Several files at once · up to {info.max_upload_mb} MB each</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {info.scanners.map((s) => {
                const meta = TYPE_META[s.artifact_type];
                return (
                  <span key={s.artifact_type} style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', borderRadius: 6, border: `1px solid ${meta.color}40`, color: meta.color, background: `${meta.color}12` }}>
                    {meta.label}: {s.extensions.join(' ')}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Provenance */}
          <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
            <button
              type="button"
              onClick={() => setShowProvenance((v) => !v)}
              aria-expanded={showProvenance}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)', fontWeight: 700 }}>
                <Fingerprint size={17} style={{ color: '#60a5fa' }} /> Provenance details <span style={{ ...muted, fontWeight: 400 }}>(optional, recommended)</span>
              </span>
              <ChevronDown size={18} style={{ color: '#94a3b8', transform: showProvenance ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {showProvenance && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.9rem', marginTop: '1rem' }}>
                <div>
                  <label htmlFor="prov-source" style={fieldLabel}>Source URL</label>
                  <input id="prov-source" className="input" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://huggingface.co/org/model" disabled={running} />
                  <p style={{ ...muted, fontSize: '0.72rem', marginTop: '0.25rem' }}>Where the file came from. Recorded for EU AI Act Art. 10 evidence.</p>
                </div>
                <div>
                  <label htmlFor="prov-hash" style={fieldLabel}>Expected SHA-256 {queued.length > 1 && '(single file only)'}</label>
                  <input
                    id="prov-hash" className="input font-mono" value={expectedHash} onChange={(e) => setExpectedHash(e.target.value)}
                    placeholder="64 hex characters from the publisher" disabled={running || queued.length > 1}
                    style={{ borderColor: hashValid ? undefined : '#ef4444' }}
                  />
                  <p style={{ ...muted, fontSize: '0.72rem', marginTop: '0.25rem', color: hashValid ? '#94a3b8' : '#f87171' }}>
                    {hashValid ? 'A mismatch is reported as PROV-002.' : 'Must be exactly 64 hexadecimal characters.'}
                  </p>
                </div>
                <div>
                  <label htmlFor="prov-parent" style={fieldLabel}>Built from</label>
                  <select id="prov-parent" className="input" value={parentId} onChange={(e) => setParentId(e.target.value)} disabled={running}>
                    <option value="">Nothing / not known</option>
                    {artifacts.map((a) => <option key={a.id} value={a.id}>{a.original_filename} · {a.artifact_type}</option>)}
                  </select>
                  <p style={{ ...muted, fontSize: '0.72rem', marginTop: '0.25rem' }}>Upstream risk (LIN-001) and dataset diffs are checked during the scan.</p>
                </div>
                <div>
                  <label htmlFor="prov-note" style={fieldLabel}>Lineage note</label>
                  <input id="prov-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 20 epochs, deduplicated" disabled={running || !parentId} maxLength={2000} />
                </div>
              </div>
            )}
          </div>

          {/* Queue */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>Queue</h2>
                <p style={muted}>{items.length ? `${queued.length} ready · ${done.length} scanned` : 'No files yet'}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {items.length > 0 && !running && (
                  <button type="button" className="btn btn-ghost" onClick={() => setItems([])}><Trash2 size={14} /><span>Clear</span></button>
                )}
                <button type="button" className="btn btn-primary" onClick={runAll} disabled={running || !queued.length || !hashValid}>
                  {running ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
                  <span>{running ? 'Scanning…' : `Scan ${queued.length || ''} file${queued.length === 1 ? '' : 's'}`}</span>
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                <FileQuestion size={28} style={{ margin: '0 auto 0.5rem' }} /> Add files above to build a queue.
              </div>
            ) : (
              <ul style={{ display: 'grid', gap: '0.6rem' }}>
                {items.map((it) => {
                  const meta = TYPE_META[it.type] || { icon: FileQuestion, color: '#64748b', label: 'Unknown' };
                  const Icon = meta.icon;
                  const relation = it.status === 'queued' ? relationFor(it.type) : null;
                  return (
                    <li key={it.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.8rem 0.95rem', background: 'rgba(15,23,42,0.5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ padding: 8, borderRadius: 8, background: `${meta.color}18`, color: meta.color, display: 'inline-flex' }}><Icon size={17} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.file.name}</div>
                          <div style={muted}>
                            {meta.label} · {formatSize(it.file.size)}
                            {relation && <> · <Link2 size={11} style={{ verticalAlign: '-1px' }} /> {RELATION_TEXT[relation]} {parent.original_filename}</>}
                            {it.linkNote && <> · {it.linkNote}</>}
                          </div>
                        </div>
                        {it.status === 'done' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span className={`badge badge-${it.scan.risk_level.toLowerCase()}`}>{it.scan.risk_level} · {it.scan.risk_score}</span>
                            <button type="button" className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem' }} onClick={() => navigate(`/scans/${it.scan.id}`)}>
                              <span>Report</span><ArrowRight size={13} />
                            </button>
                          </div>
                        )}
                        {(it.status === 'queued' || it.status === 'invalid' || it.status === 'failed') && !running && (
                          <button type="button" aria-label={`Remove ${it.file.name}`} onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      {it.status === 'running' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                          {STEPS.map((label, i) => (
                            <div key={label} style={{ flex: 1 }}>
                              <div style={{ height: 4, borderRadius: 4, background: i < it.step ? '#3b82f6' : i === it.step ? '#3b82f680' : '#1e293b' }} />
                              <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', color: i <= it.step ? '#93c5fd' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {i === it.step && <Loader2 size={10} className="spin" />}{label}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {it.status === 'done' && it.scan.findings?.length > 0 && (
                        <p style={{ ...muted, marginTop: '0.5rem' }}>
                          {it.scan.findings.length} finding(s), e.g. <span className="font-mono" style={{ color: '#60a5fa' }}>{it.scan.findings[0].rule_id}</span> {it.scan.findings[0].title}
                        </p>
                      )}
                      {it.status === 'done' && !it.scan.findings?.length && (
                        <p style={{ ...muted, marginTop: '0.5rem', color: '#34d399' }}><CheckCircle2 size={12} style={{ verticalAlign: '-2px' }} /> No findings.</p>
                      )}
                      {it.error && (
                        <p style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.5rem', display: 'flex', gap: '0.35rem', alignItems: 'flex-start' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {it.error}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Side column */}
        <div style={{ display: 'grid', gap: '1.25rem', alignContent: 'start' }}>
          {done.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>This batch</h2>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].filter((l) => summary[l]).map((l) => (
                  <span key={l} className={`badge badge-${l.toLowerCase()}`}>{summary[l]} {l}</span>
                ))}
              </div>
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={() => navigate('/dashboard')}>
                <span>Open dashboard</span><ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>What gets checked</h2>
            <ul style={{ display: 'grid', gap: '0.75rem' }}>
              {Object.entries(TYPE_META).map(([type, meta]) => {
                const Icon = meta.icon;
                return (
                  <li key={type} style={{ display: 'flex', gap: '0.65rem' }}>
                    <Icon size={16} style={{ color: meta.color, flexShrink: 0, marginTop: 2 }} />
                    <div><div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>{meta.label}</div><div style={muted}>{meta.hint}</div></div>
                  </li>
                );
              })}
              <li style={{ display: 'flex', gap: '0.65rem' }}>
                <Fingerprint size={16} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />
                <div><div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>Every file</div><div style={muted}>SHA-256 baseline, expected-hash and same-name substitution checks</div></div>
              </li>
              <li style={{ display: 'flex', gap: '0.65rem' }}>
                <GitBranch size={16} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />
                <div><div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>With lineage</div><div style={muted}>Risk inherited from sources, dataset version diff</div></div>
              </li>
            </ul>
          </div>

          <div className="card" style={{ display: 'flex', gap: '0.65rem' }}>
            <ShieldCheck size={18} style={{ color: '#34d399', flexShrink: 0 }} />
            <p style={muted}>
              Static analysis only: files are never unpickled, imported, installed or run. No external API key is needed to scan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
