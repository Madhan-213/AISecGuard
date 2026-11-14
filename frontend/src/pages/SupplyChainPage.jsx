/**
 * AISecGuard — Supply Chain Page
 * Placeholder for the AI Supply Chain dependency visualization.
 */

import { GitBranch, Shield, AlertTriangle, Package, ExternalLink } from 'lucide-react';

const CHAIN_NODES = [
  { label: 'Training Data Sources', status: 'verified', risk: 'LOW',    icon: Shield,       desc: 'Data provenance verified via cryptographic hash chains' },
  { label: 'Base Model Registry',   status: 'scanning', risk: 'MEDIUM', icon: Package,      desc: 'Hugging Face checkpoint — MLSBOM in progress' },
  { label: 'ML Framework Layer',    status: 'flagged',  risk: 'HIGH',   icon: AlertTriangle, desc: 'PyTorch 2.1.0 — CVE-2024-5480 unpatched' },
  { label: 'Model Serving Runtime', status: 'verified', risk: 'LOW',    icon: Shield,       desc: 'Triton Inference Server 2.42 — clean' },
];

const statusColors = {
  verified: '#10b981',
  scanning: '#f59e0b',
  flagged:  '#ef4444',
};

export default function SupplyChainPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GitBranch size={18} style={{ color: '#f59e0b' }} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
            AI Supply Chain
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: 520 }}>
          End-to-end visibility across your AI artifact supply chain — data, models, frameworks, and deployment targets.
        </p>
      </div>

      {/* Chain nodes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {CHAIN_NODES.map((node, i) => {
          const Icon = node.icon;
          const color = statusColors[node.status];
          return (
            <div key={i} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                {/* Chain connector */}
                {i > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: '2.25rem',
                    top: '-1.5rem',
                    width: 2,
                    height: '1.5rem',
                    background: 'var(--color-border)',
                  }} />
                )}

                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${color}18`,
                  border: `1px solid ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} style={{ color }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9' }}>{node.label}</span>
                    <span className={`badge badge-${node.risk === 'LOW' ? 'success' : node.risk === 'MEDIUM' ? 'warning' : 'danger'}`}>
                      {node.risk}
                    </span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.72rem', color, fontWeight: 600,
                      textTransform: 'capitalize',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                      {node.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748b' }}>{node.desc}</p>
                </div>

                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', flexShrink: 0 }}
                >
                  <ExternalLink size={12} />
                  Detail
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: '2rem', fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>
        Full MLSBOM generation, Sigstore signing, and dependency graph visualization coming in v1.0.
      </p>
    </div>
  );
}

