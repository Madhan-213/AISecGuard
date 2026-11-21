/**
 * AISecGuard — Admin Audit Reports Export Page
 * Generate and download formal audit records in CSV or JSON for compliance inspections.
 */

import { useState } from 'react';
import {
  FileCheck2,
  Download,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Clock,
  Database,
  Lock,
} from 'lucide-react';
import { adminAuditApi } from '../api/adminClient';
import { useToast } from '../context/ToastContext';

export default function AdminAuditReportsPage() {
  const toast = useToast();
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  const handleDownload = async (format) => {
    try {
      setDownloadingFormat(format);
      await adminAuditApi.downloadExport(format);
      toast.success(`Audit export completed (${format.toUpperCase()}).`);
    } catch (err) {
      toast.error('Failed to download audit report.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}>
          <FileCheck2 size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
            Audit Reports & Export
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
            Generate immutable system audit trails and compliance manifests for external review.
          </p>
        </div>
      </div>

      {/* Export Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* CSV Export */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <FileText size={22} style={{ color: '#10b981' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
              Tabular Audit Trail (CSV)
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Download complete history of all user logins, artifact uploads, scan events, quarantine triggers, and policy changes in comma-separated tabular format.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontWeight: 700, padding: '0.65rem' }}
            onClick={() => handleDownload('csv')}
            disabled={downloadingFormat === 'csv'}
          >
            <Download size={14} style={{ marginRight: '0.4rem' }} />
            <span>{downloadingFormat === 'csv' ? 'Generating CSV…' : 'Download Complete Audit Log (CSV)'}</span>
          </button>
        </div>

        {/* JSON Export */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Database size={22} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
              Structured Audit Manifest (JSON)
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Download structured JSON payload containing complete forensic telemetry, actor IDs, IP headers, and entity identifiers for SIEM ingestion.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: '#fff', fontWeight: 700, padding: '0.65rem' }}
            onClick={() => handleDownload('json')}
            disabled={downloadingFormat === 'json'}
          >
            <Download size={14} style={{ marginRight: '0.4rem' }} />
            <span>{downloadingFormat === 'json' ? 'Generating JSON…' : 'Download Audit Manifest (JSON)'}</span>
          </button>
        </div>
      </div>

      {/* Compliance Standards Mapping */}
      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 16 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 0.5rem' }}>
          Compliance & Regulatory Standard Adherence
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
          AISecGuard platform audit trail complies with international AI security standards:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--color-table-header-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--color-text)', display: 'block', marginBottom: '0.2rem' }}>
              EU AI Act Art. 12
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Automatic logging of high-risk AI system operational lifecycles and pipeline changes.
            </span>
          </div>

          <div style={{ background: 'var(--color-table-header-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--color-text)', display: 'block', marginBottom: '0.2rem' }}>
              NIST AI RMF 1.0
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Continuous provenance verification and tamper-evident event documentation.
            </span>
          </div>

          <div style={{ background: 'var(--color-table-header-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <strong style={{ fontSize: '0.82rem', color: 'var(--color-text)', display: 'block', marginBottom: '0.2rem' }}>
              ISO/IEC 42001
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Artificial Intelligence Management System (AIMS) security control traceability.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
