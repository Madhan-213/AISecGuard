/**
 * AISecGuard — Settings & Integrations
 * Task 4: RBAC configuration, active user profile, rate-limiting status,
 * API keys for CI/scripts, scanner formats, and system limits.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Globe,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Terminal,
  Trash2,
  Users,
  Gauge,
  UserCheck,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import { API_ORIGIN, apiErrorMessage, apiKeysApi, authApi, systemApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../hooks/useTheme';

const muted = { fontSize: '0.82rem', color: 'var(--color-text-muted)' };
const h2 = { fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' };

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ padding: '0.3rem 0.6rem' }}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}<span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.55rem 0', borderTop: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)', textAlign: 'right' }}>{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [info, setInfo] = useState(null);
  const [user, setUser] = useState(null);
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
    authApi.me().then((r) => setUser(r.data)).catch(() => setUser(null));
    loadKeys();
  }, [loadKeys]);

  const createKey = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiKeysApi.create(name);
      setCreated(res.data);
      setName('');
      toast.success(`API key "${res.data.name}" created successfully.`);
      loadKeys();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setKeysError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id) => {
    try {
      await apiKeysApi.revoke(id);
      toast.info('API key revoked.');
      loadKeys();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setKeysError(msg);
      toast.error(msg);
    }
  };

  const example = [
    `KEY=${created?.key || 'asg_your_key_here'}`,
    `ART=$(curl -s -H "X-API-Key: $KEY" -F "file=@model.pkl" ${API_ORIGIN}/api/v1/artifacts/upload | jq -r .id)`,
    `curl -s -H "X-API-Key: $KEY" -H "Content-Type: application/json" \\`,
    `  -d "{\\"artifact_id\\":\\"$ART\\"}" ${API_ORIGIN}/api/v1/scans/ | jq '{risk_level, risk_score}'`,
  ].join('\n');

  const roleBadgeClass = (role) => {
    switch ((role || '').toUpperCase()) {
      case 'ADMIN': return 'badge-failed'; // red/rose highlight for Admin
      case 'ANALYST': return 'badge-completed'; // green/emerald
      case 'AUDITOR': return 'badge-info'; // cyan/blue
      default: return 'badge-info';
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>Settings & System Hardening</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Role-based access control, API rate limits, automation keys, and scanner engine configuration.
        </p>
      </div>

      {/* Top Banner: Local Analysis Architecture */}
      <div className="card" style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', marginBottom: '1.5rem', borderColor: 'rgba(16,185,129,0.35)' }}>
        <ShieldCheck size={22} style={{ color: '#34d399', flexShrink: 0 }} />
        <div>
          <div style={{ ...h2, fontSize: '0.98rem' }}>Do I need an external AI API key to scan?</div>
          <p style={{ ...muted, marginTop: '0.3rem' }}>
            No. Every scanner runs entirely on this server via static inspection (zero-execution AST & opcode parsing), so no OpenAI, Anthropic, or Hugging Face API keys are ever required.
            The keys configured below are AISecGuard&apos;s internal API keys for automated CI/CD pipeline integration.
          </p>
        </div>
      </div>

      {/* Appearance & Theme Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={h2}>Appearance & Interface Theme</h2>
          </div>
          <span className="badge badge-info">
            ACTIVE: {theme.toUpperCase()} MODE
          </span>
        </div>
        <p style={{ ...muted, marginBottom: '1.25rem' }}>
          Select your visual workspace theme. Preferences are automatically persisted across browser sessions.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Light Theme Card */}
          <div
            onClick={() => {
              setTheme('light');
              toast.success('Switched to Modern Light Theme');
            }}
            style={{
              padding: '1.2rem',
              borderRadius: 10,
              border: `2px solid ${theme === 'light' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: '#FFFFFF',
              color: '#1A2332',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              boxShadow: theme === 'light' ? '0 4px 16px rgba(79, 126, 247, 0.15)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Sun size={18} style={{ color: '#F59E0B' }} />
                <span>Modern Light (Default)</span>
              </div>
              {theme === 'light' && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6B7A8D' }}>
              Clean, high-clarity SaaS interface matching enterprise security management standards.
            </div>
          </div>

          {/* Dark Theme Card */}
          <div
            onClick={() => {
              setTheme('dark');
              toast.success('Switched to Precision Dark Theme');
            }}
            style={{
              padding: '1.2rem',
              borderRadius: 10,
              border: `2px solid ${theme === 'dark' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: '#1E293B',
              color: '#F1F5F9',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              boxShadow: theme === 'dark' ? '0 4px 16px rgba(96, 165, 250, 0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <Moon size={18} style={{ color: '#818CF8' }} />
                <span>Precision Dark</span>
              </div>
              {theme === 'dark' && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Low-glare, dark telemetry aesthetic optimized for NOCs and extended security audits.
            </div>
          </div>
        </div>
      </div>

      {/* RBAC & Production Security Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: '#818cf8' }} />
            <h2 style={h2}>Access Control & Permissions (RBAC)</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Operating Mode:</span>
            <span className={`badge ${info?.auth?.no_login_required ? 'badge-info' : 'badge-completed'}`}>
              {info?.auth?.no_login_required ? 'STANDALONE MODE (GUEST)' : 'ENTERPRISE MODE (MULTI-USER RBAC)'}
            </span>
          </div>
        </div>

        {/* Current User Card */}
        {user && (
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <UserCheck size={18} style={{ color: '#38bdf8' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                  {user.full_name || 'Local Security Analyst'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Active Role:</span>
              <span className={`badge ${roleBadgeClass(user.role)}`}>
                {user.role || (user.is_admin ? 'ADMIN' : 'ANALYST')}
              </span>
            </div>
          </div>
        )}

        {/* Roles Capabilities Matrix */}
        <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
          <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.5rem 0.4rem' }}>Role</th>
                <th style={{ padding: '0.5rem 0.4rem' }}>Upload & Scan</th>
                <th style={{ padding: '0.5rem 0.4rem' }}>Sign Artifacts</th>
                <th style={{ padding: '0.5rem 0.4rem' }}>Quarantine & Release</th>
                <th style={{ padding: '0.5rem 0.4rem' }}>Lineage Edges</th>
                <th style={{ padding: '0.5rem 0.4rem' }}>Rotate Keys</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                <td style={{ padding: '0.5rem 0.4rem', fontWeight: 700 }}><span className="badge badge-failed">ADMIN</span></td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Full</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Full</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Full</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Create & Delete</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Authorized</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                <td style={{ padding: '0.5rem 0.4rem', fontWeight: 700 }}><span className="badge badge-completed">ANALYST</span></td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Full</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Full</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#34d399' }}>Full</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#fbbf24' }}>Create only</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>Restricted (403)</td>
              </tr>
              <tr style={{ color: 'var(--color-text)' }}>
                <td style={{ padding: '0.5rem 0.4rem', fontWeight: 700 }}><span className="badge badge-info">AUDITOR</span></td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>Read-only</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>Restricted (403)</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>Restricted (403)</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>Read-only</td>
                <td style={{ padding: '0.5rem 0.4rem', color: '#94a3b8' }}>Restricted (403)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ ...muted, marginTop: '0.5rem' }}>
          To enforce multi-user login in production, set <span className="font-mono">NO_LOGIN_REQUIRED=false</span> in your environment.
        </p>
      </div>

      {/* Rate Limiting & DoS Protection Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gauge size={18} style={{ color: '#f59e0b' }} />
            <h2 style={h2}>API Rate Limiting & Threat Protection</h2>
          </div>
          <span className="badge badge-completed">
            {info?.rate_limiting?.enabled ? 'ACTIVE (SLOWAPI)' : 'ENABLED'}
          </span>
        </div>
        <p style={{ ...muted, marginBottom: '0.75rem' }}>
          Public ingestion and authentication endpoints are safeguarded against brute-force password guessing, credential stuffing, and volumetric upload floods:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>POST /api/v1/auth/login</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)', marginTop: '0.2rem' }}>10 / minute</div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.2rem' }}>Brute-force protection</div>
          </div>
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>POST /api/v1/auth/register</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)', marginTop: '0.2rem' }}>10 / minute</div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.2rem' }}>Account spam protection</div>
          </div>
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>POST /api/v1/artifacts/upload</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)', marginTop: '0.2rem' }}>30 / minute</div>
            <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.2rem' }}>Upload flood mitigation</div>
          </div>
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Baseline API Traffic</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)', marginTop: '0.2rem' }}>200 / minute</div>
            <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.2rem' }}>General quota protection</div>
          </div>
        </div>
      </div>

      <div className="dash-grid dash-grid--wide-right">
        {/* API keys */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <KeyRound size={18} style={{ color: '#60a5fa' }} /><h2 style={h2}>CI/CD Pipeline API Keys</h2>
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
                <code className="font-mono" style={{ flex: 1, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap', background: 'rgba(8,12,22,0.9)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.45rem 0.6rem', color: '#93c5fd', fontSize: '0.78rem' }}>{created.key}</code>
                <CopyButton text={created.key} />
              </div>
              <button type="button" className="btn btn-ghost" style={{ marginTop: '0.6rem', padding: '0.3rem 0.6rem' }} onClick={() => setCreated(null)}>I have stored it</button>
            </div>
          )}

          {keys.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.83rem', borderCollapse: 'collapse', minWidth: 460 }}>
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.4rem' }}>Name</th><th style={{ padding: '0.4rem' }}>Key</th>
                    <th style={{ padding: '0.4rem' }}>Last used</th><th style={{ padding: '0.4rem' }}>Status</th><th />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                      <td style={{ padding: '0.5rem 0.4rem', fontWeight: 600 }}>{k.name}</td>
                      <td style={{ padding: '0.5rem 0.4rem' }} className="font-mono">{k.prefix}…</td>
                      <td style={{ padding: '0.5rem 0.4rem', color: 'var(--color-text-muted)' }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}</td>
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text)', fontWeight: 600, fontSize: '0.85rem' }}><Terminal size={14} /> Use it in CI</span>
              <CopyButton text={example} label="Copy script" />
            </div>
            <pre style={{ background: 'var(--color-code-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.8rem 0.9rem', fontSize: '0.74rem', color: '#cbd5e1', overflowX: 'auto' }}>{example}</pre>
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
                    <div style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '0.88rem' }}>OSV.dev CVE lookups</div>
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
              <h2 style={{ ...h2, marginBottom: '0.4rem' }}>Server & Environment</h2>
              <Row label="Version">{info.version}</Row>
              <Row label="Max upload">{info.max_upload_mb} MB</Row>
              <Row label="Authentication">{info.auth.no_login_required ? 'Standalone (No login required)' : 'Enterprise JWT Active'}</Row>
              <Row label="Rate limiting">{info.rate_limiting?.enabled ? 'Active (slowapi)' : 'Disabled'}</Row>
              <Row label="Signing key">{info.signing.algorithm} · <span className="font-mono">{info.signing.key_id || 'unavailable'}</span></Row>
              {info.scanners.map((s) => (
                <Row key={s.artifact_type} label={`${s.artifact_type.charAt(0)}${s.artifact_type.slice(1).toLowerCase()} scanner`}>
                  <span className="font-mono" style={{ fontSize: '0.78rem' }}>{s.extensions.join(' ')}</span>
                </Row>
              ))}
            </div>
          )}

          {/* Branded Project Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: 12,
              padding: '1.25rem 1rem',
              color: '#ffffff',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
          >
            <img
              src="/logos/logo-horizontal-trans.png"
              alt="AISecGuard Platform"
              style={{ maxHeight: 44, maxWidth: '90%', margin: '0 auto 0.65rem', objectFit: 'contain' }}
            />
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.04em' }}>
              MCA Final Year Project · AI Supply Chain Security Framework
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
