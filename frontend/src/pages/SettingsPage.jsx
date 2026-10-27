/**
 * AISecGuard — Settings & integrations (Week 9)
 * API keys for CI/scripts, integration status, scanner formats and limits.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, Globe, KeyRound, Plus, ShieldCheck, Terminal, Trash2 } from 'lucide-react';
import { API_ORIGIN, apiErrorMessage, apiKeysApi, systemApi } from '../api/client';

const muted = { fontSize: '0.82rem', color: '#94a3b8' };
const h2 = { fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' };

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ padding: '0.3rem 0.6rem' }}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}<span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.55rem 0', borderTop: '1px solid #1e293b', fontSize: '0.85rem' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [info, setInfo] = useState(null);
  const [keys, setKeys] = useState([]);
  const [keysError, setKeysError] = useState('');
  const [name, setName] = useState('');
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadKeys = useCallback(() => {
    apiKeysApi.list().then((r) => { setKeys(r.data); setKeysError(''); }).catch((e) => setKeysError(apiErrorMessage(e)));
  }, []);

  useEffect(() => {
    systemApi.info().then((r) => setInfo(r.data)).catch(() => setInfo(null));
    loadKeys();
  }, [loadKeys]);

  const createKey = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiKeysApi.create(name);
      setCreated(res.data);
      setName('');
      loadKeys();
    } catch (err) {
      setKeysError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    try {
      await apiKeysApi.revoke(id);
      loadKeys();
    } catch (err) {
      setKeysError(apiErrorMessage(err));
    }
  };

  const example = [
    `KEY=${created?.key || 'asg_your_key_here'}`,
    `ART=$(curl -s -H "X-API-Key: $KEY" -F "file=@model.pkl" ${API_ORIGIN}/api/v1/artifacts/upload | jq -r .id)`,
    `curl -s -H "X-API-Key: $KEY" -H "Content-Type: application/json" \\`,
    `  -d "{\\"artifact_id\\":\\"$ART\\"}" ${API_ORIGIN}/api/v1/scans/ | jq '{risk_level, risk_score}'`,
  ].join('\n');

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Settings & integrations</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.9rem' }}>API keys for automation, plus what this server scans and which integrations are switched on.</p>
      </div>

      <div className="card" style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', marginBottom: '1.25rem', borderColor: 'rgba(16,185,129,0.35)' }}>
        <ShieldCheck size={22} style={{ color: '#34d399', flexShrink: 0 }} />
        <div>
          <div style={{ ...h2, fontSize: '0.98rem' }}>Do I need an API key to scan?</div>
          <p style={{ ...muted, marginTop: '0.3rem' }}>
            No. Every scanner runs locally on the server with static analysis, so no OpenAI, Hugging Face or other third-party key is
            needed. The keys below are AISecGuard&apos;s own: they let a CI pipeline or script upload and scan through the API without logging in.
          </p>
        </div>
      </div>

      <div className="dash-grid dash-grid--wide-right">
        {/* API keys */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <KeyRound size={18} style={{ color: '#60a5fa' }} /><h2 style={h2}>API keys</h2>
          </div>
          <p style={{ ...muted, marginBottom: '1rem' }}>Send a key in the <span className="font-mono">X-API-Key</span> header. Only a hash is stored; the key is shown once.</p>
          {keysError && <div className="alert-error" style={{ marginBottom: '1rem' }}>{keysError}</div>}

          <form onSubmit={createKey} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. github-actions" maxLength={100} aria-label="New key name" />
            <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}><Plus size={15} /><span>Create key</span></button>
          </form>

          {created && (
            <div style={{ border: '1px solid rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>
                <AlertTriangle size={15} /> Copy &ldquo;{created.name}&rdquo; now: it will not be shown again.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.6rem' }}>
                <code className="font-mono" style={{ flex: 1, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap', background: 'rgba(8,12,22,0.9)', border: '1px solid #1e293b', borderRadius: 6, padding: '0.45rem 0.6rem', color: '#93c5fd', fontSize: '0.78rem' }}>{created.key}</code>
                <CopyButton text={created.key} />
              </div>
              <button type="button" className="btn btn-ghost" style={{ marginTop: '0.6rem', padding: '0.3rem 0.6rem' }} onClick={() => setCreated(null)}>I have stored it</button>
            </div>
          )}

          {keys.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.83rem', borderCollapse: 'collapse', minWidth: 460 }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.4rem' }}>Name</th><th style={{ padding: '0.4rem' }}>Key</th>
                    <th style={{ padding: '0.4rem' }}>Last used</th><th style={{ padding: '0.4rem' }}>Status</th><th />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} style={{ borderTop: '1px solid #1e293b', color: '#e2e8f0' }}>
                      <td style={{ padding: '0.5rem 0.4rem', fontWeight: 600 }}>{k.name}</td>
                      <td style={{ padding: '0.5rem 0.4rem' }} className="font-mono">{k.prefix}…</td>
                      <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}</td>
                      <td style={{ padding: '0.5rem 0.4rem' }}>
                        <span className={`badge ${k.revoked_at ? 'badge-failed' : 'badge-completed'}`}>{k.revoked_at ? 'REVOKED' : 'ACTIVE'}</span>
                      </td>
                      <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>
                        {!k.revoked_at && (
                          <button type="button" className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => revoke(k.id)} aria-label={`Revoke ${k.name}`}>
                            <Trash2 size={13} /><span>Revoke</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !keysError && <p style={muted}>No keys yet.</p>}

          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}><Terminal size={14} /> Use it in CI</span>
              <CopyButton text={example} label="Copy script" />
            </div>
            <pre style={{ background: 'rgba(8,12,22,0.95)', border: '1px solid #1e293b', borderRadius: 8, padding: '0.8rem 0.9rem', fontSize: '0.74rem', color: '#cbd5e1', overflowX: 'auto' }}>{example}</pre>
            <p style={{ ...muted, marginTop: '0.4rem' }}>Fail the build when <span className="font-mono">risk_level</span> is HIGH or CRITICAL.</p>
          </div>
        </div>

        {/* Server info */}
        <div style={{ display: 'grid', gap: '1.25rem', alignContent: 'start' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Globe size={18} style={{ color: '#60a5fa' }} /><h2 style={h2}>Integrations</h2>
            </div>
            {info ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.88rem' }}>OSV.dev CVE lookups</div>
                    <div style={muted}>{info.integrations.osv.description}</div>
                  </div>
                  <span className={`badge ${info.integrations.osv.enabled ? 'badge-completed' : 'badge-info'}`}>{info.integrations.osv.enabled ? 'ON' : 'OFF'}</span>
                </div>
                {!info.integrations.osv.enabled && (
                  <p style={{ ...muted, fontSize: '0.75rem' }}>
                    To enable, set <span className="font-mono">{info.integrations.osv.setting}=true</span> in the backend environment
                    (<span className="font-mono">.env</span> or <span className="font-mono">docker-compose.yml</span>) and restart. The server needs internet access.
                  </p>
                )}
              </>
            ) : <p style={muted}>Backend not reachable.</p>}
          </div>

          {info && (
            <div className="card">
              <h2 style={{ ...h2, marginBottom: '0.4rem' }}>Server</h2>
              <Row label="Version">{info.version}</Row>
              <Row label="Max upload">{info.max_upload_mb} MB</Row>
              <Row label="Login">{info.auth.no_login_required ? 'Not required (standalone mode)' : 'Required'}</Row>
              <Row label="Signing key">{info.signing.algorithm} · <span className="font-mono">{info.signing.key_id || 'unavailable'}</span></Row>
              {info.scanners.map((s) => (
                <Row key={s.artifact_type} label={`${s.artifact_type.charAt(0)}${s.artifact_type.slice(1).toLowerCase()} scanner`}>
                  <span className="font-mono" style={{ fontSize: '0.78rem' }}>{s.extensions.join(' ')}</span>
                </Row>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
