/**
 * AISecGuard — Scan Detail & Remediation Report
 * Deep-dive findings inspection, circular risk gauge, copyable SHA-256 hash, and PDF/JSON export.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scansApi, artifactsApi } from '../api/client';
import SupplyChainPanel from '../components/supply/SupplyChainPanel';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  Download,
  Lock,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FileCode,
  ArrowLeft,
} from 'lucide-react';

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];

const SEV_CONFIG = {
  CRITICAL: {
    bg: 'rgba(220, 38, 38, 0.1)',
    border: 'rgba(220, 38, 38, 0.35)',
    text: '#f87171',
    badgeCls: 'badge-critical',
  },
  HIGH: {
    bg: 'rgba(234, 88, 12, 0.1)',
    border: 'rgba(234, 88, 12, 0.35)',
    text: '#fb923c',
    badgeCls: 'badge-high',
  },
  MEDIUM: {
    bg: 'rgba(202, 138, 4, 0.1)',
    border: 'rgba(202, 138, 4, 0.35)',
    text: '#fbbf24',
    badgeCls: 'badge-medium',
  },
  LOW: {
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.35)',
    text: '#34d399',
    badgeCls: 'badge-low',
  },
  INFORMATIONAL: {
    bg: 'rgba(100, 116, 139, 0.1)',
    border: 'rgba(100, 116, 139, 0.3)',
    text: '#94a3b8',
    badgeCls: 'badge-info',
  },
};

const RISK_GAUGE_COLORS = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#10b981',
  UNKNOWN:  '#64748b',
};

function FindingAccordionItem({ finding }) {
  const [open, setOpen] = useState(false);
  const cfg = SEV_CONFIG[finding.severity] || SEV_CONFIG.INFORMATIONAL;

  return (
    <div style={{
      border: `1px solid ${open ? cfg.border : 'var(--color-border)'}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: '0.875rem',
      background: open ? 'var(--color-surface)' : 'var(--color-card-subtle-bg)',
      transition: 'all 0.2s ease',
    }}>
      <button
        type="button"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: open ? cfg.bg : 'transparent',
          cursor: 'pointer',
          border: 'none',
          color: 'var(--color-text)',
          textAlign: 'left',
          gap: '1rem',
        }}
        onClick={() => setOpen(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <span className={`badge ${cfg.badgeCls}`}>
            {finding.severity}
          </span>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
            {finding.title}
          </span>
          {finding.rule_id && (
            <span style={{
              fontSize: '0.7rem',
              background: 'rgba(59, 130, 246, 0.18)',
              color: '#60a5fa',
              padding: '0.15rem 0.45rem',
              borderRadius: 4,
              fontFamily: 'monospace',
            }}>
              {finding.rule_id}
            </span>
          )}
        </div>
        <div style={{ color: '#94a3b8' }}>
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
          {/* Description */}
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
            {finding.description}
          </p>

          {/* Evidence snippet */}
          {finding.evidence && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                <FileCode size={14} />
                <span>Extracted Telemetry & Byte Evidence</span>
              </div>
              <pre style={{
                background: 'var(--color-code-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '0.875rem 1rem',
                fontSize: '0.78rem',
                color: '#93c5fd',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {finding.evidence}
              </pre>
            </div>
          )}

          {/* Remediation Recommendation */}
          {finding.recommendation && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 8,
              padding: '0.875rem 1rem',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                ✓ Prescribed Mitigation
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.45 }}>
                {finding.recommendation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { deviceCache } from '../utils/deviceCache';

export default function ScanDetailPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  // Check local device cache memory first
  const cachedScan = deviceCache.getScan(scanId);
  const cachedArtifact = cachedScan ? (cachedScan.artifact || deviceCache.getArtifact(cachedScan.artifact_id)) : null;

  const [scan, setScan] = useState(cachedScan);
  const [artifact, setArtifact] = useState(cachedArtifact);
  const [loading, setLoading] = useState(!cachedScan);
  const [error, setError] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    // If not in cache or updating from backend
    scansApi.get(scanId)
      .then(res => {
        setScan(res.data);
        deviceCache.saveScan(res.data);
        return artifactsApi.get(res.data.artifact_id);
      })
      .then(res => {
        setArtifact(res.data);
        deviceCache.saveArtifact(res.data);
      })
      .catch(() => {
        // If backend fails, check if we already have it in device cache
        const local = deviceCache.getScan(scanId);
        if (local) {
          setScan(local);
          setArtifact(local.artifact || deviceCache.getArtifact(local.artifact_id));
        } else {
          setError('Scan details not found in device cache or server.');
        }
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  const handleCopyHash = () => {
    if (artifact?.sha256) {
      navigator.clipboard.writeText(artifact.sha256);
      setCopiedHash(true);
      toast.success('Cryptographic SHA-256 copied to clipboard.');
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleExport = async (format) => {
    setExportingFormat(format);
    const url = scansApi.reportUrl(scanId, format);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Export returned non-200');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aisecguard_report_${scanId.slice(0, 8)}.${format}`;
      a.click();
      toast.success(`Exported ${format.toUpperCase()} report successfully.`);
    } catch {
      // Fallback export from local device cache memory
      if (format === 'json' && scan) {
        const jsonBlob = new Blob([JSON.stringify({
          scan_id: scan.id,
          scan_type: scan.scan_type,
          risk_score: scan.risk_score,
          risk_level: scan.risk_level,
          artifact: artifact || scan.artifact,
          findings: scan.findings || [],
          exported_from: 'Local Device Cache Memory',
          exported_at: new Date().toISOString(),
        }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(jsonBlob);
        a.download = `aisecguard_report_${scanId.slice(0, 8)}.json`;
        a.click();
        toast.success('Exported JSON report from device cache memory.');
      } else {
        toast.error(`Exporting ${format.toUpperCase()} report requires active backend with ReportLab.`);
      }
    } finally {
      setExportingFormat(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.875rem' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <span style={{ color: 'var(--color-text-muted)' }}>Retrieving scan results…</span>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div style={{ padding: '2rem 2.5rem', maxWidth: 900, margin: '0 auto' }}>
        <div className="alert-error">{error || 'Scan not found.'}</div>
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => navigate('/scans')}>
          <ArrowLeft size={16} />
          <span>Return to Scans Inventory</span>
        </button>
      </div>
    );
  }

  const findings = scan.findings || [];
  const riskGaugeColor = RISK_GAUGE_COLORS[scan.risk_level] || '#64748b';
  const sortedFindings = [...findings].sort((a, b) =>
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div className="fade-in" style={{ padding: '2rem 2.5rem', maxWidth: 1080, margin: '0 auto' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#64748b' }}>
          <span style={{ cursor: 'pointer', color: '#38bdf8' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
          <span>/</span>
          <span style={{ cursor: 'pointer', color: '#38bdf8' }} onClick={() => navigate('/scans')}>Scans</span>
          <span>/</span>
          <span className="font-mono" style={{ color: 'var(--color-text-muted)' }}>{scanId.slice(0, 8)}…</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            id="btn-export-json"
            className="btn btn-ghost"
            disabled={exportingFormat !== null}
            onClick={() => handleExport('json')}
          >
            <Download size={15} />
            <span>{exportingFormat === 'json' ? 'Generating…' : 'JSON Report'}</span>
          </button>

          <button
            id="btn-export-pdf"
            className="btn btn-ghost"
            disabled={exportingFormat !== null}
            onClick={() => handleExport('pdf')}
          >
            <Download size={15} />
            <span>{exportingFormat === 'pdf' ? 'Compiling…' : 'PDF Report'}</span>
          </button>

          {artifact?.status !== 'QUARANTINED' && (
            <button
              id="btn-quarantine"
              className="btn btn-danger"
              onClick={() => navigate(`/quarantine?artifact=${scan.artifact_id}`)}
            >
              <Lock size={15} />
              <span>Quarantine Artifact</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Info */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
            Inspection Report
          </h1>
          <span className={`badge badge-${(scan.status || '').toLowerCase()}`}>
            {scan.status}
          </span>
        </div>
        <div className="font-mono" style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
          Scan UUID: {scan.id}
        </div>
      </div>

      {/* Top Metrics: Risk Score Gauge + Artifact Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Risk Score Circular Gauge */}
        <div className="card" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '1.25rem' }}>
            Aggregated Threat Score
          </span>

          <div style={{
            width: 130,
            height: 130,
            borderRadius: '50%',
            border: `6px solid ${riskGaugeColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 35px ${riskGaugeColor}30`,
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '2.6rem', fontWeight: 900, color: riskGaugeColor, lineHeight: 1 }}>
              {scan.risk_score}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>/ 50 MAX</span>
          </div>

          <span className={`badge badge-${(scan.risk_level || 'info').toLowerCase()}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}>
            {scan.risk_level} RISK TIER
          </span>
        </div>

        {/* Artifact & Scan Properties Grid */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Artifact Metadata & Provenance
            </span>
            {artifact && (
              <span className={`badge badge-${(artifact.status || '').toLowerCase()}`}>
                Status: {artifact.status}
              </span>
            )}
          </div>

          {artifact && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem 1.5rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Original Filename</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{artifact.original_filename}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Artifact Classification</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{artifact.artifact_type}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>File Payload Size</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{(artifact.file_size / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Uploaded Timestamp</span>
                <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>{new Date(artifact.uploaded_at).toLocaleString()}</span>
              </div>

              {/* SHA-256 with Copy Action */}
              <div style={{ gridColumn: '1 / -1', background: 'var(--color-code-bg)', padding: '0.65rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>CRYPTOGRAPHIC SHA-256 HASH</span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedHash ? '#34d399' : '#60a5fa',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {copiedHash ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedHash ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono" style={{ fontSize: '0.75rem', color: '#93c5fd', wordBreak: 'break-all' }}>
                  {artifact.sha256}
                </div>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '1.25rem', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Scan Engine Type</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{scan.scan_type}</span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Completed At</span>
              <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>
                {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : 'In Progress'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supply chain: signature, lineage, compliance, documents */}
      <SupplyChainPanel
        artifact={artifact}
        scan={scan}
        onChanged={() => artifactsApi.get(scan.artifact_id).then(res => setArtifact(res.data)).catch(() => {})}
      />

      {/* Security Findings Accordion List */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Identified Security Findings
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.125rem' }}>
              {findings.length} total anomalies flagged during heuristic parsing
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {SEVERITY_ORDER.map(sev => {
              const count = findings.filter(f => f.severity === sev).length;
              if (!count) return null;
              const cfg = SEV_CONFIG[sev];
              return (
                <span key={sev} className={`badge ${cfg.badgeCls}`}>
                  {sev} · {count}
                </span>
              );
            })}
          </div>
        </div>

        {sortedFindings.length > 0 ? (
          <div>
            {sortedFindings.map(f => (
              <FindingAccordionItem key={f.id} finding={f} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
            <ShieldCheck size={40} style={{ color: '#10b981', margin: '0 auto 0.75rem', opacity: 0.8 }} />
            <p style={{ fontWeight: 600, color: '#34d399' }}>Zero Threats Detected</p>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              The artifact satisfies all static heuristics and baseline integrity verifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
