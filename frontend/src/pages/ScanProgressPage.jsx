/**
 * AISecGuard — Real-Time Scan Progress Monitor
 *
 * Connects to the SSE endpoint GET /api/v1/scans/{scanId}/status
 * and shows live scan phases: QUEUED → PROVENANCE_CHECK → SCANNER_RUNNING → RISK_CALC → COMPLETED
 * Auto-redirects to the scan detail page on completion.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, Circle, Loader2,
  Fingerprint, Search, BarChart3, Zap, ShieldCheck, ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { API_ORIGIN } from '../api/client';

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
  const [currentPhase, setCurrentPhase] = useState('QUEUED');
  const [progress, setProgress] = useState(10);
  const [message, setMessage] = useState('Connecting to scan engine…');
  const [riskLevel, setRiskLevel] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [log, setLog] = useState([]);
  const esRef = useRef(null);

  const addLog = (msg) =>
    setLog((prev) => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), msg }]);

  useEffect(() => {
    if (!scanId) return;

    const url = `${API_ORIGIN}/api/v1/scans/${scanId}/status`;
    addLog(`Connecting to scan engine for ${scanId.slice(0, 8)}…`);

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      addLog('SSE connection established');
    };

    es.onmessage = (event) => {
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
          addLog('Scan complete — redirecting to report…');
          setTimeout(() => navigate(`/scans/${scanId}`), 2000);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      addLog('Connection interrupted — checking scan status…');
      setError('Stream ended. Navigating to scan report…');
      setTimeout(() => navigate(`/scans/${scanId}`), 2500);
    };

    return () => { es.close(); };
  }, [scanId, navigate]);

  const currentIdx = PHASE_INDEX[currentPhase] ?? 0;
  const riskColor = RISK_COLORS[riskLevel] || '#64748b';

  return (
    <div className="fade-in" style={{ padding: '2.5rem', maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: done ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)',
          border: `2px solid ${done ? '#10b981' : '#3b82f6'}`,
          boxShadow: `0 0 32px ${done ? '#10b98135' : '#3b82f635'}`,
          marginBottom: '1rem',
          transition: 'all 0.4s ease',
        }}>
          {done
            ? <ShieldCheck size={34} style={{ color: '#10b981' }} />
            : <Loader2 size={34} style={{ color: '#60a5fa' }} className="spin" />
          }
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.3rem' }}>
          {done ? 'Scan Complete' : 'Security Scan Running'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
          Scan&nbsp;
          <span className="font-mono" style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
            {scanId?.slice(0, 8)}…
          </span>
          &nbsp;· Static analysis only — no code executed
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        background: '#1e293b', borderRadius: 8, height: 8,
        marginBottom: '2rem', overflow: 'hidden', border: '1px solid #334155',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: done
            ? 'linear-gradient(90deg, #10b981, #34d399)'
            : 'linear-gradient(90deg, #2563eb, #60a5fa)',
          borderRadius: 8,
          transition: 'width 0.7s ease',
          boxShadow: `0 0 12px ${done ? '#10b98155' : '#3b82f655'}`,
        }} />
      </div>

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
              borderBottom: idx < PHASES.length - 1 ? '1px solid rgba(51,65,85,0.5)' : 'none',
              opacity: isPending ? 0.35 : 1,
              transition: 'opacity 0.3s',
            }}>
              {/* Phase icon */}
              <div style={{
                width: 38, height: 38, flexShrink: 0,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted ? 'rgba(16,185,129,0.12)' : isCurrent ? 'rgba(59,130,246,0.12)' : 'rgba(51,65,85,0.3)',
                border: `1.5px solid ${isCompleted ? '#10b981' : isCurrent ? '#3b82f6' : '#334155'}`,
              }}>
                {isCompleted
                  ? <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                  : isCurrent
                    ? <Loader2 size={18} style={{ color: '#60a5fa' }} className="spin" />
                    : <Icon size={18} style={{ color: '#475569' }} />
                }
              </div>

              {/* Phase text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600, fontSize: '0.9rem',
                  color: isCompleted ? '#34d399' : isCurrent ? '#93c5fd' : '#475569',
                  marginBottom: '0.2rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {phase.label}
                  {isCurrent && !done && (
                    <span style={{ fontSize: '0.7rem', color: '#60a5fa80', fontWeight: 400 }}>
                      — running
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  {isCurrent ? (message || phase.desc) : phase.desc}
                </div>
              </div>

              {/* Status pill */}
              {isCompleted && (
                <span style={{
                  alignSelf: 'center', flexShrink: 0,
                  fontSize: '0.68rem', padding: '0.2rem 0.6rem',
                  background: 'rgba(16,185,129,0.1)', color: '#34d399',
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
      {done && riskLevel && (
        <div className="card" style={{
          marginBottom: '1.25rem',
          border: `1px solid ${riskColor}35`,
          background: RISK_BG[riskLevel] || 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.4rem' }}>
              Aggregate Risk Assessment
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: riskColor }}>
                {riskLevel}
              </span>
              {riskScore !== null && (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  Score&nbsp;<strong style={{ color: '#f1f5f9', fontSize: '1.1rem' }}>{riskScore}</strong>
                  <span style={{ color: '#475569' }}> / 50</span>
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
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.6rem', letterSpacing: '0.07em' }}>
          Scan Activity Log
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: '0.75rem',
          background: 'rgba(8,12,22,0.95)', borderRadius: 8,
          border: '1px solid #1e293b',
          padding: '0.75rem 1rem',
          maxHeight: 180, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '0.2rem',
        }}>
          {log.length === 0 ? (
            <span style={{ color: '#475569' }}>Waiting for events…</span>
          ) : (
            log.map((entry, i) => (
              <div key={i} style={{ color: '#93c5fd' }}>
                <span style={{ color: '#475569' }}>{entry.time}</span>
                {'  '}
                {entry.msg}
              </div>
            ))
          )}
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ marginTop: '1rem' }}>{error}</div>
      )}
    </div>
  );
}

