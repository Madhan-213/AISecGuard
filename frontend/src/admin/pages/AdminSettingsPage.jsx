/**
 * AISecGuard — Admin Application Settings Page
 * Platform name, max upload sizes, session timeouts, scan concurrency, and isolation modes.
 */

import { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Lock,
  Cpu,
  Globe,
} from 'lucide-react';
import { adminSettingsApi, adminErrorMessage } from '../api/adminClient';
import { useToast } from '../../context/ToastContext';

export default function AdminSettingsPage() {
  const toast = useToast();

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminSettingsApi.list();
      setSettings(res.data?.settings || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading system settings.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleValueChange = (key, val) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: val } : s))
    );
  };

  const handleSave = async (setting) => {
    try {
      setSavingKey(setting.key);
      await adminSettingsApi.update(setting.key, setting.value);
      toast.success(`Setting '${setting.key}' saved successfully.`);
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed updating setting.'));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' }}>
            <Sliders size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Application Settings & Configuration
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Core platform parameters, upload thresholds, session timeouts, and network policies.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchSettings}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} />
          <span>Reload</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
          <div>Loading system configuration…</div>
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <div>{error}</div>
        </div>
      ) : (
        <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
          {settings.map((s) => (
            <div
              key={s.key}
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                flexWrap: 'wrap',
              }}
              className="table-row-hover"
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <code style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>{s.key}</code>
                  <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--color-btn-ghost-bg)', color: 'var(--color-text-muted)' }}>
                    {s.category}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {s.description}
                </p>
                {s.updated_by && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                    Last updated by {s.updated_by} on {new Date(s.updated_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type={s.value_type === 'NUMBER' ? 'number' : 'text'}
                  value={s.value}
                  onChange={(e) => handleValueChange(s.key, e.target.value)}
                  style={{
                    width: s.value_type === 'NUMBER' ? 100 : 200,
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.8rem',
                    borderRadius: 8,
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSave(s)}
                  disabled={savingKey === s.key}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', background: 'linear-gradient(135deg, #dc2626, #7c3aed)', border: 'none', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Save size={13} />
                  <span>{savingKey === s.key ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
