/**
 * AISecGuard — Security Policies Page
 * Configure scanning rules, AST execution blocking, auto-quarantine thresholds, and storage limits.
 */

import { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { policiesApi, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function SecurityPoliciesPage() {
  const toast = useToast();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await policiesApi.list();
      setPolicies(res.data?.policies || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading security policies.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleToggle = async (policy) => {
    try {
      setSavingId(policy.id);
      const updatedEnabled = !policy.is_enabled;
      const res = await policiesApi.update(policy.id, { is_enabled: updatedEnabled });
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? res.data : p))
      );
      toast.success(`Policy '${policy.name}' ${updatedEnabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update policy state.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleValueChange = (id, newVal) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value: newVal } : p))
    );
  };

  const handleSaveValue = async (policy) => {
    try {
      setSavingId(policy.id);
      const res = await policiesApi.update(policy.id, { value: policy.value });
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? res.data : p))
      );
      toast.success(`Policy '${policy.name}' updated successfully.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to save policy parameter.'));
    } finally {
      setSavingId(null);
    }
  };

  const getCategoryIcon = (category) => {
    const c = (category || '').toUpperCase();
    if (c === 'SCANNER') return <Cpu size={16} className="text-purple-400" />;
    if (c === 'QUARANTINE') return <ShieldAlert size={16} className="text-red-400" />;
    if (c === 'STORAGE') return <HardDrive size={16} className="text-sky-400" />;
    return <Lock size={16} className="text-emerald-400" />;
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
              Security Policies
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Define automated compliance guardrails, opcode blocklists, and quarantine triggers.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchPolicies}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={14} />
          <span>Reload Policies</span>
        </button>
      </div>

      {/* Policies List */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Loading security policies…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : policies.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Sliders size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No security policies found.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {policies.map((p) => {
              const isBool = p.value_type === 'BOOLEAN';
              return (
                <div
                  key={p.id}
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
                      {getCategoryIcon(p.category)}
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                        {p.name}
                      </span>
                      <span className="badge" style={{ fontSize: '0.65rem', background: 'var(--color-btn-ghost-bg)', color: 'var(--color-text-muted)' }}>
                        {p.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      Key: <code style={{ color: 'var(--color-primary)' }}>{p.key}</code>
                      {p.updated_by && <span> • Updated by {p.updated_by}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {!isBool && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type={p.value_type === 'NUMBER' ? 'number' : 'text'}
                          value={p.value}
                          onChange={(e) => handleValueChange(p.id, e.target.value)}
                          style={{
                            width: 100,
                            padding: '0.35rem 0.6rem',
                            fontSize: '0.8rem',
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 6,
                            color: 'var(--color-text)',
                            outline: 'none',
                          }}
                        />
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleSaveValue(p)}
                          disabled={savingId === p.id}
                        >
                          <Save size={13} />
                        </button>
                      </div>
                    )}

                    {/* Enable / Disable toggle button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(p)}
                      disabled={savingId === p.id}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: p.is_enabled ? 'rgba(16, 185, 129, 0.4)' : 'var(--color-border)',
                        background: p.is_enabled ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-btn-ghost-bg)',
                        color: p.is_enabled ? '#10b981' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.is_enabled ? '#10b981' : 'var(--color-text-muted)' }} />
                      <span>{p.is_enabled ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
