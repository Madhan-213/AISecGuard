/**
 * AISecGuard — Admin Roles & Permissions Page
 * Role-based access control matrix, capability breakdown, and privilege boundaries.
 */

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertTriangle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { adminRolesApi, adminErrorMessage } from '../api/adminClient';

export default function AdminRolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminRolesApi.get();
      setRoles(res.data?.roles || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading roles directory.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Roles & Permissions Matrix
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Hierarchical role definitions, privilege barriers, and backend API authorization scopes.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchRoles}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
          <div>Loading RBAC matrix…</div>
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <div>{error}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {roles.map((r) => {
            const isSuper = r.id === 'SUPER_ADMIN';
            const isAdmin = r.id === 'ADMIN';
            return (
              <div
                key={r.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  border: '1px solid',
                  borderColor: isSuper ? 'rgba(239, 68, 68, 0.4)' : isAdmin ? 'rgba(124, 58, 237, 0.4)' : 'var(--color-border)',
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: isSuper ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%)' : 'transparent',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.5rem',
                      borderRadius: 6,
                      background: isSuper ? 'rgba(239, 68, 68, 0.2)' : isAdmin ? 'rgba(124, 58, 237, 0.2)' : 'var(--color-btn-ghost-bg)',
                      color: isSuper ? '#ef4444' : isAdmin ? '#a855f7' : 'var(--color-text)',
                    }}>
                      LEVEL {r.level}
                    </span>
                    <Lock size={15} style={{ color: 'var(--color-text-muted)' }} />
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 0.35rem' }}>
                    {r.name}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                    {r.description}
                  </p>

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                      Granted Permissions:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {r.permissions.map((p) => (
                        <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--color-text)' }}>
                          <CheckCircle2 size={14} style={{ color: isSuper ? '#ef4444' : '#10b981', flexShrink: 0, marginTop: '0.15rem' }} />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
