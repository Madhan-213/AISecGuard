# Product Requirements Document (PRD)

**Project:** AISecGuard — Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Document Version:** 1.1.0  
**Status:** Approved / Active Baseline  
**Target Milestone:** Minimum Viable Product (MVP) & Research Phase 1  
**Primary Stakeholders:** MLOps Teams, Cybersecurity / AppSec Analysts, Data Scientists, AI Governance & Compliance Officers  

---

## 1. Executive Summary

The rapid integration of Artificial Intelligence and Machine Learning (AI/ML) into enterprise infrastructure has outpaced traditional cybersecurity paradigms. Modern AI applications rely on complex, multi-tiered supply chains comprising third-party foundation models, open-source weight checkpoints, crowdsourced training datasets, and hundreds of transitive Python dependencies.

Unlike traditional software codebases, AI artifacts introduce unique attack surfaces:
- Arbitrary code execution embedded in serialized model weights (`.pkl`, `.pt`, `.joblib`).
- Covert data poisoning and backdoor triggers in training datasets (`.csv`, `.parquet`, `.jsonl`).
- Typosquatting, unpinned packages, and framework vulnerabilities in AI dependencies.
- Model weight tampering, provenance hijacking, and untracked multi-hop lineage.
- Emerging regulatory non-compliance with the EU AI Act (2024/1689) and U.S. Executive Order 14110.

**AISecGuard** is a comprehensive AI Supply Chain Security and Governance Framework designed to inspect, evaluate, sign, and contain AI artifacts before they are ingested, fine-tuned, or deployed. Built upon the foundational principle of **Zero-Code-Execution (Static Analysis Guarantee)**, AISecGuard inspects raw byte sequences, opcode streams, and dataset statistical distributions without ever loading, instantiating, or executing untrusted code.

---

## 2. Problem Statement & Research Context

### 2.1 The Core Challenge
Despite the rapid adoption of AI and ML systems across critical sectors, organizations lack comprehensive security frameworks that address the unique vulnerabilities of the AI supply chain. 

### 2.2 The 5 Key Problem Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│                   The 5 AI Supply Chain Problem Pillars                │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Data Supply Chain Vulnerabilities  : Poisoning, unverified sources  │
│ 2. Model Supply Chain Attacks        : Pickle RCE, trojans, tampering  │
│ 3. AI Framework & Dependency Risks   : Framework CVEs, typosquatting   │
│ 4. Deployment and Runtime Risks      : Evasion, drift, unhardened APIs │
│ 5. Regulatory & Compliance Gaps      : EU AI Act, lack of AI SBOMs     │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Problem 1: Data Supply Chain Vulnerabilities**
   - Training data is often sourced from untrusted or unverified origins (web-scraping, public datasets).
   - Data poisoning attacks subtly manipulate labels or feature distributions to create hidden triggers or degrade model integrity.
   - Complete lack of data provenance, transformation auditing, and multi-hop lineage tracking between raw datasets and fine-tuned checkpoints.
   - Unvalidated data transformations and preprocessing pipelines create silent injection windows.

2. **Problem 2: Model Supply Chain Attacks**
   - Model serialization formats (Pickle, PyTorch `.pt`, Joblib, HDF5) are Turing-complete bytecode programs vulnerable to arbitrary code execution (RCE).
   - Pre-trained models downloaded from public model hubs (Hugging Face, ModelZoo) can harbor hidden neural backdoors.
   - Cryptographic model integrity verification and digital signing are rarely implemented in MLOps pipelines.
   - Transfer learning introduces cascading supply chain risks from base foundation models to all fine-tuned children.

3. **Problem 3: AI Framework and Dependency Risks**
   - ML frameworks (TensorFlow, PyTorch, scikit-learn) have unique vulnerability classes in native C++/CUDA parsers.
   - AI-specific dependencies and GPU/CUDA runtime libraries are omitted from standard Software Bills of Materials (SBOMs).
   - Rapid evolution of the AI ecosystem encourages unpinned dependencies and exposes pipelines to typosquatting and dependency confusion attacks.

4. **Problem 4: Deployment and Runtime Risks**
   - Model serving infrastructure (Triton, TorchServe, KServe) is frequently unhardened against unauthorized weight loading.
   - Deployed models face adversarial attacks (evasion perturbations, model inversion, model extraction/theft).
   - Natural or adversarial model/concept drift can be exploited without real-time inference telemetry.

5. **Problem 5: Regulatory and Compliance Gaps**
   - Emerging regulations (EU AI Act, U.S. Executive Order 14110, NIST AI RMF) mandate AI supply chain transparency, risk management, and cybersecurity documentation.
   - Absence of standardized tooling for automated Machine Learning Bills of Materials (ML-BOMs) and verifiable Model Cards.
   - Severe corporate liability and compliance audit challenges across the AI lifecycle.

### 2.3 Formal Problem Statement Formulation
> *"Despite the rapid adoption of AI and ML systems across critical sectors, organizations lack comprehensive security frameworks that address the unique vulnerabilities of the AI supply chain. The challenge lies in developing a system that can:  
> **(1)** track and verify the provenance of AI training data,  
> **(2)** ensure the integrity and security of AI models throughout their lifecycle,  
> **(3)** protect against data poisoning and model backdoor attacks,  
> **(4)** provide automated vulnerability detection for AI frameworks and dependencies,  
> **(5)** monitor AI systems for adversarial attacks in production, and  
> **(6)** maintain audit trails for regulatory compliance without degrading model performance."*

---

## 3. Target Users & User Personas

| Persona | Role | Primary Objective | Key Pain Point |
|---|---|---|---|
| **P1: MLOps / Platform Engineer** | Infrastructure & CI/CD | Automate pre-deployment security verification in CI/CD and model registries. | Cannot verify safety of third-party checkpoints before loading into serving clusters. |
| **P2: AppSec / SecOps Analyst** | Cybersecurity & Incident Response | Audit AI assets, determine vulnerability severity, and enforce quarantine. | Lacks tooling to inspect `.pkl`/`.pt`/`.safetensors` files without risking server compromise. |
| **P3: Data Scientist / ML Developer** | Model & Data Pipeline Author | Ensure clean training datasets and safely convert legacy models to modern safe formats. | Security tools produce cryptic warnings or require manual review that slows development. |
| **P4: AI Governance & Risk Officer** | Compliance & Audit | Maintain audit logs, provenance history, and compliance readiness (e.g., EU AI Act, NIST AI RMF). | No verifiable audit trail of AI model origins, SHA-256 baselines, or inspection records. |

---

## 4. Product Goals & Vision

### 4.1 Product Vision
To establish the industry standard pre-deployment security inspection gateway for artificial intelligence assets, ensuring no untrusted model, dataset, or package enters production environments unvetted.

### 4.2 Core Goals
1. **Zero-Execution Static Guarantee:** Ensure zero host compromise by strictly prohibiting `pickle.load()`, `eval()`, `exec()`, or dynamic model loading during scanning.
2. **Comprehensive Tri-Artifact Coverage:** Provide specialized static scanners for:
   - AI Models (`.pkl`, `.pt`, `.onnx`, `.safetensors`, `.joblib`, `.h5`, `.bin`).
   - Datasets (`.csv`, `.parquet`, `.json`, `.jsonl`).
   - Dependencies (`requirements.txt`, `pyproject.toml`).
3. **Multi-Hop Lineage & Upstream Risk Propagation:** Model parent-child relationships (`TRAINED_ON`, `FINE_TUNED_FROM`, `DERIVED_FROM`, `DEPENDS_ON`) and automatically propagate quarantine flags if upstream artifacts are compromised.
4. **Cryptographic Signing & Integrity:** Provide asymmetric digital signing (Ed25519) and streaming SHA-256 baseline verification to prevent tampering and ensure non-repudiation.
5. **Deterministic Threat Scoring:** Deliver a standardized 0–10 risk score with clear severity levels (Informational, Low, Medium, High, Critical) and transparent mathematical breakdown.
6. **Automated Risk Containment:** Automatically quarantine high-risk or critical artifacts into isolated physical storage with cryptographic release controls.
7. **Actionable Remediation & Automated Compliance:** Export machine-actionable JSON reports, executive PDF remediation guides, CycloneDX 1.6 ML-BOMs, and automated EU AI Act evidence mappings.

---

## 5. Core System Architecture & Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                          AISecGuard Ecosystem                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Ingestion & Auth     : REST Upload, API Keys (asg_...), JWT         │
│ 2. Provenance & Lineage : Streaming SHA-256 & Directed Acyclic Graph  │
│ 3. Static Scanners      :                                              │
│    ├── Model Scanner    : Bytecode Disassembly & Opcode Analysis       │
│    ├── Dataset Scanner  : Z-Score Outlier & Label Skew Detection       │
│    └── Dependency Audit : Unpinned Manifests, Typosquats, CVEs (OSV)  │
│ 4. Scoring Engine       : Weighted 0-10 Multi-Factor Threat Matrix     │
│ 5. Mitigation Engine    : Physical File Quarantine & Cryptographic Log │
│ 6. Cryptography & BOM   : Ed25519 Signing & CycloneDX 1.6 ML-BOM       │
│ 7. Compliance Engine    : EU AI Act (Art. 10-15) & Model Card Export   │
│ 8. Presentation Layer   : React 19 UI, Real-time SSE Telemetry, PDF    │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Model Security Scanner (Zero-Execution Bytecode Disassembly)
- **Static Bytecode Disassembly:** Walks raw pickle opcode streams using Python's `pickletools` without instantiating objects.
- **Dangerous Opcode / Symbol Interception:** Detects hazardous opcodes (`GLOBAL`, `STACK_GLOBAL`, `REDUCE`, `BUILD`, `INST`) that import dangerous execution namespaces:
  - System commands: `os.system`, `subprocess.Popen`, `posix.spawn`, `pty.spawn`.
  - Dynamic evaluation: `builtins.eval`, `builtins.exec`, `__builtin__.compile`.
  - Remote networking: `socket`, `urllib.request`, `http.client`.
- **Format Verification & Safe Alternatives:**
  - Validates modern safe formats (SafeTensors, ONNX) which store pure tensor weights without execution opcodes.
  - Flags PyTorch `.pt` checkpoints lacking the `weights_only=True` safe flag.
  - Detects format anomalies and unexpected embedded binary blobs.

### 5.2 Dataset Security Scanner (Statistical Anomaly & Poisoning)
- **Statistical Poisoning Indicators:** Identifies anomalous distributions in tabular datasets that signal label-flipping or trigger backdoors.
- **Z-Score Outlier Analysis:** Flags extreme numerical outliers ($|z| > 3.0$ and extreme $|z| > 5.0$) across numeric features.
- **Class Imbalance & Entropy Scoring:** Detects sudden label skew, missing values exceeding thresholds (> 20%), and duplicate records.
- **Format Sanitization:** Validates structured tabular data across CSV, JSON, JSONL, and Parquet.

### 5.3 Dependency & Manifest Scanner (CVE & Typosquatting)
- **Manifest Parsing:** Parses pinned and unpinned dependencies in `requirements.txt` and `pyproject.toml`.
- **Security Anti-Patterns:** Flags unbounded version ranges (e.g., `>=1.0.0` or bare package names without lockfiles).
- **Typosquatting Detection:** Uses normalized Levenshtein distance and known typosquat databases against top ML libraries (`numpy`, `torch`, `scikit-learn`, `transformers`, `tensorflow`).
- **Known CVE Matching:** Matches dependencies against a bundled curated catalog and optional live OSV.dev lookup.

### 5.4 Data Lineage & Provenance Engine (DAG)
- **Directed Acyclic Graph (DAG):** Tracks relations:
  - `TRAINED_ON` (Dataset $\rightarrow$ Model)
  - `FINE_TUNED_FROM` (Model $\rightarrow$ Model)
  - `DERIVED_FROM` (Dataset $\rightarrow$ Dataset)
  - `DEPENDS_ON` (Dependency Manifest $\rightarrow$ Model)
- **Cascading Upstream Risk (Rule LIN-001):** Automatically fires a HIGH-severity finding on any downstream child artifact if an upstream parent within 5 hops is quarantined or scored HIGH/CRITICAL.
- **Transformation Drift Rules:**
  - `DATA-012`: Flagged when a derived dataset alters schema columns compared to its parent.
  - `DATA-013`: Flagged when row count fluctuates by more than 50%.
  - `DATA-014`: Flagged when label distribution shifts by 20% or more (Total Variation Distance).

### 5.5 Cryptographic Model Signing & Key Management
- **Asymmetric Ed25519 Signatures:** Authorized security analysts approve and sign scanned, clean models.
- **Enforced Security Policy:** Digital signing is strictly blocked for unscanned, quarantined, HIGH/CRITICAL-risk, or upstream-compromised (`LIN-001`) artifacts.
- **Public Verification API:** Exposes endpoints to verify signatures and retrieve public keys for CI/CD gates.

### 5.6 Automated Compliance & Model Card Engine
- **EU AI Act Article 10–15 Evidence Mapping:** Automatically maps scan findings to regulatory articles:
  - Article 10: Data & Data Governance (dataset scan & poisoning metrics).
  - Article 11: Technical Documentation (ML-BOM and provenance).
  - Article 12: Record-Keeping (immutable audit trails).
  - Article 14: Human Oversight (quarantine release approvals).
  - Article 15: Accuracy, Robustness & Cybersecurity (pickle safety & hash verification).
- **Compliance Status Grading:** Classifies each article as `MET`, `PARTIAL`, `GAP`, or `NOT_APPLICABLE`.
- **Automated Model Card:** Generates standard Markdown Model Cards summarizing model architecture, SHA-256 fingerprint, input/output schemas, and security verification.

### 5.7 CycloneDX 1.6 ML-BOM Generator
- Automatically compiles standard **Machine Learning Bill of Materials (ML-BOM)** in CycloneDX 1.6 JSON format.
- Details model architecture, input/output shapes, training dataset hashes, third-party libraries, and cryptographic signatures.

### 5.8 Central Risk Scoring Engine
- **Point-Based Finding Weights:**
  - Informational: 0 points
  - Low: 1 point
  - Medium: 3 points
  - High: 6 points
  - Critical: 10 points
- **Composite Threat Classification:**
  - `0 - 4` points: **LOW** (Safe to deploy)
  - `5 - 14` points: **MEDIUM** (Review recommended)
  - `15 - 29` points: **HIGH** (Quarantine recommended)
  - `≥ 30` points: **CRITICAL** (Immediate quarantine required)
- **Deterministic Overrides:**
  - Any single Critical finding guarantees at least **HIGH** risk.
  - Two or more Critical findings enforce a **CRITICAL** risk score.

### 5.9 Automated Quarantine & Mitigation
- **Physical File Isolation:** High and Critical risk artifacts are automatically or administratively moved from active storage (`uploads/`) to an isolated quarantine partition (`uploads/quarantine/`).
- **Access Gating:** Quarantined artifacts cannot be downloaded, executed, or linked to downstream pipelines.
- **Tamper-Evident Audit Hash Chain:** Every quarantine, release, and administrative action writes to an immutable cryptographic hash chain verifiable via `/api/v1/audit/verify`.

### 5.10 Programmatic CI/CD Integration & API Keys
- Supports developer API keys (`X-API-Key: asg_...`) for automated pipeline gating.
- Keys are hashed with SHA-256 before storage; raw secrets are displayed only once upon generation.

---

## 6. MVP Scope vs. Extended Research Roadmap

To balance immediate delivery for the MCA project with the comprehensive research vision, the architecture is split into a **Phase 1 Production MVP** and a **Phase 2 Extended Research Roadmap**:

| Feature / Capability | MVP Scope (Phase 1 - In) | Extended Roadmap (Phase 2 - Out) | Rationale / Architectural Role |
|---|:---:|:---:|---|
| Static Pickle Opcode Disassembly | **Yes** | — | Core pre-deployment defense against arbitrary code execution. |
| SafeTensors & ONNX Validation | **Yes** | — | Promotes safe tensor serialization standards. |
| Tabular Dataset Anomaly Scanning | **Yes** | — | Detects data corruption and statistical poisoning indicators. |
| Dependency & Manifest Auditing | **Yes** | — | Identifies unpinned packages, typosquatting, and known CVEs. |
| SHA-256 Provenance & Tamper Checks | **Yes** | — | Establishes cryptographic baseline on intake. |
| Multi-Hop Lineage Graph (DAG) | **Yes** | — | Tracks artifact parentage and upstream risk contamination. |
| Ed25519 Cryptographic Model Signing | **Yes** | — | Guarantees authenticity and non-repudiation for approved models. |
| CycloneDX 1.6 ML-BOM Export | **Yes** | — | Standardized machine-readable AI Bill of Materials. |
| EU AI Act Compliance Evidence Engine | **Yes** | — | Direct regulatory mapping to Articles 10–15. |
| 0–10 Explainable Risk Scoring Engine | **Yes** | — | Normalized decision metric for pipeline gating. |
| Physical Directory Quarantine & Audit Chain | **Yes** | — | Active containment mechanism with tamper-evident logs. |
| React 19 UI & Real-Time SSE Telemetry | **Yes** | — | High usability for security analysts and ML engineers. |
| Dual Mode: Standalone & Enterprise DB | **Yes** | — | Zero-dependency local evaluation + PostgreSQL enterprise setup. |
| API Keys for CI/CD Automation | **Yes** | — | Headless pipeline integration via `X-API-Key`. |
| *Dynamic Backdoor Detection (Neural Cleanse, STRIP)* | No | **Phase 2** | Requires GPU compute and forward inference; out of static scope. |
| *Adversarial Robustness Testing (ART, CleverHans)* | No | **Phase 2** | Requires live model execution; reserved for dynamic sandbox. |
| *Runtime Inference Drift & Evasion Gateway* | No | **Phase 2** | Belongs to the live serving layer (Triton/KServe), not pre-deployment. |
| *Automated Model Retraining / Cleaning* | No | **Phase 2** | Beyond security inspection; belongs to dedicated MLOps pipelines. |
| *GPU/CUDA Low-Level Kernel Profiling* | No | **Phase 2** | Specialized hardware auditing outside software supply chain scope. |

---

## 7. User Stories

### Epic 1: Artifact Ingestion & Integrity Verification
- **US-1.1 (Model Intake):**  
  *As an* MLOps Engineer,  
  *I want to* upload model files (`.pkl`, `.pt`, `.onnx`, `.safetensors`, `.joblib`) up to 100 MB via web portal or REST API,  
  *So that* they can be inspected prior to deployment into our model registry.  
  *(Priority: Critical / MVP)*

- **US-1.2 (Cryptographic Baseline):**  
  *As a* Security Analyst,  
  *I want* the system to compute a SHA-256 fingerprint upon upload and compare it against a known-good checksum,  
  *So that* I can detect if a model was altered in transit or replaced with a backdoored replica.  
  *(Priority: Critical / MVP)*

### Epic 2: Deep Static Security Scanning
- **US-2.1 (Pickle Opcode Inspection):**  
  *As a* Security Analyst,  
  *I want* the model scanner to statically parse bytecode without executing Python code,  
  *So that* arbitrary code execution payloads (`os.system`, `eval`, `subprocess`) are detected with zero risk to the scanner infrastructure.  
  *(Priority: Critical / MVP)*

- **US-2.2 (Dataset Statistical Quality & Poisoning):**  
  *As a* Data Scientist,  
  *I want* the dataset scanner to evaluate CSV/Parquet files for extreme z-score outliers, high missing-value ratios, and severe class skew,  
  *So that* I am alerted to corrupted or potentially poisoned training data before training starts.  
  *(Priority: High / MVP)*

- **US-2.3 (Dependency Vulnerability & Typosquatting):**  
  *As an* AI Developer,  
  *I want* my `requirements.txt` to be scanned for unpinned version ranges, typosquatted packages, and known CVEs,  
  *So that* our build pipeline does not pull compromised supply chain dependencies.  
  *(Priority: High / MVP)*

### Epic 3: Lineage & Upstream Risk Tracking
- **US-3.1 (Multi-Hop Lineage Graph):**  
  *As an* MLOps Engineer,  
  *I want* to link datasets to models (`TRAINED_ON`) and base models to fine-tuned checkpoints (`FINE_TUNED_FROM`),  
  *So that* our team maintains full traceability across the AI asset lifecycle.  
  *(Priority: High / MVP)*

- **US-3.2 (Cascading Upstream Contamination):**  
  *As a* Security Analyst,  
  *I want* downstream models to automatically flag an upstream risk finding if their parent dataset or base model is quarantined,  
  *So that* compromised assets do not silently propagate into production.  
  *(Priority: High / MVP)*

### Epic 4: Threat Assessment & Mitigation
- **US-4.1 (Unified Risk Scoring):**  
  *As an* AppSec Lead,  
  *I want* each scan to output a normalized 0–10 risk score and categorical severity (Low, Medium, High, Critical),  
  *So that* our team can enforce automated gating policies based on risk thresholds.  
  *(Priority: Critical / MVP)*

- **US-4.2 (Automated Physical Quarantine):**  
  *As a* Security Administrator,  
  *I want* artifacts flagged with High or Critical risk to be moved to an isolated quarantine folder,  
  *So that* downstream systems are prevented from downloading or deploying compromised assets.  
  *(Priority: Critical / MVP)*

- **US-4.3 (Audit-Logged Release):**  
  *As an* Authorized Security Officer,  
  *I want* to review quarantine logs and provide documented justification to release a falsely flagged artifact,  
  *So that* operations can proceed while maintaining a tamper-evident audit record.  
  *(Priority: Medium / MVP)*

### Epic 5: Governance, Compliance & Export
- **US-5.1 (Cryptographic Model Signing):**  
  *As an* AppSec Lead,  
  *I want* to digitally sign approved, verified model checkpoints using Ed25519,  
  *So that* inference clusters only boot models with valid signatures.  
  *(Priority: High / MVP)*

- **US-5.2 (CycloneDX 1.6 ML-BOM Export):**  
  *As a* Compliance Officer,  
  *I want* to generate a standardized CycloneDX 1.6 ML-BOM for scanned models,  
  *So that* we can fulfill client and regulatory AI inventory requirements.  
  *(Priority: High / MVP)*

- **US-5.3 (EU AI Act Evidence Mapping):**  
  *As a* Governance Auditor,  
  *I want* to extract an automated compliance report mapping technical scan findings to Articles 10–15 of the EU AI Act,  
  *So that* our compliance posture is continuously verified with machine evidence.  
  *(Priority: High / MVP)*

---

## 8. Acceptance Criteria

Acceptance criteria are specified using the **Given-When-Then** behavioral specification standard:

### AC-01: Zero-Execution Model Scanning
```gherkin
Scenario: Malicious Pickle Checkpoint Upload
  Given a model file containing embedded dangerous opcodes (e.g., GLOBAL 'os' 'system')
  When the file is uploaded to the /api/v1/artifacts/upload endpoint and scanned
  Then the system MUST NOT execute or deserialize the pickle object
  And the scan MUST flag a CRITICAL finding identifying 'os.system'
  And the overall scan risk score MUST be classified as CRITICAL (≥ 10)
  And the artifact MUST be recommended or marked for QUARANTINE
```

### AC-02: Cryptographic Integrity & Tamper Detection
```gherkin
Scenario: Mismatched Checksum Detection
  Given an uploaded dataset artifact with a user-provided expected SHA-256 hash
  When the backend computes the streaming SHA-256 hash of the received bytes
  And the computed hash does not match the expected hash
  Then the system MUST record a HIGH severity finding for Hash Mismatch (PROV-002)
  And the provenance record MUST clearly state "Hash mismatch detected: Baseline violated"
```

### AC-03: Dataset Anomaly & Poisoning Detection
```gherkin
Scenario: Statistical Outliers and Severe Imbalance in Tabular Dataset
  Given a CSV dataset containing numeric features with extreme z-scores (> 3.5) and > 25% missing values
  When the DatasetScanner executes Phase 2 analysis
  Then the system MUST return findings for Outlier Anomalies and High Missing Value Ratio
  And the findings MUST include feature names, computed z-scores, and missing percentage metrics
  And the scan risk score MUST reflect the aggregated weighted points
```

### AC-04: Automated Physical Quarantine
```gherkin
Scenario: Quarantining a Critical Artifact
  Given an artifact with status 'SCANNED' and a risk score of CRITICAL
  When an authorized analyst or automated rule triggers the quarantine endpoint
  Then the physical file MUST be relocated from 'uploads/' to 'uploads/quarantine/'
  And the artifact status in the database MUST update to 'QUARANTINED'
  And an immutable QuarantineEvent record MUST be persisted with timestamp, user ID, and reason
  And subsequent attempts to download the artifact via public endpoints MUST return HTTP 403 Forbidden
```

### AC-05: Cascading Upstream Risk (Lineage)
```gherkin
Scenario: Upstream Parent Contamination
  Given a parent dataset that has been quarantined or classified as CRITICAL risk
  And a child model linked via 'TRAINED_ON'
  When the lineage evaluation engine runs
  Then rule LIN-001 MUST fire on the child model with HIGH severity
  And digital signing of the child model MUST be refused with HTTP 400 Bad Request
```

### AC-06: Asymmetric Cryptographic Signing
```gherkin
Scenario: Digital Signing of Clean Model
  Given an artifact with status 'SCANNED' and risk level 'LOW'
  When an authorized user sends POST /api/v1/artifacts/{id}/sign
  Then the system MUST sign the artifact SHA-256 digest using the Ed25519 private key
  And GET /api/v1/artifacts/{id}/signature MUST return 'signed: true' and 'valid: true'
```

### AC-07: CycloneDX 1.6 ML-BOM & EU AI Act Evidence
```gherkin
Scenario: Generating ML-BOM and Compliance Evidence
  Given a scanned model artifact with recorded lineage and dependencies
  When the user queries GET /api/v1/artifacts/{id}/mlbom
  Then the response MUST adhere to the CycloneDX 1.6 JSON schema
  And when the user queries GET /api/v1/artifacts/{id}/compliance
  Then the response MUST return structured status ratings (MET/PARTIAL/GAP) for Articles 10 through 15
```

### AC-08: Tamper-Evident Audit Hash Chain
```gherkin
Scenario: Verifying Audit Chain Integrity
  Given a sequence of recorded quarantine and release events in the database
  When an auditor requests GET /api/v1/audit/verify
  Then the system MUST re-hash each event in chronological order
  And if all hashes match, the endpoint MUST return 'valid: true' and 'verified_events_count: N'
```

---

## 9. Success Metrics & Key Performance Indicators (KPIs)

### 9.1 Security & Efficacy Metrics
| Metric | Description | Target Benchmark |
|---|---|:---:|
| **Detection Rate (Pickle Exploit)** | Precision on detecting arbitrary code execution opcodes in malicious checkpoints. | **100%** (Zero false negatives on test suite) |
| **Zero Execution Security** | Incidents of arbitrary code execution or server compromise during scans. | **0 Incidents** |
| **False Positive Rate** | Rate of benign models (e.g., standard SafeTensors/PyTorch weights) incorrectly flagged as Critical. | **< 3%** |

### 9.2 Performance & Latency Metrics
| Metric | Description | Target Benchmark |
|---|---|:---:|
| **Model Scan Latency** | Time to complete static opcode scan on a 50 MB model checkpoint. | **< 10 seconds** |
| **Dataset Scan Latency** | Time to perform statistical distribution & outlier analysis on a 10 MB CSV. | **< 5 seconds** |
| **Dashboard Response Time** | P95 latency for loading scan history and scan detail pages. | **< 1.5 seconds** |

### 9.3 Quality & Reliability Metrics
| Metric | Description | Target Benchmark |
|---|---|:---:|
| **Test Coverage** | Automated backend unit/integration tests passing. | **100% Pass** (≥ 95 tests) |
| **API Availability** | Uptime of the FastAPI backend during operational hours. | **≥ 99.5%** |
| **Zero Database Dependency** | Ability to operate in Standalone Mode without external database setup. | **Fully Functional** |

---

## 10. Technical Assumptions & System Constraints

### 10.1 Assumptions
1. **Static Analysis Sufficiency:** Static bytecode parsing and mathematical heuristics provide sufficient fidelity for pre-deployment screening without requiring dynamic payload execution.
2. **User Knowledge:** Users possess basic familiarity with AI/ML concepts (model checkpoints, training datasets, package manifests).
3. **Curated Vulnerability Feed:** Dependency vulnerability detection relies on an embedded, validated JSON catalog of AI package CVEs for MVP, with optional live OSV.dev querying.
4. **Standard File Formats:** Artifacts conform to standard industry container formats (Pickle, SafeTensors, ONNX, CSV, Parquet).

### 10.2 Constraints
1. **File Size Boundaries:** Individual upload size is constrained to **100 MB** in the default deployment configuration to prevent denial-of-service (DoS) on shared host memory.
2. **Execution Environment:** Backend operates on Python 3.12+; Frontend requires Node.js 18+ / modern browsers supporting ES2022 and Server-Sent Events.
3. **No GPU Requirement:** All scanning engines, statistical computations, and risk scoring routines run strictly on standard CPU infrastructure without requiring dedicated GPU acceleration.
4. **Isolated Storage Architecture:** Artifacts are strictly stored outside the web server root with sanitized UUID filenames to completely prevent path traversal (`../`) attacks.

---

## 11. Risks & Mitigation Strategies

| Risk ID | Risk Description | Likelihood | Impact | Mitigation Strategy |
|:---:|---|:---:|:---:|---|
| **R-1** | **Host Compromise via Malicious File Load** | Low | Critical | **Enforced Zero-Execution Rule:** Code uses `pickletools.genops()` stream reader and pure byte parsing. Explicitly forbid `pickle.load()` or `import`. |
| **R-2** | **Denial of Service via Giant File Uploads** | Medium | High | **Upload Size Throttling:** Strict 100 MB payload limit enforced at both web reverse-proxy (Nginx/Vite) and FastAPI middleware layers. |
| **R-3** | **High False Positive Rate on Datasets** | Medium | Medium | **Configurable Sensitivity Thresholds:** Outlier detection relies on robust z-scores ($|z| > 3.0$) and requires both distribution skew and missing value anomalies to trigger high severity. |
| **R-4** | **Obfuscated Pickle Opcodes** | Low | High | **Opcode Whitelist / Blacklist Hybrid:** Flag unknown or malformed opcode structures as high-risk anomalies requiring manual analyst review. |
| **R-5** | **Stale Local Vulnerability Catalog** | Medium | Medium | **Modular Vulnerability Provider:** Abstract vulnerability lookup into a provider interface so updating `vulnerable_packages.json` or attaching live OSV.dev APIs requires zero engine modifications. |

---

## 12. Out-of-Scope Features (Anti-Goals)

To keep the MVP strictly focused on its core mission and prevent feature creep, the following capabilities are **explicitly out of scope** for Phase 1:

1. **Live Runtime Inference Monitoring:** AISecGuard Phase 1 is a **pre-deployment gateway**, not a runtime inference filter. Live model drift, prediction distribution monitoring, and live inference firewalls are reserved for Phase 2.
2. **Dynamic Malware Sandboxing / Detonation:** Uploaded artifacts are never booted in a virtual machine or container to observe runtime behavior.
3. **Automated Model Retraining & Poison Cleaning:** The framework flags and quarantines poisoned datasets or compromised weights; it does not automatically re-train models or impute synthetic data.
4. **LLM Prompt Injection / Jailbreak Guardrails:** Interactive conversational guardrails (e.g., Llama-Guard, NeMo Guardrails) target prompt engineering and inference dialogue, which is distinct from supply chain artifact security.
5. **Hardware Accelerator Security:** Security checks for GPU firmware, CUDA runtime driver integrity, and TPU microcode are excluded.
6. **Multi-Tenant Enterprise RBAC / SSO:** Complex organizational hierarchy, SAML/Okta single sign-on, and fine-grained department-level tenant isolation are reserved for enterprise iterations.

---

## 13. Release Sign-Off & Verification

| Milestone / Gate | Criteria | Status | Verified By |
|---|---|:---:|---|
| **M1: Core Engine Verification** | 100% detection of dangerous pickle opcodes across sample fixtures (`sample_model.pkl`). | Complete | Lead Developer |
| **M2: Test Suite Health** | > 95 PyTest backend unit/integration tests passing without failures. | Complete | CI Automation |
| **M3: Frontend-Backend Telemetry** | SSE live status stream functional from ingestion to completion without socket drops. | Complete | QA / Evaluator |
| **M4: Quarantine Containment** | Physical relocation to quarantine directory verified with 403 Forbidden enforcement on access. | Complete | Security Architect |
| **M5: Lineage & Signing Verification** | Multi-hop DAG upstream risk propagation (LIN-001) and Ed25519 signing verified. | Complete | Security Architect |
| **M6: Compliance & Executive Export** | CycloneDX 1.6 ML-BOM, EU AI Act mapping, JSON v2.0, and ReportLab PDF generated. | Complete | Project Review Committee |

---
*Document maintained under the AISecGuard Framework Project Repository.*
