# Software Requirements Specification (SRS)

**Project:** AISecGuard — Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Document Identifier:** ASG-SRS-V1.0  
**Version:** 1.0.0  
**Standard Compliance:** IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018  
**Status:** Approved / Engineering Baseline  
**Target Milestone:** Minimum Viable Product (MVP) & Research Phase 1  
**Author:** MCA 3rd Semester Project Team  

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the complete functional, non-functional, data, and security requirements for **AISecGuard**, an automated framework designed to inspect, evaluate, sign, and contain Artificial Intelligence and Machine Learning (AI/ML) supply chain artifacts. This document serves as the definitive reference for developers, security auditors, evaluators, and system architects.

### 1.2 Scope of the System
AISecGuard provides an automated pre-deployment security inspection gateway. The system analyzes:
1. **Serialized AI Model Checkpoints** (`.pkl`, `.pt`, `.onnx`, `.safetensors`, `.joblib`, `.h5`, `.bin`, `.zip`).
2. **Tabular Training & Validation Datasets** (`.csv`, `.parquet`, `.json`, `.jsonl`).
3. **Environment Dependency Manifests** (`requirements.txt`, `pyproject.toml`).
4. **Multi-Hop Supply Chain Lineage** (Directed Acyclic Graph linking datasets, base models, and dependencies).

AISecGuard enforces the **Zero-Code-Execution (Static Analysis Guarantee)**: untrusted files are analyzed exclusively via byte offsets, opcode streams, and mathematical statistics without ever importing, instantiating, or executing code.

### 1.3 Definitions, Acronyms, and Abbreviations
| Term | Definition |
|---|---|
| **AI-BOM / ML-BOM** | Machine Learning Bill of Materials (CycloneDX 1.6 standard). |
| **CVE** | Common Vulnerabilities and Exposures. |
| **DAG** | Directed Acyclic Graph representing artifact parent-child relationships. |
| **Ed25519** | High-speed, high-security Edwards-curve digital signature algorithm. |
| **JWT** | JSON Web Token (RFC 7519) used for stateless API authentication. |
| **Opcode** | Machine/bytecode instruction in serialized Python pickle streams. |
| **OSV** | Open Source Vulnerabilities distributed database (osv.dev). |
| **RBAC** | Role-Based Access Control. |
| **RCE** | Remote Code Execution. |
| **SHA-256** | Secure Hash Algorithm generating a 256-bit (64 hex characters) digest. |
| **SSE** | Server-Sent Events (W3C standard) for real-time one-way telemetry. |
| **TVD** | Total Variation Distance (statistical divergence metric for distributions). |

---

## 2. Overall System Description & Operational Modes

### 2.1 System Architecture Overview

```
                                USER / CI-CD PIPELINE
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    FastAPI Gateway & Auth Layer        │
                      │  JWT / Bcrypt • API Keys • Rate Limiter │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │        Upload & Provenance Intake      │
                      │  UUID Filename • Streaming SHA-256     │
                      └───────────────────┬────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              ▼                           ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
    │  Model Scanner   │        │ Dataset Scanner  │        │Dependency Scanner│
    │  Opcode Parsing  │        │ Z-Score Outliers │        │  CVEs & Typos    │
    │  Format Safety   │        │  Label Skew/TVD  │        │ Manifest Parser  │
    └─────────┬────────┘        └─────────┬────────┘        └─────────┬────────┘
              │                           │                           │
              └───────────────────────────┼───────────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Lineage & Upstream Risk Engine      │
                      │  DAG Evaluator (Rule LIN-001 Cascading)│
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Central Risk Engine (0-10 Scale)    │
                      │  Categorical Severity & Deterministics │
                      └───────────────────┬────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
          ┌───────────────────────────┐       ┌───────────────────────────┐
          │  Automated Mitigation     │       │  Governance & Compliance  │
          │  Quarantine Isolation     │       │  Ed25519 Signing          │
          │  Tamper-Evident Hash Chain│       │  CycloneDX 1.6 ML-BOM     │
          │  Administrative Releases  │       │  EU AI Act Art. 10-15 Map │
          └───────────────────────────┘       └───────────────────────────┘
```

### 2.2 Dual Operational Modes
To support both zero-dependency local evaluation and high-assurance enterprise deployment, the system shall operate in two distinct modes configured via environment variables:

1. **Standalone / Zero-Database Mode (`NO_LOGIN_REQUIRED=True`):**
   - Database: In-memory SQLite (`sqlite:///:memory:`).
   - Authentication: Automatically injects a virtual `Local Security Analyst` (`local-analyst`) principal with full administrative rights.
   - Persistence: Local client-side storage cache (`deviceCache.js`) and transient memory. Zero external database configuration required.
2. **Enterprise Relational Mode (`NO_LOGIN_REQUIRED=False`):**
   - Database: Persistent SQLite (`sqlite:///./aisecguard_dev.db`) or PostgreSQL 15+ (`postgresql+psycopg2://...`).
   - Authentication: Strict JWT Bearer Token authentication (HS256) or Developer API Keys (`X-API-Key`).
   - Access Control: Enforces strict Role-Based Access Control (RBAC).

---

## 3. User Roles, Personas & Permission Matrix

### 3.1 User Roles
The system defines four distinct actor classifications:
1. **Administrator (`ADMIN`):** Manages user accounts, revokes API keys, modifies global system settings, releases quarantined artifacts, and configures signing keys.
2. **Security Analyst (`ANALYST`):** Uploads artifacts, triggers scans, inspects vulnerability findings, initiates manual quarantine, manages lineage connections, and signs verified clean models.
3. **Auditor (`AUDITOR`):** Read-only governance officer who reviews scan findings, inspects provenance records, verifies cryptographic audit hash chains, and exports ML-BOMs / EU AI Act compliance evidence.
4. **CI/CD System Agent (`SYSTEM_AGENT`):** Automated headless service authenticating via an API key (`X-API-Key: asg_...`) to submit artifacts and retrieve scan results during automated build pipelines.

### 3.2 Granular RBAC Permission Matrix

| Module / Action | Anonymous | AUDITOR | ANALYST | ADMIN | SYSTEM_AGENT (API Key) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Health & Public Key (`/health`, `/signing/public-key`)** | Read | Read | Read | Read | Read |
| **Upload Artifact (`POST /artifacts/upload`)** | Denied* | Denied | Create | Create | Create |
| **View Artifacts & Baselines (`GET /artifacts`)** | Denied* | Read | Read | Read | Read |
| **Execute Scan (`POST /scans/{id}/start`)** | Denied* | Denied | Execute | Execute | Execute |
| **Read Scan Results & Findings** | Denied* | Read | Read | Read | Read |
| **Quarantine Artifact (`POST /artifacts/{id}/quarantine`)** | Denied* | Denied | Execute | Execute | Denied |
| **Release Quarantined Artifact (`POST /artifacts/{id}/release`)** | Denied* | Denied | Execute | Execute | Denied |
| **Link Lineage DAG (`POST /lineage`)** | Denied* | Denied | Create | Create | Create |
| **Delete Lineage Edge (`DELETE /lineage/{id}`)** | Denied* | Denied | Delete | Delete | Denied |
| **Digitally Sign Model (`POST /artifacts/{id}/sign`)** | Denied* | Denied | Create | Create | Denied |
| **Export ML-BOM & Compliance Evidence** | Denied* | Read | Read | Read | Read |
| **Verify Audit Hash Chain (`GET /audit/verify`)** | Denied* | Read | Read | Read | Read |
| **Generate / Revoke API Keys (`/api-keys`)** | Denied* | Denied | Manage (Own) | Manage (All) | Denied |
| **User Account Administration** | Denied* | Denied | Denied | Full CRUD | Denied |

*\*Note: In Standalone Mode (`NO_LOGIN_REQUIRED=True`), unauthenticated calls are automatically mapped to the Local Analyst principal, enabling full access for local demonstration.*

---

## 4. Functional Requirements

### 4.1 Artifact Ingestion & Integrity Module

#### FR-01: Multipart Artifact Upload
- **Description:** The system shall accept file uploads representing AI models, datasets, or dependency manifests via multipart form data (`POST /api/v1/artifacts/upload`).
- **Inputs:** Binary file payload, optional `source_url` (string, max 500 chars), optional `expected_sha256` (string, 64 hex characters).
- **Processing:**
  1. Validate that the original filename is present and does not contain path traversal sequences (`../`, `..\`).
  2. Map the file extension to a valid `ArtifactType` (`MODEL`, `DATASET`, `DEPENDENCY`).
  3. Validate that file content length is greater than 0 bytes and does not exceed `MAX_UPLOAD_SIZE_MB` (default: 100 MB).
  4. Generate a cryptographically random UUIDv4 identifier.
  5. Save the file to disk using the UUID as the storage filename.
  6. Compute streaming SHA-256 hash across raw file bytes.
  7. If `expected_sha256` is supplied, perform a case-insensitive comparison against the computed digest.
- **Outputs:** HTTP 201 Created with JSON payload containing `id`, `filename`, `artifact_type`, `file_size`, `sha256_hash`, and initial status `UPLOADED`.
- **Error Conditions:**
  - Missing filename $\rightarrow$ HTTP 400 Bad Request.
  - Unsupported extension $\rightarrow$ HTTP 400 Bad Request.
  - 0-byte file $\rightarrow$ HTTP 400 Bad Request.
  - Invalid `expected_sha256` format $\rightarrow$ HTTP 400 Bad Request.
  - File size $> 100$ MB $\rightarrow$ HTTP 413 Payload Too Large.
- **Verification:** Unit test with empty file, oversize file, traversal names, and valid uploads.

#### FR-02: Cryptographic Provenance Baseline Recording
- **Description:** Upon upload, the system shall create an immutable `ProvenanceRecord` in the database.
- **Inputs:** `artifact_id`, `sha256_hash`, `expected_sha256`, `source_url`, `uploader_id`.
- **Processing:** Record ingestion timestamp, initial file size, and SHA-256 digest. If `expected_sha256` does not match `sha256_hash`, flag `PROV-002` (HIGH severity).
- **Outputs:** Database entity persisted with foreign key reference to `Artifact`.
- **Verification:** Query provenance table immediately following upload; verify hash accuracy against standard `sha256sum`.

---

### 4.2 Static Security Scanning Engines

#### FR-03: Zero-Execution Model Security Scanner
- **Description:** The system shall perform static analysis on model files without loading, executing, or unpickling them into Python memory.
- **Inputs:** Physical file path of uploaded model artifact.
- **Processing:**
  1. **Pickle Bytecode Disassembly:** Utilize `pickletools.genops()` to stream raw opcodes from `.pkl`, `.joblib`, `.pt`, `.bin`.
  2. **Dangerous Opcode Interception:** Detect execution opcodes (`GLOBAL`, `STACK_GLOBAL`, `REDUCE`, `BUILD`, `INST`, `OBJ`, `NEWOBJ`).
  3. **Symbol Blacklist Matching:** Match imported modules and function names against dangerous namespaces:
     - Remote Shell / Commands: `os.system`, `posix.system`, `subprocess.Popen`, `subprocess.call`, `os.popen`, `pty.spawn`.
     - Code Evaluation: `builtins.eval`, `builtins.exec`, `__builtin__.compile`.
     - Network Communication: `socket.socket`, `urllib.request.urlopen`, `http.client.HTTPConnection`.
     - File System Write / Delete: `os.remove`, `os.unlink`, `shutil.rmtree`.
  4. **PyTorch Specific Validation:** Detect whether PyTorch `.pt` or `.pth` checkpoints contain serialized Python code or lack `weights_only=True` compatible structures.
  5. **Safe Format Promotion:** Validate safe tensor weights (`.safetensors`, `.onnx`). SafeTensors files shall be verified to contain standard JSON header metadata followed by raw binary tensor buffers, with zero executable bytecode.
- **Outputs:** List of `Finding` objects (`rule_id`, `severity`, `finding_type`, `title`, `description`, `details`, `remediation`).
- **Severity Allocation:**
  - Arbitrary code execution symbol detected $\rightarrow$ `CRITICAL` (FindingType: `UNSAFE_SERIALIZATION`).
  - PyTorch unsafe serialization $\rightarrow$ `HIGH` (FindingType: `UNSAFE_SERIALIZATION`).
  - Legacy format without safe alternative $\rightarrow$ `LOW` / `INFORMATIONAL` (FindingType: `STRUCTURAL_ANOMALY`).
- **Verification:** Run scanner against malicious pickle fixtures containing `os.system('id')`; assert finding is created and zero host execution occurs.

#### FR-04: Statistical Tabular Dataset Security Scanner
- **Description:** The system shall analyze tabular datasets to detect structural corruption, anomalous distributions, and statistical indicators of data poisoning.
- **Inputs:** File path to dataset (`.csv`, `.parquet`, `.json`, `.jsonl`).
- **Processing:**
  1. Parse dataset into structured tabular format using static streaming parsers (`pandas` / `pyarrow`).
  2. **Schema & Integrity Analysis:** Check for empty datasets, single-column files, malformed rows, and high duplicate row ratios ($>10\%$).
  3. **Missing Value Ratio:** Compute percentage of `NaN` / `null` values per column. If any column exceeds 20% missing values, generate a `MEDIUM` finding.
  4. **Outlier Detection via Z-Scores:** For numeric columns, compute mean ($\mu$) and standard deviation ($\sigma$). Flag records where $|z| = \frac{|x - \mu|}{\sigma} > 3.0$ as outliers, and $|z| > 5.0$ as extreme anomalies.
  5. **Class Imbalance & Label Entropy:** For categorical and classification label columns, compute class frequency distribution and Shannon entropy:
     $$H(X) = -\sum_{i=1}^{k} P(x_i) \log_2 P(x_i)$$
     Flag severe class collapse where the dominant class exceeds 90% of samples in multi-class datasets.
- **Outputs:** List of `Finding` objects classified under `DATA_POISONING_INDICATOR` or `STRUCTURAL_ANOMALY`.
- **Verification:** Execute scanner on synthetic dataset containing injected $|z|=6.2$ outliers and 35% nulls; verify generated findings.

#### FR-05: AI Framework & Dependency Auditor
- **Description:** The system shall parse environment dependency manifests to detect vulnerable packages, unpinned versions, permissive ranges, and typosquatting attacks.
- **Inputs:** File path to `requirements.txt` or `pyproject.toml`.
- **Processing:**
  1. Extract package specifications using standard PEP 508 parsing.
  2. **Unpinned Version Rule (`DEP-001`):** Flag packages without explicit pinning (`==`) as `MEDIUM` severity.
  3. **Permissive Range Rule (`DEP-002`):** Flag unbounded ranges (`>=`, `*`) as `LOW` severity.
  4. **Typosquatting Heuristics (`DEP-003`):** Compute normalized Levenshtein distance between extracted package names and popular ML libraries (`torch`, `tensorflow`, `numpy`, `scipy`, `pandas`, `scikit-learn`, `transformers`). If $1 \le \text{dist} \le 2$ and the name is not in the official whitelist, flag as `HIGH` severity.
  5. **Known Vulnerability Matching (`DEP-007`):** Correlate pinned versions against local curated vulnerability catalog (`vulnerable_packages.json`). If `OSV_LOOKUP_ENABLED=True`, query OSV.dev REST API asynchronously with a 5.0-second timeout.
- **Outputs:** List of `Finding` objects with CVE identifiers, affected version ranges, and fixed version recommendations.
- **Verification:** Audit manifest containing `requrirements` typosquat and unpinned `torch`; verify `DEP-001` and `DEP-003` findings fire.

---

### 4.3 Lineage & Governance Module

#### FR-06: Multi-Hop Lineage Directed Acyclic Graph (DAG)
- **Description:** The system shall maintain parent-child relationships between AI artifacts and evaluate multi-hop supply chain risk propagation.
- **Inputs:** `parent_id`, `child_id`, `relation` (Enum: `TRAINED_ON`, `FINE_TUNED_FROM`, `DERIVED_FROM`, `DEPENDS_ON`), optional `note`.
- **Processing:**
  1. Verify both parent and child artifacts exist in the database.
  2. Reject self-referencing links (`parent_id == child_id`).
  3. Traverse existing graph using Depth-First Search (DFS) to detect circular dependencies. Reject link if a cycle is detected.
  4. Persist `LineageEdge` record.
- **Outputs:** HTTP 201 Created with JSON graph representation.
- **Error Conditions:** Missing artifact $\rightarrow$ HTTP 404; Cycle detected $\rightarrow$ HTTP 400 Bad Request.
- **Verification:** Construct a 3-node graph (Dataset $\rightarrow$ Base Model $\rightarrow$ Fine-tuned Model); assert traversal returns correct topological order. Attempt circular link and assert rejection.

#### FR-07: Cascading Upstream Contamination (Rule LIN-001)
- **Description:** When evaluating an artifact, the lineage engine shall traverse up to 5 parent hops upstream. If any ancestor artifact is in `QUARANTINED` status or has an overall risk score of `HIGH` or `CRITICAL`, the system shall generate a `HIGH` severity finding (`LIN-001`) on the target child artifact.
- **Inputs:** `artifact_id`.
- **Outputs:** `Finding` of type `UPSTREAM_RISK` identifying the compromised ancestor ID and distance.
- **Verification:** Quarantine a root dataset; trigger scan on descendant model 2 hops away; verify `LIN-001` fires.

#### FR-08: Cryptographic Model Signing (Ed25519)
- **Description:** The system shall allow authorized security analysts to digitally sign approved, low-risk model artifacts using an asymmetric Ed25519 key.
- **Inputs:** `artifact_id`, authenticated user principal.
- **Preconditions:**
  1. Artifact status must be `SCANNED`.
  2. Artifact overall risk level must be `LOW` or `MEDIUM` (score $< 15$).
  3. Artifact must NOT be in `QUARANTINED` status.
  4. Artifact must NOT have active `LIN-001` upstream risk findings.
- **Processing:**
  1. Retrieve active Ed25519 private key from secure path (`SIGNING_KEY_PATH`).
  2. Compute SHA-256 digest of artifact.
  3. Generate cryptographic signature over digest using Ed25519 private key.
  4. Persist `SignatureRecord` containing public key ID, signature hex, and timestamp.
- **Outputs:** HTTP 200 OK with signature verification details.
- **Error Conditions:** Attempting to sign quarantined or high-risk artifact $\rightarrow$ HTTP 400 Bad Request.
- **Verification:** Sign clean model; verify signature via `/api/v1/artifacts/{id}/signature`. Attempt signing a quarantined model; assert HTTP 400.

#### FR-09: Automated CycloneDX 1.6 ML-BOM Export
- **Description:** The system shall compile and export a Machine Learning Bill of Materials adhering to the CycloneDX 1.6 JSON specification (`GET /api/v1/artifacts/{id}/mlbom`).
- **Outputs:** Standard JSON document containing:
  - `bomFormat`: `"CycloneDX"`, `specVersion`: `"1.6"`.
  - Metadata: Target component name, version, SHA-256 hash.
  - Model parameters: Architecture, inputs, outputs, format.
  - Lineage components: Upstream datasets (`TRAINED_ON`), base checkpoints (`FINE_TUNED_FROM`).
  - Dependencies: Third-party Python libraries with package hashes.
  - Cryptographic signatures: Ed25519 signature object if signed.
- **Verification:** Validate generated ML-BOM output against official CycloneDX 1.6 JSON Schema validator.

#### FR-09B: Automated Regulatory Compliance Engine (EU AI Act)
- **Description:** The system shall map technical scan findings to requirements of the **EU AI Act (Regulation 2024/1689)** Articles 10 through 15 (`GET /api/v1/artifacts/{id}/compliance`).
- **Processing:** Evaluate technical evidence per article:
  - **Article 10 (Data Governance):** Evaluates dataset scan, missing values, poisoning indicators.
  - **Article 11 (Technical Documentation):** Checks availability of ML-BOM and model card.
  - **Article 12 (Record-Keeping):** Verifies existence of provenance records and audit trails.
  - **Article 14 (Human Oversight):** Checks quarantine override controls and administrative approval logs.
  - **Article 15 (Accuracy, Robustness & Cybersecurity):** Evaluates model opcode security, hash verification, and dependency CVEs.
- **Outputs:** JSON report assigning status `MET`, `PARTIAL`, `GAP`, or `NOT_APPLICABLE` with specific technical justifications for each article.
- **Verification:** Query endpoint for clean model vs. high-risk model; verify status shifts from `MET` to `GAP`.

---

### 4.4 Risk Assessment & Mitigation Module

#### FR-10: Central Deterministic Risk Scoring
- **Description:** The system shall compute an aggregated, explainable risk score (0 to $\ge 30$) and categorical severity level for each completed scan.
- **Scoring Weights:**
  - `INFORMATIONAL`: 0 points
  - `LOW`: 1 point
  - `MEDIUM`: 3 points
  - `HIGH`: 6 points
  - `CRITICAL`: 10 points
- **Threat Level Mapping:**
  - Score $0 - 4 \rightarrow$ **`LOW`** (Safe / Clean)
  - Score $5 - 14 \rightarrow$ **`MEDIUM`** (Review Recommended)
  - Score $15 - 29 \rightarrow$ **`HIGH`** (Quarantine Recommended)
  - Score $\ge 30 \rightarrow$ **`CRITICAL`** (Immediate Quarantine Required)
- **Deterministic Overrides:**
  1. If any single finding is `CRITICAL`, minimum risk level is elevated to `HIGH` regardless of score.
  2. If 2 or more findings are `CRITICAL`, overall risk level is guaranteed `CRITICAL`.
- **Outputs:** `RiskAssessmentResult` with numeric score, categorical level, finding counts, and human-readable explanation.
- **Verification:** Pass list of findings (1 Critical, 1 Low = 11 pts) $\rightarrow$ assert Risk Level is `HIGH` due to override.

#### FR-11: Physical Directory Quarantine & Containment
- **Description:** The system shall physically isolate hazardous artifacts from active operational directories into a restricted quarantine partition (`POST /api/v1/artifacts/{id}/quarantine`).
- **Processing:**
  1. Update `Artifact.status` to `QUARANTINED`.
  2. Physically move file on disk from `uploads/` to `uploads/quarantine/`.
  3. Create an immutable `QuarantineEvent` record.
  4. Block all standard download and export endpoints for this artifact (return HTTP 403 Forbidden).
- **Release Workflow:** Releasing an artifact (`POST /api/v1/artifacts/{id}/release`) requires an authenticated `ADMIN` or `ANALYST`, an explicit text reason ($\ge 10$ characters), moves file back to `uploads/`, updates status to `SCANNED`, and logs a release audit event.
- **Verification:** Quarantine artifact; attempt download $\rightarrow$ assert HTTP 403; assert file exists in `uploads/quarantine/`. Release artifact $\rightarrow$ assert file restored and download works.

#### FR-12: Tamper-Evident Audit Hash Chain
- **Description:** The system shall maintain an immutable, cryptographic SHA-256 hash chain for all quarantine and administrative events (`QuarantineEvent`).
- **Processing:**
  1. Each event record stores: `event_id`, `artifact_id`, `action`, `reason`, `user_id`, `timestamp`, `previous_hash`, `event_hash`.
  2. For event $n$, the event hash is computed as:
     $$\text{event\_hash}_n = \text{SHA256}(\text{previous\_hash}_{n-1} \parallel \text{event\_id} \parallel \text{action} \parallel \text{user\_id} \parallel \text{timestamp})$$
  3. Endpoint `GET /api/v1/audit/verify` re-computes the entire chain from genesis ($H_0 = \text{"0" \times 64}$). If any record has been modified or deleted, the endpoint returns `valid: false` with the corrupted event ID.
- **Outputs:** Verification result with chain status and verified event count.
- **Verification:** Log 5 events; call `/audit/verify` $\rightarrow$ assert `valid: true`. Manually mutate 1 row in test DB $\rightarrow$ assert `/audit/verify` returns `valid: false`.

---

### 4.5 Telemetry, Reporting & API Key Module

#### FR-13: Real-Time SSE Telemetry Stream
- **Description:** The backend shall expose a Server-Sent Events (SSE) endpoint (`GET /api/v1/scans/{id}/status`) streaming live scan progress to the client web application.
- **Events Emitted:**
  1. `QUEUED` (Progress: 20%)
  2. `PROVENANCE_CHECK` (Progress: 40%)
  3. `SCANNER_RUNNING` (Progress: 70%)
  4. `RISK_CALC` (Progress: 90%)
  5. `COMPLETED` (Progress: 100%)
- **Outputs:** Event stream conforming to `text/event-stream` MIME specification.
- **Verification:** Connect EventSource client to scan endpoint; verify all 5 status transitions are received in order.

#### FR-14: Dual Format Security Reporting
- **Description:** The system shall generate comprehensive security remediation reports in both machine-actionable JSON (v2.0) and executive PDF formats.
- **PDF Contents (ReportLab):**
  - Header: AISecGuard logo, document title, generation timestamp.
  - Section 1: Executive Summary with 0–10 risk score and color-coded severity banner.
  - Section 2: Artifact Provenance Metadata (Filename, UUID, SHA-256, File Size, Origin).
  - Section 3: Findings Table (Rule ID, Finding Type, Severity, Title).
  - Section 4: Detailed Remediation Directives (Code samples, recommended package versions, SafeTensors conversion guidance).
- **Outputs:** `GET /api/v1/scans/{id}/report/pdf` returning binary PDF (`application/pdf`).
- **Verification:** Trigger PDF report generation; assert binary output begins with `%PDF-` header and contains all required sections.

#### FR-15: Programmatic Developer API Key Management
- **Description:** The system shall allow authorized users to generate, view, and revoke API keys for automated CI/CD pipeline gating (`/api/v1/api-keys`).
- **Processing:**
  1. Key Format: `asg_` followed by 32 cryptographically random alphanumeric characters (`asg_<32_chars>`).
  2. Key Prefix: First 8 characters are stored in plain text for UI display.
  3. Key Secret: The full key is hashed using SHA-256 before database storage. The raw secret is returned **only once** upon creation.
  4. Authentication: Incoming requests with header `X-API-Key` have their token hashed and matched against active records.
- **Outputs:** HTTP 201 Created with single-view secret token.
- **Verification:** Create API key; execute authenticated upload using `X-API-Key`; revoke key; execute request again and assert HTTP 401 Unauthorized.

---

## 5. Business Rules

| Rule ID | Name | Statement | Enforcement Point |
|---|---|---|---|
| **BR-01** | **Zero Execution Guarantee** | Under no circumstance shall any scanner invoke `pickle.load()`, `eval()`, `exec()`, `importlib.import_module()`, or `torch.load(weights_only=False)`. All inspections must be strictly static. | Scanner Registry & Engine Execution |
| **BR-02** | **Deterministic Severity Overrides** | Any scan with $\ge 1$ `CRITICAL` finding must be assigned a minimum overall risk level of `HIGH`. Any scan with $\ge 2$ `CRITICAL` findings must be assigned `CRITICAL`. | `app.services.risk_engine` |
| **BR-03** | **Quarantine Inviolability** | Quarantined artifacts are strictly blocked from public download, pipeline export, or digital signing. Public download requests must return HTTP 403 Forbidden. | Artifact API & Storage Controllers |
| **BR-04** | **Digital Signing Preconditions** | An artifact may ONLY be signed if: (a) status is `SCANNED`, (b) risk level is `LOW` or `MEDIUM`, (c) it is not quarantined, and (d) it has no active `LIN-001` upstream risk findings. | `app.services.signing_service` |
| **BR-05** | **Lineage Contamination Propagation** | If an upstream ancestor up to 5 hops away is quarantined or scored `HIGH`/`CRITICAL`, rule `LIN-001` must fire on all downstream descendants. | `app.services.lineage_service` |
| **BR-06** | **Strict Acyclic Graph Constraint** | Artifact lineage graphs must be strictly Directed Acyclic Graphs (DAG). Self-referencing links and cycles are rejected. | Lineage API Endpoints |
| **BR-07** | **Offline-First Resilience** | Inability to reach external network services (e.g., OSV.dev timeout) must NEVER fail a scan. The system must degrade gracefully to local offline vulnerability catalogs. | Dependency Scanner Runner |
| **BR-08** | **Immutable Audit Log Policy** | Audit records (`QuarantineEvent`) are strictly append-only. No endpoint shall support updating or deleting existing audit rows. | Database ORM & API Routers |
| **BR-09** | **Zero-Knowledge Secret Storage** | Passwords must be hashed using bcrypt with salt rounds $\ge 12$. API keys must be stored strictly as SHA-256 hashes. Plaintext secrets are never stored. | Auth & API Key Services |
| **BR-10** | **File Size Hard Ceiling** | No uploaded file may exceed `MAX_UPLOAD_SIZE_MB` (100 MB). Over-capacity streams must be aborted immediately before consuming host memory. | Upload Middleware |

---

## 6. Data Requirements & Entity Schema Specifications

### 6.1 Entity-Relationship Model

```
 ┌──────────────┐          ┌──────────────────────┐          ┌─────────────────────┐
 │     User     │1        *│       Artifact       │1        1│  ProvenanceRecord   │
 │──────────────│──────────│──────────────────────│──────────│─────────────────────│
 │ id (UUID)    │          │ id (UUID)            │          │ id (UUID)           │
 │ email        │          │ filename             │          │ artifact_id (FK)    │
 │ hashed_pass  │          │ original_filename    │          │ sha256_hash         │
 │ role (ENUM)  │          │ artifact_type (ENUM) │          │ expected_sha256     │
 │ is_active    │          │ file_size            │          │ source_url          │
 └──────┬───────┘          │ status (ENUM)        │          │ recorded_at         │
        │                  └──────────┬───────────┘          └─────────────────────┘
        │                             │
        │1                            │1
        │                             ├──────────────────────┬─────────────────────┐
        │*                            │*                     │*                    │*
 ┌──────┴───────┐          ┌──────────┴───────────┐   ┌──────┴──────────────┐┌─────┴──────────────┐
 │    ApiKey    │          │         Scan         │   │   QuarantineEvent   ││  SignatureRecord   │
 │──────────────│          │──────────────────────│   │─────────────────────││────────────────────│
 │ id (UUID)    │          │ id (UUID)            │   │ id (UUID)           ││ id (UUID)          │
 │ user_id (FK) │          │ artifact_id (FK)     │   │ artifact_id (FK)    ││ artifact_id (FK)   │
 │ key_prefix   │          │ risk_score (INT)     │   │ action (ENUM)       ││ signed_by (FK)     │
 │ hashed_key   │          │ risk_level (ENUM)    │   │ reason              ││ signature (HEX)    │
 │ is_revoked   │          │ status (ENUM)        │   │ user_id (FK)        ││ public_key_id      │
 └──────────────┘          └──────────┬───────────┘   │ previous_hash       ││ signed_at          │
                                      │1              │ event_hash          │└────────────────────┘
                                      │*              └─────────────────────┘
                           ┌──────────┴───────────┐
                           │       Finding        │
                           │──────────────────────│
                           │ id (UUID)            │
                           │ scan_id (FK)         │
                           │ rule_id (VARCHAR)    │
                           │ severity (ENUM)      │
                           │ finding_type (ENUM)  │
                           │ title                │
                           │ details (JSON)       │
                           └──────────────────────┘
```

### 6.2 Data Dictionaries

#### Entity: `Artifact`
- `id` (String, Primary Key, UUIDv4, Indexed)
- `filename` (String, max 255 chars, sanitized UUID storage name)
- `original_filename` (String, max 255 chars, original uploaded name)
- `artifact_type` (Enum: `MODEL`, `DATASET`, `DEPENDENCY`, `OTHER`)
- `file_size` (Integer, bytes)
- `file_path` (String, max 500 chars, relative storage path)
- `status` (Enum: `UPLOADED`, `PENDING_SCAN`, `SCANNING`, `SCANNED`, `QUARANTINED`, `FAILED`)
- `created_at` (DateTime, UTC, auto-generated)

#### Entity: `Finding`
- `id` (String, Primary Key, UUIDv4)
- `scan_id` (String, Foreign Key $\rightarrow$ `Scan.id`, Indexed, Cascade Delete)
- `rule_id` (String, max 50 chars, e.g., `PICKLE-001`, `LIN-001`, `DEP-003`)
- `finding_type` (Enum: `UNSAFE_SERIALIZATION`, `DATA_POISONING_INDICATOR`, `STRUCTURAL_ANOMALY`, `UNPINNED_DEPENDENCY`, `KNOWN_VULNERABILITY`, `UPSTREAM_RISK`)
- `severity` (Enum: `INFORMATIONAL`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, Indexed)
- `title` (String, max 255 chars)
- `description` (Text)
- `details` (JSON / Text, structured diagnostic metrics)
- `remediation` (Text, developer action steps)

#### Entity: `QuarantineEvent`
- `id` (String, Primary Key, UUIDv4)
- `artifact_id` (String, Foreign Key $\rightarrow$ `Artifact.id`, Indexed)
- `action` (Enum: `QUARANTINED`, `RELEASED`)
- `reason` (Text, justification narrative)
- `user_id` (String, Foreign Key $\rightarrow$ `User.id`)
- `previous_hash` (String, 64 hex characters, parent block hash)
- `event_hash` (String, 64 hex characters, SHA-256 block hash)
- `timestamp` (DateTime, UTC, Indexed)

---

## 7. Input Validation & Sanitization Specifications

| Input Field | Validation Rule | Regex / Constraint | Violation Action |
|---|---|---|---|
| **File Name** | Alphanumeric, dots, dashes, underscores. No directory separators (`/`, `\`). | `^[a-zA-Z0-9_\-\. ]+$` | HTTP 400 Bad Request ("Filename contains illegal characters") |
| **File Extension** | Must belong to allowed lists defined in settings. | Extensions: `.pkl`, `.pt`, `.safetensors`, `.onnx`, `.csv`, `.parquet`, `.json`, `.txt`, `.toml`, etc. | HTTP 400 Bad Request ("Unsupported file extension") |
| **File Content** | Byte length must be greater than zero and less than ceiling. | $0 < \text{length} \le 104,857,600$ bytes | HTTP 400 (Empty) or HTTP 413 (Exceeds size ceiling) |
| **Expected SHA-256**| Must be exactly 64 lowercase hexadecimal characters. | `^[0-9a-f]{64}$` | HTTP 400 Bad Request ("expected_sha256 must be 64 hexadecimal characters") |
| **User Email** | Must be a valid email syntax per RFC 5322. | Pydantic `EmailStr` format | HTTP 422 Unprocessable Entity |
| **User Password** | Minimum 8 characters, maximum 128 characters. | $\text{len} \ge 8$ | HTTP 422 Unprocessable Entity |
| **Quarantine Reason**| Minimum 10 characters descriptive text. | $\text{len} \ge 10$ | HTTP 422 Unprocessable Entity ("Reason must be at least 10 characters") |
| **API Key Token** | Starts with `asg_` followed by 32 alphanumeric chars. | `^asg_[a-zA-Z0-9]{32}$` | HTTP 401 Unauthorized ("Invalid API key format") |

---

## 8. Authentication, Authorization & Session Management

### 8.1 JWT Bearer Token Architecture
- **Algorithm:** HMAC-SHA256 (`HS256`).
- **Secret Key:** Injected via `SECRET_KEY` environment variable (minimum 256-bit entropy).
- **Token Claims:**
  - `sub`: User UUID (`id`).
  - `role`: Role string (`ADMIN`, `ANALYST`, `AUDITOR`).
  - `type`: Token category (`access` vs. `refresh`).
  - `exp`: Expiration Unix epoch (Access: 24 hours, Refresh: 7 days).
- **Password Storage:** Salted bcrypt hashing with work factor of 12 rounds (`passlib.context.CryptContext`).

### 8.2 Developer API Key Authentication
- Endpoints accept header: `X-API-Key: asg_...`.
- The system extracts the token, computes `SHA256(token)`, and queries the `ApiKey` table where `hashed_key == computed_hash` and `is_revoked == False`.
- Updates `last_used_at` timestamp asynchronously on successful match.

### 8.3 Standalone Bypass Flow
- If `settings.NO_LOGIN_REQUIRED == True` and neither JWT nor API key is supplied:
  - System dynamically resolves the principal to the deterministic virtual user `local-analyst`.
  - Virtual user is granted `ADMIN` role, allowing single-user desktop exploration without auth configuration.

---

## 9. Error Handling & Resilience Strategy

### 9.1 RFC 7807 Standardized Error Format
All API error responses shall return JSON adhering to the standardized error schema:
```json
{
  "detail": "Descriptive human-readable explanation of error.",
  "status_code": 400,
  "error_code": "ERR_INVALID_FILE_EXTENSION",
  "timestamp": "2026-11-11T22:25:00Z"
}
```

### 9.2 HTTP Status Code Conventions
- `200 OK`: Request succeeded; entity returned.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Input validation failed, malformed data, or illegal business operation.
- `401 Unauthorized`: Missing, expired, or invalid JWT token / API key.
- `403 Forbidden`: Authenticated user lacks required RBAC role, or artifact is quarantined.
- `404 Not Found`: Target resource (artifact, scan, user, lineage edge) does not exist.
- `413 Payload Too Large`: Upload exceeds 100 MB limit.
- `422 Unprocessable Entity`: Pydantic schema validation error.
- `429 Too Many Requests`: Rate limit exceeded (SlowAPI limit triggered).
- `500 Internal Server Error`: Unhandled system exception.

### 9.3 Scanner Exception Isolation (Fault Containment)
Individual scanner execution is wrapped in safe exception barriers (`app.scanners.registry.run_scanner`). If an unexpected crash occurs during opcode disassembly or dataset parsing (e.g., corrupted file buffer or segmentation fault):
1. The scanner runner catches `Exception`.
2. It captures the traceback and converts the crash into a single `ERROR` finding (`STRUCTURAL_ANOMALY`).
3. The scan status transitions to `COMPLETED` (or `FAILED` with explicit error logging).
4. The backend server and adjacent running tasks remain completely healthy and unaffected.

---

## 10. Edge Cases & Boundary Handling

1. **Truncated / Corrupted Pickle Byte Stream:**
   - *Scenario:* File ends prematurely while reading opcodes.
   - *Behavior:* `pickletools.genops()` raises `EOFError` or `ValueError`. The parser catches the error and generates a `MEDIUM` severity `STRUCTURAL_ANOMALY` finding rather than crashing.
2. **Zero-Row or Column-Free CSV / Parquet:**
   - *Scenario:* An empty dataset or a dataset with headers but zero data rows is uploaded.
   - *Behavior:* Dataset scanner catches empty DataFrame, bypasses outlier calculations to prevent division-by-zero, and flags a `STRUCTURAL_ANOMALY` finding.
3. **Cyclic Lineage Dependency:**
   - *Scenario:* User attempts to link A $\rightarrow$ B $\rightarrow$ C $\rightarrow$ A.
   - *Behavior:* DFS cycle detector flags cycle path and rejects the submission with HTTP 400 Bad Request ("Cycle detected: A -> B -> C -> A").
4. **Renamed Binary File Extension:**
   - *Scenario:* An attacker renames a malicious executable `.exe` or `.sh` to `.pkl`.
   - *Behavior:* The model scanner fails to detect valid pickle protocol opcodes at byte offset 0, flags `UNKNOWN_FORMAT` or `MALFORMED_FILE`, and logs a structural risk.
5. **Simultaneous Quarantine Requests (Race Condition):**
   - *Scenario:* Two analysts quarantine the same artifact concurrently.
   - *Behavior:* Database transaction locks ensure idempotent transition. If already `QUARANTINED`, subsequent requests return the existing quarantine record without creating duplicate file moves.

---

## 11. Security Requirements & System Hardening

### 11.1 Zero-Code-Execution Guarantee
The scanning core shall strictly avoid dynamic imports or code evaluation:
- Forbidden functions: `pickle.load()`, `pickle.loads()`, `eval()`, `exec()`, `torch.load(weights_only=False)`, `subprocess.run()`, `os.system()`.
- Static analysis only: Pure byte disassembly, token walking, and statistical aggregation.

### 11.2 Storage Isolation & Path Traversal Prevention
- All uploaded artifacts are stored in `./uploads/` with sanitized, randomized UUIDv4 names (e.g., `uploads/123e4567-e89b-12d3-a456-426614174000.pkl`).
- The original filename is treated strictly as untrusted display metadata and is never used in file system paths.
- The upload directory is isolated outside the web server root.

### 11.3 Rate Limiting & DoS Protection
- Configured via SlowAPI middleware:
  - Artifact Upload: Max 30 uploads per minute per IP.
  - Authentication Login: Max 10 attempts per minute per IP.
  - Public Signature Retrieval: Max 120 requests per minute per IP.

### 11.4 Cryptographic Key Protection
- The Ed25519 private key is generated with standard 256-bit entropy.
- File system permissions for `SIGNING_KEY_PATH` are strictly set to owner read/write only (`0600` on POSIX systems).
- Public verification keys are exposed freely at `/api/v1/signing/public-key`.

---

## 12. Non-Functional & Performance Requirements

### 12.1 Performance & Latency SLAs
| Operation | Dataset / File Size | Maximum Allowed P95 Latency |
|---|---|:---:|
| **Streaming SHA-256 Digest** | 100 MB File | $< 2.0$ seconds |
| **Model Static Opcode Scan** | 50 MB `.pkl` / `.pt` | $< 8.0$ seconds |
| **Dataset Statistical Scan** | 10 MB CSV (100k rows) | $< 4.0$ seconds |
| **Dependency Manifest Scan** | 200 dependencies | $< 1.5$ seconds (Offline) / $< 6.0$s (OSV) |
| **Dashboard Overview API** | 500 scans in database | $< 500$ milliseconds |
| **SSE Stream Connection Time**| EventSource initial handshake | $< 200$ milliseconds |

### 12.2 Resource Efficiency
- **Memory Optimization:** File hashing and uploads utilize chunked streaming (64 KB buffers) to ensure peak RAM usage does not exceed 150 MB per active scan task, even for 100 MB uploads.
- **CPU Scaling:** Scanning tasks execute asynchronously via Python `asyncio` task pools to prevent blocking the Uvicorn HTTP event loop.

### 12.3 Portability & Deployment
- The system must function identically across:
  - Linux (Ubuntu 22.04+, Debian 12, Fedora 39, Arch, WSL2).
  - macOS (Apple Silicon M1-M4 and Intel).
  - Windows (Windows 10/11 native with PowerShell and Docker).
- Python Version: 3.10+ (Developed and verified on Python 3.12).
- Node.js Version: 18+ (Verified on Node 20+ / Vite 6).

---

## 13. Acceptance Criteria & Verification Matrix

The system must satisfy 100% of the following automated verification criteria:

| Requirement ID | Test Identifier | Verification Procedure | Expected Outcome | Status |
|---|---|---|---|:---:|
| **FR-01** | `test_artifact_upload_success` | Upload valid `.pkl` model file via `/upload`. | HTTP 201 Created; SHA-256 digest accurately matches system sha256sum. | Verified |
| **FR-01** | `test_artifact_upload_oversize` | Upload 105 MB synthetic file. | HTTP 413 Payload Too Large returned before file write. | Verified |
| **FR-03** | `test_pickle_rce_detection` | Scan fixture containing `os.system` opcode. | Finding `CRITICAL` severity created; zero host execution; Risk score $\ge 10$. | Verified |
| **FR-03** | `test_safetensors_validation` | Scan legitimate SafeTensors checkpoint. | Scan passes with 0 critical findings; recommended as safe alternative. | Verified |
| **FR-04** | `test_dataset_outlier_detection`| Scan CSV with $|z| = 5.5$ outlier rows. | Finding `DATA_POISONING_INDICATOR` generated with exact z-score details. | Verified |
| **FR-05** | `test_dependency_typosquat` | Audit manifest with package `requrirements`. | Finding `DEP-003` fires with Levenshtein distance match to `requests`. | Verified |
| **FR-06** | `test_lineage_cycle_rejection` | Submit A $\rightarrow$ B and B $\rightarrow$ A links. | Second link rejected with HTTP 400 Bad Request. | Verified |
| **FR-07** | `test_lineage_upstream_risk` | Link Model to Quarantined Dataset. | Rule `LIN-001` fires on Model with `HIGH` severity. | Verified |
| **FR-08** | `test_ed25519_model_signing` | Sign clean scanned model. | Signature record persisted; `/signature` returns `valid: true`. | Verified |
| **FR-08** | `test_blocked_signing_quarantine`| Attempt to sign quarantined model. | HTTP 400 Bad Request; digital signature refused. | Verified |
| **FR-09** | `test_mlbom_generation` | Query `/mlbom` on scanned model. | CycloneDX 1.6 compliant JSON returned containing all upstream links. | Verified |
| **FR-09B**| `test_eu_ai_act_compliance` | Query `/compliance` endpoint. | Status ratings (`MET`, `PARTIAL`, `GAP`) returned for Articles 10-15. | Verified |
| **FR-11** | `test_quarantine_isolation` | Quarantine artifact and attempt download. | File moved to `uploads/quarantine/`; download returns HTTP 403 Forbidden. | Verified |
| **FR-12** | `test_audit_chain_verification`| Call `/audit/verify` on event log. | Cryptographic hash verification returns `valid: true`. | Verified |
| **FR-14** | `test_pdf_report_compilation` | Request `/report/pdf` for completed scan. | Valid binary PDF returned with `%PDF-` header and executive sections. | Verified |
| **FR-15** | `test_api_key_lifecycle` | Generate key, authenticate request, revoke key. | Request succeeds initially; returns HTTP 401 Unauthorized after revocation. | Verified |

---

## 14. Document Sign-Off & Approvals

| Role | Name | Title | Date | Signature Status |
|---|---|---|---|:---:|
| **Project Lead / Author** | MCA Student | Lead Security Engineer | 2026-11-11 | Signed (Approved) |
| **Academic Supervisor** | Department Faculty | Project Guide / Reviewer | 2026-11-11 | Pending Final Viva |
| **Security Architecture** | AISecGuard Team | System Architect | 2026-11-11 | Signed (Approved) |

---
*Document maintained under the AISecGuard Framework Project Repository.*

