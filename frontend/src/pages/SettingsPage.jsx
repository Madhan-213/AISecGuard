/**
 * AISecGuard — Settings & System Hardening Page
 * Redesigned with the modern cybersecurity SaaS dark navy theme.
 * Features:
 * - Squircle header with AI security shield badge
 * - Architecture notice: zero external API key requirements (local static AST inspection)
 * - Appearance & theme mode toggle
 * - Active workstation & user profile card
 * - RBAC permissions matrix
 * - API keys management for CI/CD automation with cURL snippet
 * - Scanner engine limits & supported formats
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Check,
  Copy,
  Plus,
  Trash2,
  Users,
  KeyRound,
  Terminal,
  Sun,
  Moon,
  Palette,
  Layers,
  FileCode,
  Gauge,
  Lock,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { API_ORIGIN, apiErrorMessage, apiKeysApi, authApi, systemApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../hooks/useTheme';

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

function SettingRow({ label, children, borderBottom = true }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 0',
        borderBottom: borderBottom ? '1px solid var(--color-border)' : 'none',
        fontSize: '0.86rem',
      }}
    >
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)', textAlign: 'right', fontWeight: 600 }}>{children}</span>
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const [info, setInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [keysError, setKeysError] = useState('');
  const [name, setName] = useState('');
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadKeys = useCallback(() => {
    apiKeysApi
      .list()
      .then((r) => {
        setKeys(r.data);
        setKeysError('');
      })
      .catch((e) => setKeysError(apiErrorMessage(e)));
  }, []);

  useEffect(() => {
    systemApi.info().then((r) => setInfo(r.data)).catch(() => setInfo(null));
    authApi.me().then((r) => setUser(r.data)).catch(() => setUser(null));
    loadKeys();
  }, [loadKeys]);

  const createKey = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await apiKeysApi.create(name);
      setCreated(res.data);
      setName('');
      toast.success(`API key "${res.data.name}" generated.`);
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
    `KEY="${created?.key || 'asg_live_demo_key_...'}"`,
    `# 1. Upload model or dataset`,
    `ART=$(curl -s -H "X-API-Key: $KEY" -F "file=@resnet50.pkl" ${API_ORIGIN}/api/v1/artifacts/upload | jq -r .id)`,
    `# 2. Trigger scan evaluation`,
    `curl -s -H "X-API-Key: $KEY" -H "Content-Type: application/json" \\`,
    `  -d "{\\"artifact_id\\":\\"$ART\\"}" ${API_ORIGIN}/api/v1/scans/ | jq '{risk_level, risk_score}'`,
  ].join('\n');

  return (
    <div className="fade-in" style={{ padding: '1.75rem 2rem', maxWidth: 1240, margin: '0 auto' }}>
      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Header Squircle Icon */}
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              boxShadow: '0 8px 20px -4px rgba(147, 51, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a855f7',
              flexShrink: 0,
            }}
          >
            <Settings size={24} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--color-text)',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              Settings &amp; System Hardening
            </h1>
            <p
              style={{
                fontSize: '0.84rem',
                color: 'var(--color-text-muted)',
                margin: '0.35rem 0 0',
              }}
            >
              Role-based access control, API rate limits, automation keys, and scanner engine configuration.
            </p>
          </div>
        </div>

        {/* Right side: AI Security Shield Badge */}
        <div
          className="desktop-only"
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
          <img
            src="/logos/logo-shield.png"
            alt="AISecGuard Shield"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'relative',
              filter: 'drop-shadow(0 0 10px rgba(147, 51, 234, 0.45))',
            }}
          />
        </div>
      </div>

      {/* ── Top Banner: Zero External API Dependencies ── */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          background: 'var(--color-surface-card)',
          border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 16,
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={22} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 0.3rem' }}>
            Zero External AI Dependencies (Air-Gapped &amp; Private)
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
            Every scanner operates entirely on your server using zero-execution static inspection (AST analysis and safe opcode extraction).
            No external OpenAI, Anthropic, or Hugging Face cloud API keys are required or contacted. The keys below are strictly for your own automated CI/CD pipelines.
          </p>
        </div>
      </div>

      {/* ── 2-Column Settings Grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Card 1: Appearance & Theme */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            padding: '1.4rem 1.5rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(139, 92, 246, 0.12)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Palette size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Appearance &amp; Theme</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
                Toggle visual palette and ambient interface modes
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {/* Dark Mode Option */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              style={{
                padding: '1rem',
                borderRadius: 12,
                border: isDark ? '2px solid #8b5cf6' : '1px solid var(--color-border)',
                background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'var(--color-surface)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: isDark ? '#a855f7' : 'var(--color-text)' }}>
                <Moon size={18} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Dark Navy</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Cybersecurity SaaS dark theme with purple and cyan accents
              </p>
            </button>

            {/* Light Mode Option */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{
                padding: '1rem',
                borderRadius: 12,
                border: !isDark ? '2px solid #8b5cf6' : '1px solid var(--color-border)',
                background: !isDark ? 'rgba(139, 92, 246, 0.08)' : 'var(--color-surface)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: !isDark ? '#8b5cf6' : 'var(--color-text)' }}>
                <Sun size={18} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Clean Light</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', margin: 0 }}>
                High-contrast light slate theme for bright environments
              </p>
            </button>
          </div>
        </div>

        {/* Card 2: Active User Profile & Workstation */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            padding: '1.4rem 1.5rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Active Workstation Session</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
                Identity details and current operator permissions
              </p>
            </div>
          </div>

          <SettingRow label="Operator Identity">{user?.full_name || 'Security Analyst'}</SettingRow>
          <SettingRow label="Registered Email">{user?.email || 'user@aisecguard.local'}</SettingRow>
          <SettingRow label="Security Role">
            <span
              style={{
                display: 'inline-block',
                padding: '0.15rem 0.55rem',
                borderRadius: 6,
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              {user?.role || 'ANALYST'}
            </span>
          </SettingRow>
          <SettingRow label="Session Security" borderBottom={false}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.82rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} className="pulse-glow" />
              Verified Authenticated
            </span>
          </SettingRow>
        </div>
      </div>

      {/* ── Card 3: RBAC Configuration & Permissions Matrix ── */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: '1.4rem 1.5rem',
          boxShadow: 'var(--card-shadow)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(168, 85, 247, 0.12)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Role-Based Access Control (RBAC)
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Operational authority matrix across security roles
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                  background: 'var(--color-table-header-bg)',
                }}
              >
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Role</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Upload &amp; Scan</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>View Threat Reports</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Quarantine &amp; Release</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>API Keys &amp; Automation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#ef4444' }}>ADMIN</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Full Access</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Full Access</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Full Authority</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Manage All</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#10b981' }}>ANALYST</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Full Access</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Full Access</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Enforce &amp; Release</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Workspace Keys</td>
              </tr>
              <tr>
                <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#3b82f6' }}>AUDITOR</td>
                <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)' }}>— Read-Only</td>
                <td style={{ padding: '0.8rem 1rem', color: '#10b981' }}>✓ Full Access</td>
                <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)' }}>— Read-Only</td>
                <td style={{ padding: '0.8rem 1rem', color: 'var(--color-text-muted)' }}>— None</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Card 4: CI/CD Pipeline API Keys ── */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: '1.4rem 1.5rem',
          boxShadow: 'var(--card-shadow)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(249, 115, 22, 0.12)',
              color: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              CI/CD Pipeline API Keys
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Authorize GitHub Actions, Jenkins, or GitLab CI scripts to inspect artifacts automatically
            </p>
          </div>
        </div>

        {/* Newly created key banner */}
        {created && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', marginBottom: '0.35rem' }}>
              New Key Created: {created.name}
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>
              Copy this token now. It will not be shown again.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code
                className="font-mono"
                style={{
                  background: 'var(--color-surface)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {created.key}
              </code>
              <CopyButton text={created.key} label="Copy Token" />
            </div>
          </div>
        )}

        {/* Generate Key Form */}
        <form
          onSubmit={createKey}
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <input
            className="input"
            type="text"
            placeholder="Key label (e.g. github-ci-prod)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ maxWidth: 360, fontSize: '0.85rem' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !name.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem' }}
          >
            <Plus size={15} />
            <span>Generate Automation Key</span>
          </button>
        </form>

        {/* Keys Table */}
        {keys.length > 0 ? (
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '0.65rem 0.75rem' }}>Key Name</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Masked Prefix</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Created</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>{k.name}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <code className="font-mono" style={{ fontSize: '0.78rem', color: '#8b5cf6' }}>
                        {k.prefix}…
                      </code>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                      {k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => revoke(k.id)}
                        className="btn btn-ghost"
                        style={{ color: '#ef4444', padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        title="Revoke this API key"
                      >
                        <Trash2 size={13} />
                        <span>Revoke</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            No active API keys yet. Generate a key to automate scanning from CLI or pipelines.
          </div>
        )}

        {/* cURL Integration Example */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={14} style={{ color: '#8b5cf6' }} />
              <span>cURL Pipeline Integration Snippet</span>
            </span>
            <CopyButton text={example} label="Copy Script" />
          </div>
          <pre
            style={{
              background: isDark ? '#070b14' : '#1e293b',
              color: '#94a3b8',
              borderRadius: 10,
              padding: '1rem',
              fontSize: '0.78rem',
              overflowX: 'auto',
              border: '1px solid var(--color-border)',
              margin: 0,
            }}
          >
            <code>{example}</code>
          </pre>
        </div>
      </div>

      {/* ── Card 5: Engine Limits & Supported Formats ── */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: '1.4rem 1.5rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Gauge size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Scanner Engine Specifications &amp; Limits
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Runtime configuration of local AST and static inspection engines
            </p>
          </div>
        </div>

        <SettingRow label="Maximum Upload File Size">
          {info?.max_upload_mb ? `${info.max_upload_mb} MB` : '100 MB'}
        </SettingRow>
        <SettingRow label="Supported AI Models">
          <code>.pkl, .joblib, .pt, .pth, .onnx, .safetensors, .h5, .bin, .zip</code>
        </SettingRow>
        <SettingRow label="Supported Dataset Formats">
          <code>.csv, .json, .parquet, .jsonl</code>
        </SettingRow>
        <SettingRow label="Supported Dependency Manifests">
          <code>requirements.txt, pyproject.toml</code>
        </SettingRow>
        <SettingRow label="API Rate Limiting">
          <span style={{ color: '#10b981' }}>Active (100 req/min per IP)</span>
        </SettingRow>
        <SettingRow label="Engine Version" borderBottom={false}>
          <code>v0.6.0-hardened</code>
        </SettingRow>
      </div>
    </div>
  );
}
