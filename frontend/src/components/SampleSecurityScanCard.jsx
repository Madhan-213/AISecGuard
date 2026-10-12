/**
 * AISecGuard — Professional Telemetry Simulator
 * Refined for an enterprise dashboard aesthetic.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  FileText,
  AlertTriangle,
  AlertOctagon,
  X,
  ArrowRight,
  Fingerprint,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function SampleSecurityScanCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedArtifact, setSelectedArtifact] = useState('model');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);
  const [scanPhase, setScanPhase] = useState('Scan Completed');
  const [showModal, setShowModal] = useState(false);

  const handleStartScanning = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleTriggerSimulatedScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(15);
    setScanPhase('Ingesting SHA-256 fingerprint...');

    setTimeout(() => {
      setScanProgress(45);
      setScanPhase('Disassembling bytecode frames...');
    }, 600);

    setTimeout(() => {
      setScanProgress(75);
      setScanPhase('Cross-referencing MITRE ATLAS...');
    }, 1200);

    setTimeout(() => {
      setScanProgress(100);
      setScanPhase('Threat score calculated');
      setIsScanning(false);
    }, 1800);
  };

  const artifactScenarios = {
    model: {
      id: 'model',
      name: 'ResNet50_Classifier.pt',
      type: 'AI Model Weights',
      format: 'PyTorch / Pickle',
      size: '98.4 MB',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      score: 72,
      riskLevel: 'HIGH RISK',
      riskColor: 'text-orange-400',
      badgeColor: 'badge-high',
      findingsSummary: { high: 2, medium: 3, low: 1 },
      topThreat: {
        code: 'ATLAS-AML.T0018',
        name: 'Unsafe Deserialization Opcode',
        desc: 'Static opcode disassembler detected dangerous callable `posix.system` inside pickle frame.',
      },
      findingsList: [
        {
          id: 'MOD-001',
          severity: 'HIGH',
          badgeColor: 'badge-high',
          title: 'Unsafe Deserialization Opcode',
          ruleId: 'ATLAS-AML.T0018',
          type: 'Model Scanner',
          description: 'Detected `GLOBAL posix.system` opcode in pickle stream. Potential RCE.',
          recommendation: 'Enforce weights_only=True or migrate to Safetensors.',
        },
        {
          id: 'MOD-002',
          severity: 'HIGH',
          badgeColor: 'badge-high',
          title: 'Embedded Subprocess Vector',
          ruleId: 'CWE-502',
          type: 'Model Scanner',
          description: 'Subprocess module referenced in reduce stack.',
          recommendation: 'Strip executable payloads and re-export weights.',
        },
        {
          id: 'MOD-003',
          severity: 'MEDIUM',
          badgeColor: 'badge-medium',
          title: 'Unsigned Model Provenance',
          ruleId: 'PROV-SIG-001',
          type: 'Provenance Engine',
          description: 'No cryptographic HMAC or SLSA metadata found.',
          recommendation: 'Sign artifact with organization Cosign key.',
        },
      ],
    },
    dataset: {
      id: 'dataset',
      name: 'medical_imaging_train.csv',
      type: 'Training Dataset',
      format: 'CSV',
      size: '24.2 MB',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      score: 48,
      riskLevel: 'MEDIUM RISK',
      riskColor: 'text-amber-400',
      badgeColor: 'badge-medium',
      findingsSummary: { high: 1, medium: 2, low: 2 },
      topThreat: {
        code: 'ATLAS-AML.T0020',
        name: 'Anomalous Label Skew',
        desc: 'Statistical entropy audit detected 8.2x duplicate density in target class 4.',
      },
      findingsList: [
        {
          id: 'DAT-001',
          severity: 'HIGH',
          badgeColor: 'badge-high',
          title: 'Anomalous Label Skew',
          ruleId: 'ATLAS-AML.T0020',
          type: 'Dataset Scanner',
          description: 'Class 4 contains 8.2x duplicate concentration.',
          recommendation: 'Quarantine class 4 subset and audit ingestion pipeline.',
        },
        {
          id: 'DAT-002',
          severity: 'MEDIUM',
          badgeColor: 'badge-medium',
          title: 'Feature Dispersion Outlier',
          ruleId: 'STAT-VAR-003',
          type: 'Dataset Scanner',
          description: 'Feature column `patient_vital_07` exhibits extreme deviation.',
          recommendation: 'Apply normalized feature clipping.',
        },
      ],
    },
    dependency: {
      id: 'dependency',
      name: 'requirements.txt',
      type: 'Dependency Manifest',
      format: 'Pip Manifest',
      size: '2.8 KB',
      sha256: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      score: 65,
      riskLevel: 'HIGH RISK',
      riskColor: 'text-orange-400',
      badgeColor: 'badge-high',
      findingsSummary: { high: 2, medium: 2, low: 1 },
      topThreat: {
        code: 'DEP-PIN-004',
        name: 'Unpinned Critical ML Version',
        desc: '`torch>=2.0.0` declared with unpinned upper bound.',
      },
      findingsList: [
        {
          id: 'DEP-001',
          severity: 'HIGH',
          badgeColor: 'badge-high',
          title: 'Unpinned Critical Version',
          ruleId: 'DEP-PIN-004',
          type: 'Dependency Scanner',
          description: 'Package `torch` declared without exact hash pin.',
          recommendation: 'Pin exact version hash in production lockfile.',
        },
        {
          id: 'DEP-002',
          severity: 'HIGH',
          badgeColor: 'badge-high',
          title: 'Known Transitive CVE',
          ruleId: 'CVE-2024-37891',
          type: 'Dependency Scanner',
          description: 'Transitive dependency `urllib3<2.0.7` has unhandled leakage.',
          recommendation: 'Upgrade to urllib3>=2.2.2.',
        },
      ],
    },
  };

  const current = artifactScenarios[selectedArtifact] || artifactScenarios.model;

  return (
    <div className="relative">
      <div className="card p-6 md:p-8 relative overflow-hidden border-slate-700 shadow-2xl">
        <div className="scan-line" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Telemetry Preview</h3>
              <p className="text-xs text-slate-400">Interactive static analysis simulation</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(artifactScenarios).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedArtifact(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  selectedArtifact === key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {key === 'model' ? 'Model (.pt)' : key === 'dataset' ? 'Dataset (.csv)' : 'Manifest (.txt)'}
              </button>
            ))}
            <button
              type="button"
              onClick={handleTriggerSimulatedScan}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? 'Scanning...' : 'Re-Run'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              {scanPhase}
            </span>
            <span>{scanProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-stretch">

          <div className="lg:col-span-4 flex flex-col justify-between p-5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-3">Target Profile</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Filename:</span>
                <span className="font-mono text-white">{current.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Format:</span>
                <span className="font-mono text-slate-200">{current.format}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Size:</span>
                <span className="font-mono text-slate-200">{current.size}</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px]">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
                <Fingerprint size={12} />
                <span>SHA-256 Fingerprint</span>
              </div>
              <div className="text-slate-500 truncate">{current.sha256}</div>
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col items-center justify-center p-6 rounded-xl bg-slate-900/30 border border-slate-800 text-center relative">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Risk Score</div>
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full border-4 border-slate-800 border-t-blue-500 flex flex-col items-center justify-center shadow-inner">
                <div className="text-3xl font-black text-white">{current.score}</div>
                <div className="text-[10px] font-mono text-slate-500 uppercase">/ 100</div>
              </div>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${current.badgeColor}`}>
              <AlertTriangle size={13} />
              <span>{current.riskLevel}</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>Findings Summary</span>
                <span className="text-slate-300 font-mono">{current.findingsSummary.high + current.findingsSummary.medium + current.findingsSummary.low} Total</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                  <div className="text-base font-bold text-red-400">{current.findingsSummary.high}</div>
                  <div className="text-[9px] font-semibold uppercase text-red-300 font-mono">High</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                  <div className="text-base font-bold text-amber-400">{current.findingsSummary.medium}</div>
                  <div className="text-[9px] font-semibold uppercase text-amber-300 font-mono">Medium</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="text-base font-bold text-emerald-400">{current.findingsSummary.low}</div>
                  <div className="text-[9px] font-semibold uppercase text-emerald-300 font-mono">Low</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <AlertOctagon size={14} />
                    Primary Threat
                  </span>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40">
                    {current.topThreat.code}
                  </span>
                </div>
                <div className="text-xs font-bold text-white mb-1">{current.topThreat.name}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2">{current.topThreat.desc}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full btn btn-secondary text-xs py-2.5 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText size={15} />
                <span>View Security Report</span>
              </button>
              <button
                type="button"
                onClick={handleStartScanning}
                className="w-full btn btn-primary text-xs py-2.5 font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Scan Your Own Artifacts</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowModal(false)}
          >
            <div
              className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Security Report ({current.name})</h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${current.badgeColor}`}>
                        {current.riskLevel} ({current.score}/100)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Target Payload: {current.format} · Static Heuristic Inspection</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
                <div className="text-xs font-mono uppercase text-slate-500 tracking-wider font-semibold mb-2 flex items-center justify-between">
                  <span>Detailed Heuristic Findings ({current.findingsList.length} Flagged)</span>
                  <span className="text-blue-400">Zero Execution Sandbox</span>
                </div>
                {current.findingsList.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`badge ${item.badgeColor}`}>
                        {item.severity}
                        </span>
                        <span className="text-sm font-semibold text-slate-200">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.type}
                        </span>
                        <span className="text-blue-400">{item.ruleId}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 mb-2">
                      <span className="text-slate-500 select-none mr-2">[Evidence]</span>
                      {item.description}
                    </div>
                    <div className="text-xs text-emerald-400/90 flex items-start gap-1.5">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span><strong className="text-slate-300">Remediation:</strong> {item.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 text-center sm:text-left">
                  Demonstration sample report generated by AISecGuard static analysis engine.
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-ghost text-xs px-4 py-2 flex-1 sm:flex-none cursor-pointer"
                  >
                    Close Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      handleStartScanning();
                    }}
                    className="btn btn-primary text-xs px-4 py-2 flex-1 sm:flex-none cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
                  >
                    <span>Launch Live Scan</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
