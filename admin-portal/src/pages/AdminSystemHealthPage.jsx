/**
 * AISecGuard — Admin System Health & Diagnostic Telemetry Page
 * Real-time monitoring of API uptime, database latency, scanner engines, storage, and host resources.
 */

import { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Server,
  Database,
  Cpu,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Terminal,
} from 'lucide-react';
import { adminHealthApi, adminErrorMessage } from '../api/adminClient';
import { useToast } from '../context/ToastContext';

export default function AdminSystemHealthPage() {
  const toast = useToast();

  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchHealth = async (showToast = false) => {
    try {
      if (!health) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const res = await adminHealthApi.get();
      setHealth(res.data);
      if (showToast) {
        toast.success('System telemetry refreshed successfully.');
      }
    } catch (err) {
      const msg = adminErrorMessage(err, 'Failed to fetch system diagnostics.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-poll health every 30 seconds
    const interval = setInterval(() => fetchHealth(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'HEALTHY';
  const diskTotal = health?.storage?.disk_total_gb || 0;
  const diskFree = health?.storage?.disk_free_gb || 0;
  const diskUsed = diskTotal > 0 ? (diskTotal - diskFree).toFixed(2) : 0;
  const diskPercent = diskTotal > 0 ? Math.round(((diskTotal - diskFree) / diskTotal) * 100) : 0;

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
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
                System Health & Telemetry
              </h1>
              {health && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: 999,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    background: isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isHealthy ? '#10b981' : '#ef4444',
                    border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isHealthy ? '#10b981' : '#ef4444',
                      boxShadow: isHealthy ? '0 0 6px #10b981' : '0 0 6px #ef4444',
                    }}
                  />
                  {health.status}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
              Live server diagnostics, database connection latency, scanner availability, and hardware utilization.
            </p>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          onClick={() => fetchHealth(true)}
          disabled={loading || refreshing}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Probing...' : 'Refresh Telemetry'}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <span className="spinner" style={{ width: 32, height: 32, margin: '0 auto 0.75rem' }} />
          <div>Probing system infrastructure and services…</div>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <AlertTriangle size={30} style={{ margin: '0 auto 0.5rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Telemetry Service Offline</h3>
          <p style={{ fontSize: '0.82rem', margin: '0 0 1rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchHealth(true)} style={{ fontSize: '0.8rem' }}>
            Retry Connection
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top 4 KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Uptime */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Platform Uptime
                </span>
                <Clock size={16} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                {health?.uptime_human || '0h 0m'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Elapsed: {health?.uptime_seconds?.toLocaleString() || 0} seconds
              </div>
            </div>

            {/* Database Latency */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Database Engine
                </span>
                <Database size={16} color="#10b981" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                  {health?.database?.latency_ms ?? 0}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ms latency</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: health?.database?.connected ? '#10b981' : '#ef4444', marginTop: '0.35rem', fontWeight: 600 }}>
                ● {health?.database?.connected ? `Connected (${health?.database?.engine})` : 'Disconnected'}
              </div>
            </div>

            {/* Process Memory */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Process Memory
                </span>
                <Cpu size={16} color="#8b5cf6" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                  {health?.environment?.process_memory_mb || 0}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MB RSS</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Host: {health?.environment?.os || 'Unknown OS'}
              </div>
            </div>

            {/* Artifacts Storage */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Storage Used
                </span>
                <HardDrive size={16} color="#f59e0b" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                  {health?.storage?.used_mb || 0}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MB uploads</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                Free Disk: {diskFree} GB of {diskTotal} GB
              </div>
            </div>
          </div>

          {/* Scanners & Detection Engines Grid */}
          <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={18} color="#10b981" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Security Analysis & Verification Engines
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {Object.entries(health?.scanners || {}).map(([key, value]) => {
                const label = key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div
                    key={key}
                    style={{
                      padding: '1rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <CheckCircle2 size={16} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                        {value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Storage & Filesystem Health */}
          <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <HardDrive size={18} color="#f59e0b" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Disk Capacity & Storage Allocation
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                  <span>Host Disk Usage ({diskPercent}%)</span>
                  <span>{diskUsed} GB / {diskTotal} GB</span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${diskPercent}%`,
                      height: '100%',
                      background: diskPercent > 85 ? '#ef4444' : diskPercent > 70 ? '#f59e0b' : '#3b82f6',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Target Upload Directory</div>
                  <code style={{ fontSize: '0.78rem', color: 'var(--color-text)', wordBreak: 'break-all' }}>
                    {health?.storage?.upload_dir || 'N/A'}
                  </code>
                </div>
                <div style={{ padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Artifact Filesystem Load</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {health?.storage?.used_mb || 0} MB active payload files
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Environment & Runtime Specs */}
          <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Terminal size={18} color="#6366f1" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Runtime Environment & Build Metadata
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>FastAPI Engine Version</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                  v{health?.api_version || '1.0.0'}
                </div>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Python Runtime</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                  {health?.environment?.python_version || 'N/A'}
                </div>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Operating System</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)', marginTop: '0.2rem' }}>
                  {health?.environment?.os || 'N/A'}
                </div>
              </div>

              <div style={{ padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Telemetry Timestamp</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
