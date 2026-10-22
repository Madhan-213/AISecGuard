/**
 * AISecGuard — Professional Security Network Visualization
 * Redesigned for responsiveness and enterprise aesthetic.
 */

import { useState } from 'react';
import {
  Database,
  Cpu,
  Package,
  ShieldCheck,
  Activity,
  Lock
} from 'lucide-react';

export default function HeroNetworkVisual() {
  const [activeNode, setActiveNode] = useState('engine');

  const nodeDetails = {
    dataset: {
      title: 'Dataset Ingestion Audit',
      type: 'Input Artifact',
      desc: 'Statistical entropy, duplicate anomaly checks, and data poisoning heuristic indicators.',
      metrics: '42,500 rows verified',
      status: 'Clean Baseline',
      color: '#06B6D4',
    },
    model: {
      title: 'AI Model Weights Inspection',
      type: 'Binary Artifact',
      desc: 'Static opcode disassembly for pickle exploits, unsafe reduce calls, and weight tampering.',
      metrics: 'PyTorch .pt weights',
      status: 'Verified Safe',
      color: '#3B82F6',
    },
    dependencies: {
      title: 'Dependency Manifest Audit',
      type: 'Supply Chain Spec',
      desc: 'Pinning enforcement, malicious package hash verification, and known CVE correlation.',
      metrics: '34 packages audited',
      status: 'Pinned & Audited',
      color: '#8B5CF6',
    },
    engine: {
      title: 'AISecGuard Static Core',
      type: 'Unified Analyzer',
      desc: 'Coordinates multi-artifact static inspection, SHA-256 provenance baselining, and zero-execution sandboxing.',
      metrics: 'Heuristic engine',
      status: 'Engine Online',
      color: '#10B981',
    },
    risk: {
      title: 'MITRE ATLAS Risk Matrix',
      type: 'Classification',
      desc: 'Translates raw findings into normalized 0–100 threat scores with explainable evidence trails.',
      metrics: 'Risk Score: 12 / 100',
      status: 'Low Risk Tier',
      color: '#34D399',
    },
    deployment: {
      title: 'Secure Deployment Gate',
      type: 'Policy Enforcer',
      desc: 'Generates cryptographic provenance attestation and unblocks production CI/CD pipelines.',
      metrics: 'Artifact signed',
      status: 'Gate Passed',
      color: '#10B981',
    },
  };

  const selected = nodeDetails[activeNode] || nodeDetails.engine;

  return (
    <div className="relative w-full rounded-2xl border border-slate-700 bg-slate-900/50 backdrop-blur-xl p-6 shadow-2xl transition-all duration-300">

      {/* HUD Header Bar */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
            System Analysis Pipeline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            SHA-256 ACTIVE
          </span>
        </div>
      </div>

      {/* Responsive Network Architecture */}
      <div className="relative py-4">
        {/* SVG Interconnecting Flow (Hidden on mobile for better layout) */}
        <svg
          className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 500 240"
          fill="none"
        >
          <defs>
            <linearGradient id="flowBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Dynamic paths from inputs to hub */}
          <path d="M 130 45 C 190 45, 190 120, 250 120" stroke="url(#flowBlue)" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 130 120 C 190 120, 190 120, 250 120" stroke="url(#flowBlue)" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 130 195 C 190 195, 190 120, 250 120" stroke="url(#flowBlue)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Dynamic paths from hub to outputs */}
          <path d="M 250 120 C 310 120, 310 70, 370 70" stroke="url(#flowBlue)" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 250 120 C 310 120, 310 170, 370 170" stroke="url(#flowBlue)" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        {/* Node Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">

          {/* Column 1: Ingestion */}
          <div className="flex flex-col gap-3">
            {[
              { id: 'dataset', icon: Database, label: 'Dataset', sub: 'corpus.parquet' },
              { id: 'model', icon: Cpu, label: 'AI Model', sub: 'resnet.pt' },
              { id: 'dependencies', icon: Package, label: 'Deps', sub: 'requirements.txt' },
            ].map(node => (
              <button
                key={node.id}
                type="button"
                onClick={() => setActiveNode(node.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                  activeNode === node.id
                    ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeNode === node.id ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                    <node.icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-200 truncate">{node.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{node.sub}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Column 2: Hub */}
          <div className="flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setActiveNode('engine')}
              className={`relative p-5 rounded-2xl border transition-all duration-300 w-full max-w-[160px] ${
                activeNode === 'engine'
                  ? 'bg-slate-800 border-blue-500 shadow-xl shadow-blue-500/20 scale-105'
                  : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                <ShieldCheck size={24} />
              </div>
              <div className="text-xs font-bold text-white text-center">AISecGuard Core</div>
              <div className="text-[10px] font-mono text-blue-400 text-center mt-1">Static Engine</div>
            </button>
          </div>

          {/* Column 3: Output */}
          <div className="flex flex-col gap-3">
            {[
              { id: 'risk', icon: Activity, label: 'Risk Assessment', sub: 'Score: 12 (Low)' },
              { id: 'deployment', icon: Lock, label: 'Deployment Gate', sub: 'Gate Approved' },
            ].map(node => (
              <button
                key={node.id}
                type="button"
                onClick={() => setActiveNode(node.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                  activeNode === node.id
                    ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeNode === node.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    <node.icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-200 truncate">{node.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{node.sub}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inspector Panel */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
            style={{ background: selected.color, boxShadow: `0 0 8px ${selected.color}` }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100">{selected.title}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {selected.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {selected.desc}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[10px] font-mono text-blue-300 bg-blue-950/40 px-2 py-1 rounded border border-blue-800/40">
            {selected.metrics}
          </span>
        </div>
      </div>
    </div>
  );
}
