/**
 * AISecGuard — Admin Security Policies Page
 * Direct administrative management of automated quarantine thresholds and opcode blocklists.
 */

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Lock,
  Sliders,
} from 'lucide-react';
import { adminPoliciesApi, adminErrorMessage } from '../api/adminClient';
import { useToast } from '../context/ToastContext';

export default function AdminSecurityPoliciesPage() {
  const toast = useToast();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminPoliciesApi.list();
      setPolicies(res.data?.policies || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading security policies.'));
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
      const res = await adminPoliciesApi.update(policy.id, { is_enabled: updatedEnabled });
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? res.data : p))
      );
      toast.success(`Policy '${policy.name}' ${updatedEnabled ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed updating policy state.'));
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
      const res = await adminPoliciesApi.update(policy.id, { value: policy.value });
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? res.data : p))
      );
      toast.success(`Policy '${policy.name}' saved.`);
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed saving policy parameter.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Administrative Security Policies
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Enforce mandatory AST checks, automated quarantine thresholds, and provenance verification.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchPolicies}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} />
          <span>Reload</span>
        </button>
      </div>

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
      ) : (
        <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
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
                    Policy Key: <code style={{ color: '#dc2626' }}>{p.key}</code>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.is_enabled ? '#10b981' : 'var(--color-text-muted)' }} />
                    <span>{p.is_enabled ? 'Enforced' : 'Disabled'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
