/**
 * AISecGuard — Homepage content
 * Values mirror the backend: app/core/config.py (extensions, upload limit),
 * app/services/risk_engine.py (weights, thresholds) and app/scanners/* (rule IDs).
 */

import { Cpu, Database, Package } from 'lucide-react';

export const MAX_UPLOAD_MB = 100;

export const SEVERITY_WEIGHTS = { CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1, INFORMATIONAL: 0 };

/** Same rules as assess_risk() in backend/app/services/risk_engine.py */
export function assessRisk(counts) {
  const score = Object.entries(counts).reduce(
    (sum, [sev, n]) => sum + (SEVERITY_WEIGHTS[sev] ?? 0) * n,
    0,
  );
  let level = 'LOW';
  let reason = score === 0 ? 'No weighted findings.' : 'Score below 5.';
  if (score >= 30 || counts.CRITICAL >= 2) {
    level = 'CRITICAL';
    reason = counts.CRITICAL >= 2 ? 'Two or more CRITICAL findings.' : 'Score of 30 or more.';
  } else if (score >= 15 || counts.CRITICAL >= 1) {
    level = 'HIGH';
    reason = score >= 15 ? 'Score between 15 and 29.' : 'Any CRITICAL finding is at least HIGH.';
  } else if (score >= 5 || counts.HIGH >= 1) {
    level = 'MEDIUM';
    reason = score >= 5 ? 'Score between 5 and 14.' : 'Any HIGH finding is at least MEDIUM.';
  }
  return { score, level, reason };
}

export const SCANNERS = [
  {
    id: 'model',
    icon: Cpu,
    tone: 'teal',
    title: 'AI Model Scanner',
    badge: 'Static bytes',
    summary:
      'Walks pickle opcodes and file headers without ever loading the model, so a booby-trapped checkpoint cannot run.',
    formats: ['.pkl', '.joblib', '.pt', '.pth', '.h5', '.onnx', '.safetensors', '.bin'],
    rules: [
      ['MODEL-001', 'Pickle-based serialization'],
      ['MODEL-002', 'Dangerous callable in pickle opcodes'],
      ['MODEL-003', 'PyTorch legacy / ZIP pickle format'],
      ['MODEL-006', 'SafeTensors header inspection'],
      ['MODEL-009', 'Suspicious strings in binary'],
    ],
  },
  {
    id: 'dataset',
    icon: Database,
    tone: 'violet',
    title: 'Dataset Scanner',
    badge: 'Statistical',
    summary:
      'Profiles training data for the fingerprints of poisoning: duplicated rows, extreme outliers, skewed labels and broken files.',
    formats: ['.csv', '.json', '.jsonl', '.parquet'],
    rules: [
      ['DATA-001', 'Empty dataset file'],
      ['DATA-002', 'Malformed or unparseable file'],
      ['DATA-010', 'High missing-value rate'],
      ['DATA-007', 'Duplicate row concentration'],
      ['DATA-008', 'Extreme numerical values (z-score)'],
    ],
  },
  {
    id: 'dependency',
    icon: Package,
    tone: 'blue',
    title: 'Dependency Scanner',
    badge: 'Lexical',
    summary:
      'Reads requirements.txt and pyproject.toml as text. Nothing is installed or imported; no network calls are made.',
    formats: ['requirements.txt', 'pyproject.toml'],
    rules: [
      ['DEP-001', 'Empty dependency file'],
      ['DEP-003', 'Unpinned dependency'],
      ['DEP-004', 'Overly broad version range'],
      ['DEP-005', 'Possible typosquatted package'],
      ['DEP-002', 'File could not be parsed'],
    ],
  },
];

export const FORMAT_COUNT = SCANNERS.reduce((n, s) => n + s.formats.length, 0);
export const RULE_COUNT = 30; // MODEL-001..011 (+006b, 010b), DATA-001..011, DEP-001..006

/** Scenarios replayed by the hero console. Findings are what the scanners emit for such files. */
export const CONSOLE_SCENARIOS = [
  {
    file: 'resnet_classifier.pkl',
    type: 'MODEL',
    size: '48 KB',
    scanner: 'ModelScanner',
    findings: [
      ['MODEL-002', 'CRITICAL', 'os.system referenced in pickle opcodes'],
      ['MODEL-001', 'HIGH', 'Pickle-based serialization detected'],
    ],
    level: 'HIGH',
    score: 16,
    verdict: 'Quarantine recommended',
  },
  {
    file: 'training_data.csv',
    type: 'DATASET',
    size: '2.1 MB',
    scanner: 'DatasetScanner',
    findings: [
      ['DATA-007', 'MEDIUM', 'High duplicate row concentration'],
      ['DATA-008', 'MEDIUM', 'Extreme numerical values in 2 columns'],
    ],
    level: 'MEDIUM',
    score: 6,
    verdict: 'Review before training',
  },
  {
    file: 'requirements.txt',
    type: 'DEPENDENCY',
    size: '1 KB',
    scanner: 'DependencyScanner',
    findings: [
      ['DEP-005', 'HIGH', '"reqeusts" looks like a typo of "requests"'],
      ['DEP-003', 'MEDIUM', 'numpy is not version-pinned'],
    ],
    level: 'MEDIUM',
    score: 9,
    verdict: 'Fix before deploying',
  },
];

export const PIPELINE = [
  {
    key: 'upload',
    title: 'Upload & validate',
    short: 'Upload',
    detail: `The file's extension decides its artifact type (model, dataset or dependency). Files over ${MAX_UPLOAD_MB} MB are rejected before they are stored.`,
    code: 'POST /api/v1/artifacts/upload',
  },
  {
    key: 'fingerprint',
    title: 'Fingerprint & provenance',
    short: 'Fingerprint',
    detail: 'A SHA-256 hash is computed in chunks and checked against any recorded baseline, so a swapped or tampered file stands out.',
    code: 'run_provenance_check(path)',
  },
  {
    key: 'route',
    title: 'Route to scanner',
    short: 'Route',
    detail: 'The scanner registry looks up the one scanner for the artifact type. Every scanner returns the same Finding shape.',
    code: "run_scanner('DATASET', path)",
  },
  {
    key: 'analyse',
    title: 'Static analysis',
    short: 'Analyse',
    detail: 'Bytes, opcodes, statistics or package names are inspected. Uploaded code is never deserialized, imported or executed.',
    code: 'scanner.scan(path) -> list[Finding]',
  },
  {
    key: 'score',
    title: 'Risk scoring',
    short: 'Score',
    detail: 'Each finding adds weighted points (CRITICAL 10, HIGH 6, MEDIUM 3, LOW 1) and the total maps to a risk level.',
    code: 'calculate_risk(findings)',
  },
  {
    key: 'act',
    title: 'Report & quarantine',
    short: 'Act',
    detail: 'Findings are saved with evidence and a fix. Export a JSON or PDF report, or quarantine the artifact so it cannot ship.',
    code: 'GET /api/v1/scans/{id}/report',
  },
];

export const FAQ = [
  {
    q: 'Does AISecGuard load or run my model?',
    a: 'No. Pickle files are read with an opcode walker (pickletools.genops) and other formats by their headers. Nothing is unpickled, imported, installed or executed.',
  },
  {
    q: 'Which files can I upload?',
    a: `Models: .pkl, .joblib, .pt, .pth, .h5, .onnx, .safetensors, .bin. Datasets: .csv, .json, .jsonl, .parquet. Dependencies: requirements.txt and pyproject.toml. Up to ${MAX_UPLOAD_MB} MB per file.`,
  },
  {
    q: 'How is the risk level calculated?',
    a: 'Findings add CRITICAL 10, HIGH 6, MEDIUM 3 and LOW 1 points. 0–4 is LOW, 5–14 MEDIUM, 15–29 HIGH and 30+ CRITICAL. One CRITICAL finding makes the scan at least HIGH; two make it CRITICAL.',
  },
  {
    q: 'Does a clean scan mean the file is safe?',
    a: 'No. Static analysis finds known risk indicators, not every possible attack. Treat a clean result as "nothing known was found" and keep reviewing artifacts from untrusted sources.',
  },
  {
    q: 'What does quarantine do?',
    a: 'It marks the artifact as quarantined and records who did it and why in an audit log, so it is clearly blocked from use until an analyst releases it.',
  },
];
