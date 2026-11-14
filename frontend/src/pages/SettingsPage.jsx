/**
 * AISecGuard — Settings Page
 * Platform configuration, preferences, and account management.
 */

import { Settings, Shield, Bell, Database, Key, User, ChevronRight } from 'lucide-react';

const SETTINGS_SECTIONS = [
  {
    icon: User,
    color: '#3B82F6',
    title: 'Account & Profile',
    items: ['Display name', 'Email address', 'Password / API Key', 'Role: Security Analyst'],
  },
  {
    icon: Shield,
    color: '#10B981',
    title: 'Security Policies',
    items: ['Auto-quarantine on CRITICAL', 'Minimum acceptable risk score', 'Allowed artifact types', 'Scan timeout threshold'],
  },
  {
    icon: Bell,
    color: '#F59E0B',
    title: 'Alerts & Notifications',
    items: ['Email digest on scan complete', 'Slack webhook integration', 'Severity threshold for alerts', 'Weekly supply chain report'],
  },
  {
    icon: Database,
    color: '#8B5CF6',
    title: 'Local Device Cache',
    items: ['Cache storage usage', 'Auto-backup schedule', 'Retention period', 'Export / Import cache snapshot'],
  },
  {
    icon: Key,
    color: '#06B6D4',
    title: 'API & Integrations',
    items: ['API key management', 'Sigstore / Sigsum config', 'MLSBOM output format', 'CI/CD webhook endpoints'],
  },
];

export default function SettingsPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: 760, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings size={18} style={{ color: '#06b6d4' }} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
            Settings
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Configure AISecGuard platform preferences, security policies, and integrations.
        </p>
      </div>

      {/* Settings sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {SETTINGS_SECTIONS.map((section, si) => {
          const Icon = section.icon;
          return (
            <div key={si} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Section header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--color-border)',
                background: 'rgba(255,255,255,0.025)',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${section.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} style={{ color: section.color }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f1f5f9' }}>
                  {section.title}
                </span>
              </div>

              {/* Items */}
              <div>
                {section.items.map((item, ii) => (
                  <button
                    key={ii}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1.25rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: ii < section.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      fontSize: '0.845rem',
                      textAlign: 'left',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#f1f5f9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                  >
                    {item}
                    <ChevronRight size={14} style={{ color: '#475569', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: '2rem', fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>
        Full settings configuration with live persistence coming in v1.0.
      </p>
    </div>
  );
}

