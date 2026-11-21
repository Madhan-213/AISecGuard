/**
 * AISecGuard — Admin Security Events Page
 * Real-time security incident monitoring: failed login spikes, critical findings, and unauthorized access attempts.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  RefreshCw,
  Plus,
  X,
  Clock,
  Shield,
} from 'lucide-react';
import { adminSecurityApi, adminErrorMessage } from '../api/adminClient';
import { useToast } from '../context/ToastContext';

export default function AdminSecurityEventsPage() {
  const toast = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Report event modal
  const [reportModal, setReportModal] = useState(false);
  const [newType, setNewType] = useState('UNAUTHORIZED_ACCESS');
  const [newSeverity, setNewSeverity] = useState('WARNING');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminSecurityApi.events({ limit: 100 });
      setEvents(res.data?.items || []);
    } catch (err) {
      setError(adminErrorMessage(err, 'Failed loading security incidents.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleReportEvent = async (e) => {
    e.preventDefault();
    if (!newDesc.trim()) return;
    try {
      setSubmitting(true);
      await adminSecurityApi.reportEvent({
        event_type: newType,
        severity: newSeverity,
        description: newDesc,
      });
      toast.success('Security incident registered successfully.');
      setReportModal(false);
      setNewDesc('');
      await fetchEvents();
    } catch (err) {
      toast.error(adminErrorMessage(err, 'Failed registering security incident.'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const sevMatch = severityFilter === 'ALL' || ev.severity === severityFilter;
      const q = searchQuery.trim().toLowerCase();
      const searchMatch =
        !q ||
        ev.description?.toLowerCase().includes(q) ||
        ev.event_type?.toLowerCase().includes(q) ||
        ev.actor_email?.toLowerCase().includes(q);
      return sevMatch && searchMatch;
    });
  }, [events, severityFilter, searchQuery]);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #ef4444, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              Security Events & Telemetry
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Live intrusion signals, authorization failures, and scanner threat alerts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className="btn btn-ghost"
            onClick={fetchEvents}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setReportModal(true)}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'none', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={14} />
            <span>Log Security Event</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'WARNING', 'INFO'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              style={{
                fontSize: '0.75rem',
                fontWeight: severityFilter === s ? 700 : 500,
                padding: '0.35rem 0.75rem',
                borderRadius: 8,
                border: '1px solid',
                borderColor: severityFilter === s ? '#dc2626' : 'var(--color-border)',
                background: severityFilter === s ? 'rgba(220, 38, 38, 0.12)' : 'transparent',
                color: severityFilter === s ? '#dc2626' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {s === 'ALL' ? 'All Severities' : s}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search event type or description..."
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

      {/* Events Table */}
      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem' }} />
            <div>Streaming security events…</div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem' }} />
            <div>{error}</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <ShieldAlert size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>No security events matching filter.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'background-color 0.15s ease',
                }}
                className="table-row-hover"
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ marginTop: '0.15rem' }}>
                    <ShieldAlert size={18} style={{ color: ev.severity === 'CRITICAL' ? '#ef4444' : ev.severity === 'HIGH' ? '#f97316' : '#eab308' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)' }}>
                        {ev.description}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      <code style={{ color: 'var(--color-primary)' }}>{ev.event_type}</code>
                      <span>Actor: {ev.actor_email || 'External / System'}</span>
                      {ev.source_ip && <span>IP: {ev.source_ip}</span>}
                      <span>{new Date(ev.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <span className={`badge badge-${(ev.severity || 'info').toLowerCase()}`} style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                  {ev.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Report Event Modal */}
      {reportModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, border: '1px solid var(--color-border)', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--color-text)' }}>
              Log Security Incident
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Create an administrative incident record in the centralized security log.
            </p>

            <form onSubmit={handleReportEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                  Incident Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="UNAUTHORIZED_ACCESS">UNAUTHORIZED_ACCESS</option>
                  <option value="SUSPICIOUS_TOKEN">SUSPICIOUS_TOKEN</option>
                  <option value="CRITICAL_SCAN_FINDING">CRITICAL_SCAN_FINDING</option>
                  <option value="FAILED_LOGIN_SPIKE">FAILED_LOGIN_SPIKE</option>
                  <option value="MALICIOUS_MODEL_INSPECTION">MALICIOUS_MODEL_INSPECTION</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                  Severity Level
                </label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.8rem', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="WARNING">WARNING</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                  Description / Incident Details
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                  placeholder="Detail the detected anomaly or security event..."
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setReportModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'none', color: '#fff', fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                >
                  {submitting ? 'Logging…' : 'Register Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
