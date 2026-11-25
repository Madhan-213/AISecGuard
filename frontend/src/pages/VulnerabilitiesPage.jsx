/**
 * AISecGuard — Vulnerability Analysis Page
 * Comprehensive vulnerability intelligence feed, rule detection breakdown, and mitigation guide.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code2,
  Terminal,
  Info,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { findingsApi, apiErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import PaginationControl from '../components/PaginationControl';

export default function VulnerabilitiesPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [expandedId, setExpandedId] = useState(null);

  const fetchFindings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await findingsApi.list({ limit: 200 });
      setFindings(res.data?.findings || []);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed loading vulnerability database.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const sev = (f.severity || '').toUpperCase();
      const sevMatch = severityFilter === 'ALL' || sev === severityFilter;
      const query = searchQuery.trim().toLowerCase();
      const searchMatch =
        !query ||
        f.title?.toLowerCase().includes(query) ||
        f.rule_id?.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query) ||
        f.evidence?.toLowerCase().includes(query) ||
        f.finding_type?.toLowerCase().includes(query);
      return sevMatch && searchMatch;
    });
  }, [findings, severityFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [severityFilter, searchQuery]);

  // Paginated Findings (10 per page)
  const paginatedFindings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFindings.slice(start, start + PAGE_SIZE);
  }, [filteredFindings, currentPage, PAGE_SIZE]);

  const stats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const f of findings) {
      const s = (f.severity || '').toUpperCase();
      if (s === 'CRITICAL') critical++;
      else if (s === 'HIGH') high++;
      else if (s === 'MEDIUM') medium++;
      else if (s === 'LOW' || s === 'INFORMATIONAL') low++;
    }

    return {
      total: findings.length,
      critical,
      high,
      medium,
      low,
    };
  }, [findings]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Vulnerability Analysis
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '0.15rem' }}>
              Aggregated threat detections, arbitrary code execution opcodes, and mitigation playbooks.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={fetchFindings}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
        >
          Refresh Vulnerabilities
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Critical Severity
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', marginTop: '0.3rem' }}>
            {stats.critical}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            RCE & deserialization exploits
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            High Severity
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f97316', marginTop: '0.3rem' }}>
            {stats.high}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Data poisoning & malicious imports
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Medium Severity
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#eab308', marginTop: '0.3rem' }}>
            {stats.medium}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Substitution & metadata skews
          </div>
        </div>

        <div className="card" style={{ padding: '1.1rem 1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Low / Informational
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', marginTop: '0.3rem' }}>
            {stats.low}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Provenance anomalies & warnings
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              style={{
                fontSize: '0.78rem',
                fontWeight: severityFilter === s ? 700 : 500,
                padding: '0.4rem 0.8rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: severityFilter === s ? 'var(--color-primary)' : 'var(--color-border)',
                background: severityFilter === s ? 'var(--color-primary-light)' : 'transparent',
                color: severityFilter === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {s === 'ALL' ? 'All Severities' : s}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search rule ID, CVE, opcode, description..."
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

      {/* Vulnerabilities Table / Accordion */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Scanning threat catalog…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 0.75rem', color: '#10b981' }} />
            <div style={{ fontWeight: 600 }}>No vulnerabilities detected matching criteria.</div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Your scanned artifacts have passed the selected security heuristic filters.</p>
          </div>
        ) : (
          <>
            <PaginationControl
              currentPage={currentPage}
              totalItems={filteredFindings.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="vulnerabilities"
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {paginatedFindings.map((f) => {
              const isExpanded = expandedId === f.id;
              const sev = (f.severity || 'LOW').toUpperCase();
              return (
                <div
                  key={f.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: isExpanded ? 'var(--color-table-header-bg)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div
                    onClick={() => toggleExpand(f.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                      </span>
                      <span className={`badge badge-${sev.toLowerCase()}`} style={{ fontSize: '0.72rem', flexShrink: 0 }}>
                        {sev}
                      </span>
                      <code style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-btn-ghost-bg)', padding: '0.15rem 0.45rem', borderRadius: 4, border: '1px solid var(--color-border)', flexShrink: 0 }}>
                        {f.rule_id || 'SEC-001'}
                      </code>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.title}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {f.finding_type}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (f.scan_id) navigate(`/scans/${f.scan_id}`);
                        }}
                      >
                        Scan Link
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Pane */}
                  {isExpanded && (
                    <div style={{ padding: '0 1.25rem 1.25rem 3.25rem', fontSize: '0.82rem' }}>
                      <div style={{ marginBottom: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--color-text)' }}>Description: </strong>
                        {f.description}
                      </div>

                      {f.evidence && (
                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Code2 size={14} className="text-purple-400" />
                            <span>Detected Opcode / Byte Evidence:</span>
                          </div>
                          <pre style={{ margin: 0, padding: '0.75rem', background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#38bdf8', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace' }}>
                            {f.evidence}
                          </pre>
                        </div>
                      )}

                      {f.recommendation && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 1rem', borderRadius: 8, color: 'var(--color-text)', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '0.1rem' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.78rem', marginBottom: '0.15rem' }}>
                              Recommended Mitigation / Fix:
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.5, fontSize: '0.8rem' }}>
                              {f.recommendation}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
