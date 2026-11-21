/**
 * AISecGuard — Admin Database Backups & Restore Management Page
 * Point-in-time database snapshots, cryptographic integrity validation (SHA-256), and Super-Admin restore workflows.
 */

import { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Calendar,
  HardDrive,
  FileText,
  Lock,
} from 'lucide-react';
import { adminBackupsApi, adminErrorMessage } from '../api/adminClient';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminBackupsPage() {
  const toast = useToast();
  const { isSuperAdmin, adminUser } = useAdminAuth();

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  // Restore Modal State
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminBackupsApi.list();
      setBackups(res.data?.backups || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading database backup records.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const res = await adminBackupsApi.create();
      toast.success(res.data?.message || 'Backup snapshot created successfully.');
      fetchBackups();
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed to create database snapshot.'));
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    try {
      setRestoring(true);
      const res = await adminBackupsApi.restore(selectedBackup.id);
      toast.success(res.data?.message || 'Backup snapshot verified and restored.');
      setSelectedBackup(null);
      fetchBackups();
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Restore operation failed.'));
    } finally {
      setRestoring(false);
    }
  };

  const copyToClipboard = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success('SHA-256 hash copied to clipboard.');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
            }}
          >
            <Database size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Database Backups & Disaster Recovery
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Point-in-time system state snapshots, automated integrity verification, and recovery management.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-ghost"
            onClick={fetchBackups}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={13} />
            <span>Reload</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleCreateBackup}
            disabled={creating}
            style={{
              fontSize: '0.8rem',
              padding: '0.45rem 0.95rem',
              background: 'linear-gradient(135deg, #0ea5e9, #4f46e5)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {creating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
            <span>{creating ? 'Creating Snapshot…' : 'Create Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Super Admin Notice */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 10,
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          fontSize: '0.82rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <Lock size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--color-text)' }}>Disaster Recovery Policy:</strong> Point-in-time backups can be generated by all administrators.
          Restoration procedures strictly require <span style={{ color: '#dc2626', fontWeight: 700 }}>SUPER_ADMIN</span> credentials and automated cryptographic SHA-256 match verification.
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
          <div>Scanning backup storage repository…</div>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <div>{error}</div>
        </div>
      ) : backups.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Database size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--color-text)' }}>
            No Database Snapshots Recorded
          </h3>
          <p style={{ fontSize: '0.82rem', margin: '0 0 1.25rem' }}>
            Protect your system against catastrophic failures by creating your first point-in-time snapshot.
          </p>
          <button className="btn btn-primary" onClick={handleCreateBackup} disabled={creating} style={{ fontSize: '0.8rem' }}>
            <Plus size={14} style={{ marginRight: 6 }} /> Create Snapshot Now
          </button>
        </div>
      ) : (
        <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.01)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Saved Database Snapshots ({backups.length})
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255, 255, 255, 0.02)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Filename</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Size</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>SHA-256 Hash</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>Created By</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={15} color="#0ea5e9" />
                        <code>{b.filename}</code>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      {formatBytes(b.file_size)}
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.68rem',
                          background: b.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: b.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
                          border: `1px solid ${b.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        }}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      {b.sha256 ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <code style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {b.sha256.slice(0, 12)}…{b.sha256.slice(-8)}
                          </code>
                          <button
                            onClick={() => copyToClipboard(b.sha256)}
                            title="Copy full SHA-256 hash"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: copiedHash === b.sha256 ? '#10b981' : 'var(--color-text-muted)' }}
                          >
                            {copiedHash === b.sha256 ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>N/A</span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      {b.created_at ? new Date(b.created_at).toLocaleString() : 'N/A'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                      {b.created_by || 'system'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setSelectedBackup(b)}
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.35rem 0.65rem',
                          color: '#0ea5e9',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>Verify / Restore</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {selectedBackup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card animate-fade-in"
            style={{
              maxWidth: 500,
              width: '100%',
              padding: '1.75rem',
              borderRadius: 16,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                Restore Database Snapshot
              </h3>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 1rem' }}>
              You are about to initiate recovery for snapshot:
              <br />
              <code style={{ color: '#0ea5e9', fontWeight: 700, display: 'inline-block', marginTop: '0.3rem' }}>
                {selectedBackup.filename}
              </code>
            </p>

            <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.25rem', fontSize: '0.78rem', color: 'var(--color-text)' }}>
              <strong>Caution:</strong> Database restoration verifies SHA-256 integrity against the recorded baseline. Only <span style={{ color: '#dc2626' }}>SUPER_ADMIN</span> is authorized to execute this disaster recovery pipeline.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedBackup(null)}
                disabled={restoring}
                style={{ fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRestoreBackup}
                disabled={restoring}
                style={{
                  fontSize: '0.82rem',
                  padding: '0.45rem 1rem',
                  background: '#dc2626',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {restoring ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RotateCcw size={14} />}
                <span>{restoring ? 'Verifying & Restoring…' : 'Confirm Restoration'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
