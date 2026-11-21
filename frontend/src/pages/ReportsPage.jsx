/**
 * AISecGuard — Security Reports Hub Page
 * View, filter, and export formal security audit reports across all completed scans.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { reportsApi, apiErrorMessage, scansApi } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ReportsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [riskFilter, setRiskFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.list({ limit: 100 });
      setReports(res.data?.reports || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading security reports.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const riskMatch = riskFilter === 'ALL' || r.risk_level?.toUpperCase() === riskFilter;
      const query = searchQuery.trim().toLowerCase();
      const searchMatch =
        !query ||
        r.artifact_name?.toLowerCase().includes(query) ||
        r.artifact_type?.toLowerCase().includes(query) ||
        r.scan_id?.toLowerCase().includes(query);
      return riskMatch && searchMatch;
    });
  }, [reports, riskFilter, searchQuery]);

  const stats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const r of reports) {
      const level = (r.risk_level || '').toUpperCase();
      if (level === 'CRITICAL') critical++;
      else if (level === 'HIGH') high++;
      else if (level === 'MEDIUM') medium++;
      else if (level === 'LOW') low++;
    }

    return {
      total: reports.length,
      critical,
      high,
      medium,
      low,
      safePercent: reports.length ? Math.round(((low + medium) / reports.length) * 100) : 100,
    };
  }, [reports]);

  const handleDownload = async (scanId, format) => {
    try {
      setDownloadingId(`${scanId}-${format}`);
      const res = await reportsApi.get(scanId, format);
      if (format === 'pdf') {
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aisecguard_report_${scanId.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aisecguard_report_${scanId.slice(0, 8)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      toast.success(`Security report downloaded (${format.toUpperCase()}).`);
    } catch (err) {
      toast.error(apiErrorMessage(err, `Failed downloading ${format.toUpperCase()} report.`));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)' }}>
            <FileText size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Security Reports
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Remediation audits, vulnerability breakdowns, and cryptographic verification manifests.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchReports}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
        >
          Refresh Reports
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Generated Reports
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '0.3rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Completed scan audits
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            High & Critical Risks
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', marginTop: '0.3rem' }}>
            {stats.critical + stats.high}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Immediate remediation needed
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Clean / Low Risk
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', marginTop: '0.3rem' }}>
            {stats.low}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Passed security baseline
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Compliance Rate
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.3rem' }}>
            {stats.safePercent}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Non-critical artifact ratio
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              style={{
                fontSize: '0.78rem',
                fontWeight: riskFilter === lvl ? 700 : 500,
                padding: '0.4rem 0.8rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: riskFilter === lvl ? 'var(--color-primary)' : 'var(--color-border)',
                background: riskFilter === lvl ? 'var(--color-primary-light)' : 'transparent',
                color: riskFilter === lvl ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {lvl === 'ALL' ? 'All Risk Levels' : lvl}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search report by artifact name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '2.1rem',
              paddingRight: '0.75rem',
              paddingTop: '0.4rem',
              paddingBottom: '0.4rem',
              fontSize: '0.8rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Loading security reports…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No security reports found.</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Complete a scan from Upload & Scan to generate reports.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Scanned Artifact</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Risk Level</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Threat Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Findings Breakdown</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Completed On</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Export Formats</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr
                    key={r.scan_id}
                    style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.15s ease' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                        <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.artifact_name}>
                          {r.artifact_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)' }}>
                      {r.artifact_type}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge badge-${(r.risk_level || 'unknown').toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                        {r.risk_level}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                      {r.risk_score} / 100
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem' }}>
                        {r.critical_count > 0 && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>
                            {r.critical_count} Crit
                          </span>
                        )}
                        {r.high_count > 0 && (
                          <span style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>
                            {r.high_count} High
                          </span>
                        )}
                        {r.medium_count > 0 && (
                          <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '0.1rem 0.35rem', borderRadius: 4, fontWeight: 700 }}>
                            {r.medium_count} Med
                          </span>
                        )}
                        {r.findings_count === 0 && (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={13} /> Clean
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => navigate(`/scans/${r.scan_id}`)}
                          title="View interactive scan details"
                        >
                          <Eye size={13} />
                          <span style={{ marginLeft: '0.3rem' }}>View</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: '#ef4444' }}
                          onClick={() => handleDownload(r.scan_id, 'pdf')}
                          disabled={downloadingId === `${r.scan_id}-pdf`}
                          title="Download PDF Security Report"
                        >
                          <Download size={13} />
                          <span style={{ marginLeft: '0.3rem' }}>{downloadingId === `${r.scan_id}-pdf` ? '…' : 'PDF'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                          onClick={() => handleDownload(r.scan_id, 'json')}
                          disabled={downloadingId === `${r.scan_id}-json`}
                          title="Download structured JSON report"
                        >
                          <Download size={13} />
                          <span style={{ marginLeft: '0.3rem' }}>{downloadingId === `${r.scan_id}-json` ? '…' : 'JSON'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
