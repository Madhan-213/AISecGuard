/**
 * AISecGuard — Help & About Page
 * Architecture overview, AST scanning methodology, threat matrix mapping, and MCA Project details.
 */

import {
  Shield,
  Layers,
  Cpu,
  Database,
  GitBranch,
  Lock,
  Terminal,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Award,
  Sparkles,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero Section */}
      <div className="card" style={{ padding: '2rem', border: '1px solid var(--color-border)', borderRadius: 16, marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(37, 99, 235, 0.06) 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 18px rgba(124, 58, 237, 0.4)' }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: 0 }}>
              AISecGuard
            </h1>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 850, margin: '0.5rem 0 1rem' }}>
          AISecGuard is a production-grade AI supply chain security platform designed to protect machine learning pipelines from poisoned weights, serialized code execution payloads, dataset poisoning, model substitution attacks, and untrusted dependency vulnerabilities.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span className="badge badge-low">MCA Final Year Project</span>
          <span className="badge badge-info">FastAPI & Python 3.12</span>
          <span className="badge badge-medium">React + Tailwind CSS</span>
          <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a855f7' }}>Ed25519 Signing</span>
        </div>
      </div>

      {/* Multi-Stage Pipeline Architecture */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Layers size={18} className="text-purple-400" />
        <span>Four-Stage Inspection Architecture</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Phase 1
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.45rem' }}>
            Ingestion & Provenance Baseline
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Computes streaming cryptographic SHA-256 hashes immediately upon upload, checks expected publishers, and flags substitution anomalies.
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Phase 2
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.45rem' }}>
            Zero-Execution AST Scanners
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Model, Dataset, and Dependency scanners parse raw opcode streams and syntactic trees without ever deserializing or executing untrusted code.
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Phase 3
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.45rem' }}>
            Lineage & Upstream Propagation
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Traces parent-child relationships across base models, fine-tuned checkpoints, and datasets to prevent silent risk inheritance.
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 12 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Phase 4
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.45rem' }}>
            Risk Engine & Mitigation Actions
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Synthesizes numeric threat score (0-100), executes auto-quarantine rules, produces exportable PDF audit reports, and signs approved artifacts.
          </p>
        </div>
      </div>

      {/* Threat Matrix Coverage */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Terminal size={18} className="text-pink-400" />
        <span>MITRE ATLAS & OWASP AI Top 10 Threat Coverage</span>
      </h2>

      <div className="card" style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden', marginBottom: '1.75rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-table-header-bg)', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Threat Category</th>
              <th style={{ padding: '0.75rem 1rem' }}>Framework Mapping</th>
              <th style={{ padding: '0.75rem 1rem' }}>Attack Vector Description</th>
              <th style={{ padding: '0.75rem 1rem' }}>AISecGuard Mitigation Heuristic</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#ef4444' }}>Pickle AST Code Execution</td>
              <td style={{ padding: '0.75rem 1rem' }}><code>AML.T0010 / ML01:2025</code></td>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>Arbitrary shell commands embedded via <code style={{ color: '#ef4444' }}>__reduce__</code> in PyTorch .pt/.pkl files.</td>
              <td style={{ padding: '0.75rem 1rem', color: '#10b981' }}>Static opcode parsing disallows dangerous GLOBAL calls without loading bytecode.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f97316' }}>Training Data Poisoning</td>
              <td style={{ padding: '0.75rem 1rem' }}><code>AML.T0018 / ML03:2025</code></td>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>Injected corrupt labels or duplicate rows to reduce classifier precision or backdoor models.</td>
              <td style={{ padding: '0.75rem 1rem', color: '#10b981' }}>Label skew detection, row duplication heuristics, and statistical divergence tracking.</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#eab308' }}>Supply Chain Substitution</td>
              <td style={{ padding: '0.75rem 1rem' }}><code>AML.T0012 / ML06:2025</code></td>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>Silently replacing a vetted model artifact with a trojaned duplicate of the same filename.</td>
              <td style={{ padding: '0.75rem 1rem', color: '#10b981' }}>Cryptographic SHA-256 baseline comparison and Ed25519 digital signature verification.</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#3b82f6' }}>Vulnerable Dependencies</td>
              <td style={{ padding: '0.75rem 1rem' }}><code>CWE-1395 / ML08:2025</code></td>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)' }}>Outdated machine learning frameworks (e.g. vulnerable transformers, torch, numpy).</td>
              <td style={{ padding: '0.75rem 1rem', color: '#10b981' }}>Automated packaging SBOM parsing and CVE vulnerability database correlation.</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Project & Authorship Footer */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-table-header-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
            AISecGuard Platform v0.6.0
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Department of Computer Applications • MCA Final Year Project
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Developed with <span style={{ color: '#ec4899' }}>♥</span> for Secure AI Engineering
        </div>
      </div>
    </div>
  );
}
