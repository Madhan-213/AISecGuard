/**
 * AISecGuard — Admin Scan Configuration Page
 * Configuration of Model Scanner, Dataset Scanner, Dependency Scanner, and Signing Keyring.
 */

import {
  Cpu,
  Database,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Terminal,
  Layers,
} from 'lucide-react';

export default function AdminScanConfigPage() {
  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)' }}>
          <Cpu size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
            Scanner Engine Configuration
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0.15rem 0 0' }}>
            Heuristic rules, opcode inspection depth, and cryptographic verification parameters.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Model Scanner */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Cpu size={20} className="text-purple-400" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                Model Scanner
              </h2>
            </div>
            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>OPERATIONAL</span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Static AST opcode parser for PyTorch, Pickle, ONNX, and SafeTensors. Never deserializes weights in Python runtime.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.75rem', background: 'var(--color-table-header-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Engine Version:</span>
              <strong style={{ color: 'var(--color-text)' }}>v2.4.0 (Static AST)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Max File Size:</span>
              <strong style={{ color: 'var(--color-text)' }}>100 MB</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Dangerous Opcodes:</span>
              <strong style={{ color: '#ef4444' }}>GLOBAL, REDUCE, BUILD</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Formats Supported:</span>
              <strong style={{ color: 'var(--color-text)' }}>.pt, .pth, .pkl, .bin, .onnx</strong>
            </div>
          </div>
        </div>

        {/* Dataset Scanner */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Database size={20} className="text-pink-400" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                Dataset Scanner
              </h2>
            </div>
            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>OPERATIONAL</span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Training data integrity analyzer. Identifies label skewing, poisoned rows, and script injection payloads.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.75rem', background: 'var(--color-table-header-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Heuristics Active:</span>
              <strong style={{ color: 'var(--color-text)' }}>Poisoning, Leakage, Duplicates</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Payload Detection:</span>
              <strong style={{ color: 'var(--color-text)' }}>XSS, Base64, SQLi, Prompt Inj</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Formats Supported:</span>
              <strong style={{ color: 'var(--color-text)' }}>.csv, .json, .tsv, .parquet</strong>
            </div>
          </div>
        </div>

        {/* Dependency Scanner */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <FileCode size={20} className="text-amber-400" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                Dependency Scanner
              </h2>
            </div>
            <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>OPERATIONAL</span>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Parses requirements.txt, pyproject.toml, and Pipfile. Correlates packages against CVE vulnerability databases.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.75rem', background: 'var(--color-table-header-bg)', padding: '0.85rem', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>CVE Database:</span>
              <strong style={{ color: 'var(--color-text)' }}>Local & OSV Advisory Feed</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Unpinned Warning:</span>
              <strong style={{ color: '#f59e0b' }}>Enforced (&gt;=, *)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Typosquatting Check:</span>
              <strong style={{ color: 'var(--color-text)' }}>Levenshtein Distance Heuristic</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
