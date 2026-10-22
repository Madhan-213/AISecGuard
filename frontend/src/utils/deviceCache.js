/**
 * AISecGuard — Local Device Cache Memory Manager
 *
 * Provides client-side cache persistence for:
 * - Scans and risk assessments
 * - Artifact metadata and SHA-256 baselines
 * - Findings and MITRE ATLAS classifications
 * - Quarantine events and chain-of-custody logs
 *
 * No external database required. Operates completely in local device memory (localStorage).
 */

const SCANS_KEY = 'aisecguard_cache_scans';
const ARTIFACTS_KEY = 'aisecguard_cache_artifacts';
const FINDINGS_KEY = 'aisecguard_cache_findings';
const QUARANTINE_KEY = 'aisecguard_cache_quarantine';

// Default baseline telemetry stored in local cache memory for initial exploration
const BASELINE_CACHE_SCANS = [
  {
    id: 'scan-demo-model-01',
    artifact_id: 'art-demo-resnet50',
    scan_type: 'MODEL',
    status: 'COMPLETED',
    risk_score: 9.2,
    risk_level: 'CRITICAL',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    completed_at: new Date(Date.now() - 3600000 * 2 + 1200).toISOString(),
    findings_count: 3,
    findings: [
      {
        id: 'fnd-demo-01',
        scan_id: 'scan-demo-model-01',
        severity: 'CRITICAL',
        title: 'Arbitrary Code Execution Opcode in Pickle Stream',
        description: 'Detected dangerous opcode GLOBAL calling "posix:system" or "os:system" embedded within serialized model bytecode.',
        rule_id: 'MODEL_DANGEROUS_OPCODE',
        scanner_name: 'model_scanner',
        remediation: 'Do not unpickle untrusted model checkpoints. Convert safe weights to SafeTensors format.',
        metadata: { opcode: 'GLOBAL', target: 'os.system', offset: 142 }
      },
      {
        id: 'fnd-demo-02',
        scan_id: 'scan-demo-model-01',
        severity: 'HIGH',
        title: 'Unsafe Deserialization via Python Pickle',
        description: 'Model file uses standard Python pickle format which allows arbitrary object construction during loading.',
        rule_id: 'MODEL_FORMAT_PICKLE',
        scanner_name: 'model_scanner',
        remediation: 'Migrate architecture weights to SafeTensors format (zero arbitrary code execution capability).',
        metadata: { format: 'pickle', protocol: 4 }
      },
      {
        id: 'fnd-demo-03',
        scan_id: 'scan-demo-model-01',
        severity: 'LOW',
        title: 'Untrusted Origin Model Checkpoint',
        description: 'Model signature does not match internal cryptographic certificate or trusted root.',
        rule_id: 'PROV_UNTRUSTED_ORIGIN',
        scanner_name: 'provenance_scanner',
        remediation: 'Sign model releases using internal code signing keys or verify Hugging Face commit signatures.',
        metadata: { signature: 'missing' }
      }
    ]
  },
  {
    id: 'scan-demo-dataset-02',
    artifact_id: 'art-demo-churn-csv',
    scan_type: 'DATASET',
    status: 'COMPLETED',
    risk_score: 6.4,
    risk_level: 'HIGH',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 3600000 * 5 + 2400).toISOString(),
    findings_count: 2,
    findings: [
      {
        id: 'fnd-demo-04',
        scan_id: 'scan-demo-dataset-02',
        severity: 'HIGH',
        title: 'Heuristic Data Poisoning Outlier Anomaly',
        description: 'Features "transaction_amount" contain 4.8% records with extreme z-scores (> 4.5 sigma) indicative of trigger insertion.',
        rule_id: 'DATA_EXTREME_OUTLIERS',
        scanner_name: 'dataset_scanner',
        remediation: 'Isolate affected training records and run robust statistical trimming / DBSCAN clustering.',
        metadata: { feature: 'transaction_amount', outlier_ratio: 0.048, z_max: 6.2 }
      },
      {
        id: 'fnd-demo-05',
        scan_id: 'scan-demo-dataset-02',
        severity: 'MEDIUM',
        title: 'Severe Label Imbalance Detected',
        description: 'Minority target class accounts for less than 1.2% of dataset distribution.',
        rule_id: 'DATA_CLASS_IMBALANCE',
        scanner_name: 'dataset_scanner',
        remediation: 'Apply SMOTE oversampling or focal loss to mitigate adversarial class dominance.',
        metadata: { minority_ratio: 0.012 }
      }
    ]
  },
  {
    id: 'scan-demo-dep-03',
    artifact_id: 'art-demo-reqs-txt',
    scan_type: 'DEPENDENCY',
    status: 'COMPLETED',
    risk_score: 3.5,
    risk_level: 'MEDIUM',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    completed_at: new Date(Date.now() - 3600000 * 12 + 650).toISOString(),
    findings_count: 2,
    findings: [
      {
        id: 'fnd-demo-06',
        scan_id: 'scan-demo-dep-03',
        severity: 'MEDIUM',
        title: 'Unpinned Package Version Range',
        description: 'Manifest allows unbounded version resolution for "torch" and "transformers", vulnerable to supply chain hijacking.',
        rule_id: 'DEP_UNPINNED_VERSION',
        scanner_name: 'dependency_scanner',
        remediation: 'Pin exact package versions (e.g. torch==2.2.1) and generate cryptographic hashes (pip-compile --generate-hashes).',
        metadata: { packages: ['torch>=2.0', 'transformers*'] }
      },
      {
        id: 'fnd-demo-07',
        scan_id: 'scan-demo-dep-03',
        severity: 'LOW',
        title: 'Typosquatting Risk Metric',
        description: 'Package name "sci-kit-learn" closely mirrors official "scikit-learn".',
        rule_id: 'DEP_TYPOSQUAT_SIMILARITY',
        scanner_name: 'dependency_scanner',
        remediation: 'Verify package name spelling against PyPI official repository metadata.',
        metadata: { suspicious: 'sci-kit-learn', expected: 'scikit-learn' }
      }
    ]
  }
];

const BASELINE_CACHE_ARTIFACTS = [
  {
    id: 'art-demo-resnet50',
    filename: 'resnet50_weights.pkl',
    artifact_type: 'MODEL',
    file_size_bytes: 102554200,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'QUARANTINED',
    quarantine_reason: 'Arbitrary execution opcode (os.system) detected in pickle stream.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'art-demo-churn-csv',
    filename: 'churn_training_dataset.csv',
    artifact_type: 'DATASET',
    file_size_bytes: 4821900,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'art-demo-reqs-txt',
    filename: 'requirements.txt',
    artifact_type: 'DEPENDENCY',
    file_size_bytes: 1420,
    sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  }
];

function readJson(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (err) {
    console.warn(`[LocalCache] Failed reading ${key}:`, err);
    return defaultVal;
  }
}

function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[LocalCache] Failed writing ${key}:`, err);
  }
}

export const deviceCache = {
  /**
   * Retrieve all cached scans from local device memory
   */
  getScans() {
    let scans = readJson(SCANS_KEY, null);
    if (!scans || !Array.isArray(scans) || scans.length === 0) {
      scans = [...BASELINE_CACHE_SCANS];
      writeJson(SCANS_KEY, scans);
      this._seedArtifactsAndFindings();
    }
    return scans;
  },

  /**
   * Retrieve single scan by scanId from local device memory
   */
  getScan(scanId) {
    const scans = this.getScans();
    return scans.find(s => s.id === scanId) || null;
  },

  /**
   * Save or update a scan in local device memory
   */
  saveScan(scanData) {
    if (!scanData || !scanData.id) return;
    const scans = this.getScans();
    const existingIdx = scans.findIndex(s => s.id === scanData.id);

    const normalizedScan = {
      ...scanData,
      updated_at: new Date().toISOString(),
      findings_count: scanData.findings?.length ?? scanData.findings_count ?? 0,
    };

    if (existingIdx >= 0) {
      scans[existingIdx] = { ...scans[existingIdx], ...normalizedScan };
    } else {
      scans.unshift(normalizedScan);
    }

    writeJson(SCANS_KEY, scans);

    // Also cache findings
    if (scanData.findings && Array.isArray(scanData.findings)) {
      this.saveFindings(scanData.findings, scanData.id);
    }

    // Also cache artifact if present
    if (scanData.artifact) {
      this.saveArtifact(scanData.artifact);
    }

    return normalizedScan;
  },

  /**
   * Retrieve all artifacts stored in local device cache
   */
  getArtifacts() {
    let artifacts = readJson(ARTIFACTS_KEY, null);
    if (!artifacts || !Array.isArray(artifacts) || artifacts.length === 0) {
      artifacts = [...BASELINE_CACHE_ARTIFACTS];
      writeJson(ARTIFACTS_KEY, artifacts);
    }
    return artifacts;
  },

  /**
   * Retrieve single artifact by ID
   */
  getArtifact(artifactId) {
    const list = this.getArtifacts();
    return list.find(a => a.id === artifactId) || null;
  },

  /**
   * Save or update artifact in local device cache
   */
  saveArtifact(artifact) {
    if (!artifact || !artifact.id) return;
    const list = this.getArtifacts();
    const idx = list.findIndex(a => a.id === artifact.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...artifact };
    } else {
      list.unshift(artifact);
    }
    writeJson(ARTIFACTS_KEY, list);
    return artifact;
  },

  /**
   * Retrieve all security findings in local device cache
   */
  getFindings() {
    const scans = this.getScans();
    const all = [];
    scans.forEach(s => {
      if (s.findings && Array.isArray(s.findings)) {
        s.findings.forEach(f => {
          all.push({ ...f, scan_id: s.id, artifact_id: s.artifact_id });
        });
      }
    });
    return all;
  },

  /**
   * Save list of findings
   */
  saveFindings(findingsList, scanId) {
    const current = readJson(FINDINGS_KEY, []);
    const filtered = current.filter(f => f.scan_id !== scanId);
    const updated = [...findingsList.map(f => ({ ...f, scan_id: scanId })), ...filtered];
    writeJson(FINDINGS_KEY, updated);
  },

  /**
   * Quarantine an artifact in local device cache
   */
  quarantineArtifact(artifactId, reason) {
    const artifacts = this.getArtifacts();
    const art = artifacts.find(a => a.id === artifactId);
    if (art) {
      art.status = 'QUARANTINED';
      art.quarantine_reason = reason;
      art.quarantined_at = new Date().toISOString();
      writeJson(ARTIFACTS_KEY, artifacts);
    }

    const events = readJson(QUARANTINE_KEY, []);
    events.unshift({
      id: `qev-${Date.now()}`,
      artifact_id: artifactId,
      action: 'QUARANTINE',
      reason,
      performed_by: 'local-analyst',
      timestamp: new Date().toISOString(),
    });
    writeJson(QUARANTINE_KEY, events);
    return art;
  },

  /**
   * Release an artifact in local device cache
   */
  releaseArtifact(artifactId, reason) {
    const artifacts = this.getArtifacts();
    const art = artifacts.find(a => a.id === artifactId);
    if (art) {
      art.status = 'ACTIVE';
      art.quarantine_reason = null;
      art.released_at = new Date().toISOString();
      writeJson(ARTIFACTS_KEY, artifacts);
    }

    const events = readJson(QUARANTINE_KEY, []);
    events.unshift({
      id: `qev-${Date.now()}`,
      artifact_id: artifactId,
      action: 'RELEASE',
      reason,
      performed_by: 'local-analyst',
      timestamp: new Date().toISOString(),
    });
    writeJson(QUARANTINE_KEY, events);
    return art;
  },

  /**
   * Clear all local device cache memory
   */
  clearCache() {
    localStorage.removeItem(SCANS_KEY);
    localStorage.removeItem(ARTIFACTS_KEY);
    localStorage.removeItem(FINDINGS_KEY);
    localStorage.removeItem(QUARANTINE_KEY);
    console.log('[LocalCache] Cleared device cache memory.');
  },

  /**
   * Reset cache back to initial baseline data
   */
  resetToBaseline() {
    writeJson(SCANS_KEY, [...BASELINE_CACHE_SCANS]);
    writeJson(ARTIFACTS_KEY, [...BASELINE_CACHE_ARTIFACTS]);
    this._seedArtifactsAndFindings();
  },

  /**
   * Export all device cache memory as downloadable JSON
   */
  exportCacheAsJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      platform: 'AISecGuard Local Device Memory',
      scans: this.getScans(),
      artifacts: this.getArtifacts(),
      findings: this.getFindings(),
      quarantine_events: readJson(QUARANTINE_KEY, [])
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aisecguard_device_cache_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Get metrics about local cache memory usage
   */
  getCacheMetrics() {
    const scans = this.getScans();
    const artifacts = this.getArtifacts();
    const findings = this.getFindings();
    
    // Approximate bytes stored
    let bytes = 0;
    try {
      [SCANS_KEY, ARTIFACTS_KEY, FINDINGS_KEY, QUARANTINE_KEY].forEach(k => {
        const val = localStorage.getItem(k);
        if (val) bytes += val.length * 2; // ~2 bytes per char
      });
    } catch {
      bytes = 0;
    }

    return {
      scanCount: scans.length,
      artifactCount: artifacts.length,
      findingCount: findings.length,
      storageSizeKb: (bytes / 1024).toFixed(1),
      mode: 'Local Device Cache (Zero DB)',
    };
  },

  _seedArtifactsAndFindings() {
    writeJson(ARTIFACTS_KEY, [...BASELINE_CACHE_ARTIFACTS]);
    const allFindings = [];
    BASELINE_CACHE_SCANS.forEach(s => {
      if (s.findings) {
        s.findings.forEach(f => allFindings.push(f));
      }
    });
    writeJson(FINDINGS_KEY, allFindings);
  }
};
