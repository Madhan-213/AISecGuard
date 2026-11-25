/**
 * AISecGuard — Real-Time Scan Progress Monitor
 *
 * Connects to the SSE endpoint GET /api/v1/scans/{scanId}/status
 * and shows live scan phases: QUEUED → PROVENANCE_CHECK → SCANNER_RUNNING → RISK_CALC → COMPLETED
 * Supports live scan cancellation / abort and theme-aware styling.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, Loader2,
  Fingerprint, Search, BarChart3, Zap, ShieldCheck, ShieldAlert,
  ArrowRight, XCircle,
} from 'lucide-react';
import { API_ORIGIN } from '../api/client';
import { useToast } from '../context/ToastContext';

const PHASES = [
  {
    key: 'QUEUED',
    label: 'Queued',
    icon: Zap,
    desc: 'Scan job accepted and queued for processing',
  },
  {
    key: 'PROVENANCE_CHECK',
    label: 'Provenance & Integrity',
    icon: Fingerprint,
    desc: 'Verifying SHA-256 integrity and provenance baseline against upload record',
  },
  {
    key: 'SCANNER_RUNNING',
    label: 'Static Security Scanner',
    icon: Search,
    desc: 'Executing format-specific static analysis — no code is loaded or executed',
  },
  {
    key: 'RISK_CALC',
    label: 'Risk Assessment',
    icon: BarChart3,
    desc: 'Calculating aggregate risk score from all findings using severity weighting',
  },
  {
    key: 'COMPLETED',
    label: 'Scan Complete',
    icon: CheckCircle2,
    desc: 'Full report ready — redirecting to detailed findings view',
  },
];

const PHASE_INDEX = Object.fromEntries(PHASES.map((p, i) => [p.key, i]));

const RISK_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  UNKNOWN: '#64748b',
};

const RISK_BG = {
  CRITICAL: 'rgba(239,68,68,0.1)',
  HIGH: 'rgba(249,115,22,0.1)',
  MEDIUM: 'rgba(245,158,11,0.1)',
  LOW: 'rgba(16,185,129,0.1)',
  UNKNOWN: 'rgba(100,116,139,0.1)',
};

export default function ScanProgressPage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [currentPhase, setCurrentPhase] = useState('QUEUED');
  const [progress, setProgress] = useState(10);
  const [message, setMessage] = useState('Connecting to scan engine…');
  const [riskLevel, setRiskLevel] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [done, setDone] = useState(false);
  const [aborted, setAborted] = useState(false);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const esRef = useRef(null);
  const abortedRef = useRef(false);

  const addLog = (msg) =>
    setLog((prev) => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), msg }]);

  const handleAbortScan = () => {
    abortedRef.current = true;
    if (esRef.current) {
      esRef.current.close();
    }
    setAborted(true);
    addLog('[ABORTED] Security scan cancelled by analyst.');
    toast.info('Security scan cancelled by analyst.');
  };

  useEffect(() => {
    if (done || aborted) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(timer);
  }, [done, aborted]);

  useEffect(() => {
    if (!scanId || abortedRef.current) return;

    const url = `${API_ORIGIN}/api/v1/scans/${scanId}/status`;
    addLog(`Connecting to scan engine for ${scanId.slice(0, 8)}…`);

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      addLog('SSE connection established — zero-execution analyzer active');
    };

    es.onmessage = (event) => {
      if (abortedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const phase = data.phase || 'QUEUED';
        setCurrentPhase(phase);
        setProgress(data.progress || 0);
        setMessage(data.message || '');
        addLog(`[${phase}] ${data.message || phase}`);

        if (data.risk_level) setRiskLevel(data.risk_level);
        if (data.risk_score !== undefined) setRiskScore(data.risk_score);

        if (phase === 'COMPLETED') {
          setDone(true);
          es.close();
          addLog('Scan complete — redirecting to detailed findings report…');
          toast.success('Security scan completed successfully!');
          setTimeout(() => navigate(`/scans/${scanId}`), 850);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      if (abortedRef.current) return;
      es.close();
      addLog('Connection interrupted — checking scan status…');
      setError('Stream ended. Navigating to scan report…');
      setTimeout(() => navigate(`/scans/${scanId}`), 1500);
    };

    return () => { es.close(); };
  }, [scanId, navigate, toast]);

  const currentIdx = PHASE_INDEX[currentPhase] ?? 0;
  const riskColor = RISK_COLORS[riskLevel] || '#64748b';

  return (
    <div className="fade-in" style={{ padding: '2.5rem', maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: aborted
            ? 'rgba(239,68,68,0.12)'
            : done
              ? 'rgba(16,185,129,0.15)'
              : 'rgba(59,130,246,0.12)',
          border: `2px solid ${aborted ? '#ef4444' : done ? '#10b981' : '#3b82f6'}`,
          boxShadow: `0 0 32px ${aborted ? '#ef444435' : done ? '#10b98135' : '#3b82f635'}`,
          marginBottom: '1rem',
          transition: 'all 0.4s ease',
        }}>
          {aborted ? (
            <ShieldAlert size={34} style={{ color: '#ef4444' }} />
          ) : done ? (
            <ShieldCheck size={34} style={{ color: '#10b981' }} />
          ) : (
            <Loader2 size={34} style={{ color: 'var(--color-primary)' }} className="spin" />
          )}
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.3rem' }}>
          {aborted ? 'Scan Cancelled' : done ? 'Scan Complete' : 'Security Scan Running'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          Scan&nbsp;
          <span className="font-mono" style={{ color: 'var(--color-primary)', background: 'rgba(59,130,246,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
            {scanId?.slice(0, 8)}…
          </span>
          &nbsp;· Static analysis only — no code executed
        </p>
      </div>

      {/* Progress telemetry stats + bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
        <span>{done ? 'Analysis Complete' : aborted ? 'Scan Aborted' : (message || 'Executing security pipeline…')}</span>
        <span className="font-mono">
          {progress}% · {(elapsedMs / 1000).toFixed(1)}s
        </span>
      </div>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 8, height: 8,
        marginBottom: aborted ? '1.5rem' : '1.5rem', overflow: 'hidden', border: '1px solid var(--color-border)',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: aborted
            ? '#ef4444'
            : done
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : 'linear-gradient(90deg, #2563eb, #60a5fa)',
          borderRadius: 8,
          transition: 'width 0.7s ease',
          boxShadow: `0 0 12px ${aborted ? '#ef444455' : done ? '#10b98155' : '#3b82f655'}`,
        }} />
      </div>

      {/* Abort Button (shown while active) */}
      {!done && !aborted && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
          <button
            id="btn-abort-scan"
            type="button"
            className="btn btn-ghost"
            onClick={handleAbortScan}
            style={{
              color: 'var(--color-danger, #ef4444)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.08)',
              gap: '0.5rem',
              padding: '0.45rem 1.1rem',
              fontSize: '0.85rem',
            }}
          >
            <XCircle size={16} />
            <span>Cancel / Abort Scan</span>
          </button>
        </div>
      )}

      {/* Aborted Alert Card */}
      {aborted && (
        <div className="card" style={{
          marginBottom: '1.5rem',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          background: 'rgba(239, 68, 68, 0.08)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ color: 'var(--color-danger, #ef4444)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
              Scan Aborted by User
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', margin: 0 }}>
              Static analysis was cancelled before completion. No threat score was computed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/upload')}
            >
              <span>Upload New File</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Phase list */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.25rem 0' }}>
        {PHASES.map((phase, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;
          const Icon = phase.icon;

          return (
            <div key={phase.key} style={{
              display: 'flex', alignItems: 'flex-start', gap: '1rem',
              padding: '0.9rem 1.4rem',
              borderBottom: idx < PHASES.length - 1 ? '1px solid var(--color-border)' : 'none',
              opacity: isPending ? 0.35 : 1,
              transition: 'opacity 0.3s',
            }}>
              {/* Phase icon */}
              <div style={{
                width: 38, height: 38, flexShrink: 0,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted
                  ? 'rgba(16,185,129,0.12)'
                  : isCurrent
                    ? 'rgba(59,130,246,0.12)'
                    : 'var(--color-card-subtle-bg)',
                border: `1.5px solid ${isCompleted ? '#10b981' : isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}>
                {isCompleted ? (
                  <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                ) : isCurrent ? (
                  <Loader2 size={18} style={{ color: 'var(--color-primary)' }} className={aborted ? '' : 'spin'} />
                ) : (
                  <Icon size={18} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </div>

              {/* Phase text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600, fontSize: '0.9rem',
                  color: isCompleted ? '#10b981' : isCurrent ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  marginBottom: '0.2rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {phase.label}
                  {isCurrent && !done && !aborted && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', opacity: 0.75, fontWeight: 400 }}>
                      — running
                    </span>
                  )}
                  {isCurrent && aborted && (
                    <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 500 }}>
                      — cancelled
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {isCurrent ? (message || phase.desc) : phase.desc}
                </div>
              </div>

              {/* Status pill */}
              {isCompleted && (
                <span style={{
                  alignSelf: 'center', flexShrink: 0,
                  fontSize: '0.68rem', padding: '0.2rem 0.6rem',
                  background: 'rgba(16,185,129,0.1)', color: '#10b981',
                  borderRadius: 999, border: '1px solid rgba(16,185,129,0.25)',
                }}>
                  ✓ done
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk result card — appears on completion */}
      {done && !aborted && riskLevel && (
        <div className="card" style={{
          marginBottom: '1.25rem',
          border: `1px solid ${riskColor}35`,
          background: RISK_BG[riskLevel] || 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
              Aggregate Risk Assessment
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: riskColor }}>
                {riskLevel}
              </span>
              {riskScore !== null && (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  Score&nbsp;<strong style={{ color: 'var(--color-text)', fontSize: '1.1rem' }}>{riskScore}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}> / 50</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(`/scans/${scanId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>View Full Report</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Activity log */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.6rem', letterSpacing: '0.07em' }}>
          Scan Activity Log
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '0.75rem',
          background: 'var(--color-code-bg)', borderRadius: 8,
          border: '1px solid var(--color-border)',
          padding: '0.75rem 1rem',
          maxHeight: 180, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '0.2rem',
        }}>
          {log.length === 0 ? (
            <span style={{ color: 'var(--color-text-muted)' }}>Waiting for events…</span>
          ) : (
            log.map((entry, i) => (
              <div key={i} style={{ color: 'var(--color-text)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{entry.time}</span>
                {'  '}
                {entry.msg}
              </div>
            ))
          )}
        </div>
      </div>

      {error && !aborted && (
        <div className="alert-error" style={{ marginTop: '1rem' }}>{error}</div>
      )}
    </div>
  );
}
