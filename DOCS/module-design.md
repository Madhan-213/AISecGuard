# AISecGuard — Module Design

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Week:** 2  
**Document Type:** Module Design  
**Author:** MCA 3rd Semester Student  
**Date:** September 2026  

---

## Table of Contents

1. [Module 01 — Model Security Scanner](#module-01--model-security-scanner)
2. [Module 02 — Dataset Security Scanner](#module-02--dataset-security-scanner)
3. [Module 03 — Provenance & Integrity Checker](#module-03--provenance--integrity-checker)
4. [Module 04 — Dependency Scanner](#module-04--dependency-scanner)
5. [Module 05 — Risk Assessment Engine](#module-05--risk-assessment-engine)
6. [Module 06 — Attack Detection Engine](#module-06--attack-detection-engine)
7. [Module 07 — Mitigation Engine](#module-07--mitigation-engine)
8. [Module 08 — Alert & Report Generator](#module-08--alert--report-generator)
9. [Module 09 — Dashboard (Frontend)](#module-09--dashboard-frontend)
10. [Module 10 — API Layer](#module-10--api-layer)
11. [Module Dependency Map](#module-dependency-map)

---

## Module 01 — Model Security Scanner

### Purpose
Inspect uploaded AI model files for security risks without executing them. Detects unsafe serialization formats, unusual file structure, and suspicious model metadata.

### Inputs
- Model file path (local filesystem path after upload)
- File extension / detected MIME type
- Artifact ID (for database reference)

### Processing

**Step 1 — File Format Identification**
- Map file extension to model format class: `.pkl`/`.joblib` → Pickle-based, `.h5` → HDF5/Keras, `.pt`/`.bin` → PyTorch, `.onnx` → ONNX, `.safetensors` → SafeTensors

**Step 2 — Pickle Opcode Scan (for `.pkl`, `.joblib` files)**
- Open file as raw bytes (no `pickle.loads()` call)
- Search for dangerous pickle opcodes:
  - `\x63` (`GLOBAL`) — imports an arbitrary module/function
  - `\x52` (`REDUCE`) — calls an imported function
  - `\x69` (`INST`) — instantiates an object from a module
  - `\x6f` (`OBJ`) — builds an object
- If these opcodes are found alongside strings referencing `os`, `subprocess`, `eval`, `exec`, `__import__`: flag as `CRITICAL`
- If opcodes are found but no dangerous references: flag as `HIGH` (pickle use itself is a risk)

**Step 3 — File Size and Structure Checks**
- Flag unusually small model files (< 512 bytes) as suspicious (may be stub or test)
- Flag unusually large metadata sections relative to weight data (potential embedded data)
- For ONNX: parse with `onnx` library (safe read, no execution) and check for unknown node types

**Step 4 — SafeTensors Verification**
- If `.safetensors`: verify the file header is valid JSON; absence of executable code is a positive finding
- Note: SafeTensors format is designed to be safe; report as a positive security indicator

**Step 5 — Result Compilation**
- Return list of `Finding` objects per issue detected

### Outputs
- `List[Finding]` where each finding contains: `finding_id`, `type`, `severity`, `description`, `evidence`, `recommendation`

### Technologies / Libraries
- Python built-in `io`, `struct` — raw byte inspection
- `onnx` library (optional, for ONNX parsing)
- `json` — for SafeTensors header parsing
- No `pickle`, `torch`, `tensorflow` imports during scan (security constraint)

### Security Considerations
- **Never call `pickle.load()` or `pickle.loads()`** on uploaded files; byte-level inspection only
- File is opened with `open(path, 'rb')` — read-only binary mode
- Scanner runs in the same process but never evaluates any payload

---

## Module 02 — Dataset Security Scanner

### Purpose
Analyse uploaded datasets for statistical anomalies and patterns that may indicate data poisoning, tampering, or poor data quality.

### Inputs
- Dataset file path
- File type (`.csv`, `.json`, `.parquet`, `.jsonl`)
- Optional: target column name (for label distribution analysis)

### Processing

**Step 1 — Format Parsing and Validation**
- Load dataset using `pandas`
- Validate: file is parseable; expected structure (rows, columns) exists
- Detect and report: empty datasets, datasets with no columns, non-UTF-8 encoding issues

**Step 2 — Basic Statistics**
- Record: row count, column count, column names, data types
- These form the provenance metadata baseline

**Step 3 — Duplicate Row Detection**
- Count and report exact duplicate rows
- If duplicates > 5% of total rows: flag as `MEDIUM` (may indicate copy-paste poisoning or data collection errors)

**Step 4 — Missing Value Analysis**
- Compute missing value percentage per column
- If any column has > 50% missing: flag as `LOW` (data quality issue)

**Step 5 — Label Distribution Analysis** (if target column identified or heuristically detected)
- Detect likely label/target column (column with few unique values relative to row count, typically named `label`, `target`, `class`, `y`)
- Compute class distribution
- If any class has < 2% of samples in a dataset with > 500 rows: flag as `MEDIUM` (possible label poisoning)
- If any class has > 95% of samples in a dataset with > 200 rows: flag as `HIGH` (severe imbalance / potential poisoning)

**Step 6 — Numeric Outlier Detection**
- For numeric columns: compute z-scores
- If > 10% of rows have z-score > 4 in any numeric column: flag as `LOW` (unusual distribution)

**Step 7 — Result Compilation**
- Return list of `Finding` objects

### Outputs
- `List[Finding]`
- Statistical summary dict (for report metadata)

### Technologies / Libraries
- `pandas` — dataset loading and analysis
- `numpy` — statistical computations
- `scipy.stats` — z-score computation

### Security Considerations
- Dataset is loaded for reading only; no code from the dataset is evaluated
- Large files are processed in chunks to avoid memory exhaustion
- File size limit enforced at API layer before this module is called

---

## Module 03 — Provenance & Integrity Checker

### Purpose
Record the origin, identity, and integrity baseline of every uploaded artifact. Detect tampering by comparing hashes.

### Inputs
- Artifact file path
- Artifact ID
- Uploader identity
- Optional: known-good SHA-256 hash (user-supplied for verification)
- Optional: source URL (where the artifact was obtained from)

### Processing

**Step 1 — Hash Computation**
- Compute SHA-256 hash of the artifact file in chunks (handles large files)
```python
sha256 = hashlib.sha256()
with open(path, 'rb') as f:
    for chunk in iter(lambda: f.read(65536), b''):
        sha256.update(chunk)
digest = sha256.hexdigest()
```

**Step 2 — Provenance Record Creation**
- Store: artifact_id, filename, file_size, sha256_hash, upload_timestamp, uploader_id, source_url

**Step 3 — Integrity Verification**
- If user supplied a known-good hash:
  - Compare computed hash with known-good hash
  - If mismatch: create `CRITICAL` finding — "Hash mismatch detected; artifact may have been tampered with"
  - If match: record as `INFO` finding — "Integrity verified against known-good hash"
- If no hash supplied: record as `INFO` — "No known-good hash provided; baseline hash recorded"

**Step 4 — Re-upload Detection**
- Check if an artifact with the same filename and different hash was previously uploaded
- If detected: create `HIGH` finding — "Artifact updated; hash changed since last upload"

### Outputs
- `ProvenanceRecord` (stored in database)
- `List[Finding]` (integrity findings)

### Technologies / Libraries
- Python `hashlib` — SHA-256 computation
- SQLAlchemy — provenance record storage

### Security Considerations
- Hash computation reads file in binary chunks; no interpretation of content
- Provenance records are immutable after creation (no UPDATE allowed; only INSERT)

---

## Module 04 — Dependency Scanner

### Purpose
Identify AI/ML software dependencies from requirements files and check them against a known-vulnerable package list.

### Inputs
- Dependency file path (`requirements.txt` or `pyproject.toml`)
- File type identifier

### Processing

**Step 1 — File Parsing**
- Parse `requirements.txt`: split lines, strip comments, extract package name and version specifier
- Parse `pyproject.toml`: use `tomllib` (Python 3.11+ built-in) to extract `[project.dependencies]` or `[tool.poetry.dependencies]`

**Step 2 — Package Extraction**
- Normalise package names (lowercase, replace `_` with `-`)
- Identify packages with no version specifier (unpinned) — flag as `LOW`

**Step 3 — Vulnerable Package Check**
- Load local vulnerability database: `data/vulnerable_packages.json`
  - Format: `{"package_name": [{"cve": "CVE-XXXX-XXXX", "affected_versions": "< X.Y.Z", "severity": "HIGH", "description": "..."}]}`
- For each extracted package:
  - Check if package name exists in vulnerability DB
  - If version matches affected range: flag as `HIGH` or `CRITICAL` depending on CVE severity
  - If package is found in DB but version is unknown/unpinned: flag as `MEDIUM`

**Step 4 — AI/ML Specific Checks**
- Flag packages known to use unsafe defaults if very old versions are detected:
  - `tensorflow < 2.0`, `torch < 1.8`, `scikit-learn < 0.24` — flag as `MEDIUM`

**Step 5 — Result Compilation**

### Outputs
- `List[Finding]` per vulnerable/unpinned package
- `List[DependencyRecord]` — all extracted packages stored in database

### Technologies / Libraries
- Python `re` — requirements.txt parsing
- Python `tomllib` — pyproject.toml parsing (Python 3.11+)
- `packaging` library — version comparison (`pip install packaging`)

### Security Considerations
- Dependency file is parsed as text only; no packages are installed
- Vulnerability DB is a curated local JSON file (no live network calls in MVP)

---

## Module 05 — Risk Assessment Engine

### Purpose
Aggregate findings from all scanners and compute a severity-annotated finding list and overall scan risk score.

### Inputs
- `List[RawFinding]` from all scanner modules

### Processing

**Severity Assignment**
- Findings already tagged with severity by scanner modules
- Engine validates and normalises severity levels to: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`

**Risk Score Computation**
```
weights = {CRITICAL: 4.0, HIGH: 2.0, MEDIUM: 1.0, LOW: 0.3, INFO: 0.0}
raw_score = sum(weights[f.severity] for f in findings)
risk_score = min(10.0, round(raw_score, 2))
```

**Risk Level Classification**
```
8.0 – 10.0 : CRITICAL RISK
6.0 – 7.9  : HIGH RISK
4.0 – 5.9  : MEDIUM RISK
2.0 – 3.9  : LOW RISK
0.0 – 1.9  : MINIMAL RISK
```

### Outputs
- `List[SeverityFinding]` — severity-annotated findings
- `risk_score: float` — overall scan risk score (0–10)
- `risk_level: str` — risk level label

### Technologies / Libraries
- Python standard library only (no external dependencies for this module)

---

## Module 06 — Attack Detection Engine

### Purpose
Map scanner findings to known AI supply chain attack patterns and assign MITRE ATLAS technique identifiers.

### Inputs
- `List[SeverityFinding]` from Risk Assessment Engine

### Processing

**Pattern Matching**
- Maintain an internal mapping of finding types to attack patterns:
```python
ATTACK_PATTERNS = {
    "pickle_opcode_dangerous": {
        "attack_name": "Unsafe Model Serialization (Potential RCE)",
        "mitre_atlas_id": "AML.T0010",
        "mitre_atlas_name": "ML Supply Chain Compromise",
        "owasp_llm": "LLM04"
    },
    "hash_mismatch": {
        "attack_name": "Artifact Integrity Failure (Potential Tampering)",
        "mitre_atlas_id": "AML.T0019",
        ...
    },
    "label_distribution_extreme": {
        "attack_name": "Potential Data Poisoning (Label Imbalance)",
        "mitre_atlas_id": "AML.T0020",
        ...
    },
    ...
}
```
- For each finding, look up the finding type in the pattern map
- Attach attack classification to the finding

### Outputs
- `List[ClassifiedFinding]` — findings with attack pattern and MITRE ATLAS metadata attached

### Technologies / Libraries
- Python standard library only

---

## Module 07 — Mitigation Engine

### Purpose
Determine and record appropriate mitigation actions for each finding. Set quarantine flags and create alerts for high-severity findings.

### Inputs
- `List[ClassifiedFinding]` from Attack Detection Engine
- Artifact ID
- Scan ID

### Processing

**Remediation Recommendation Lookup**
- Maintain a catalogue of remediation text per finding type
- Attach appropriate recommendation text to each finding

**Quarantine Decision**
- If any finding has severity `CRITICAL` or `HIGH`: set `quarantine_flag = True` on the artifact
- Update artifact record in database

**Alert Creation**
- For each `CRITICAL` finding: create an alert record with `priority = CRITICAL`
- For each `HIGH` finding: create an alert record with `priority = HIGH`

**Mitigation Action Records**
- Create a `mitigation_action` record per finding, storing: action type, description, timestamp

### Outputs
- `quarantine_flag: bool`
- `List[Alert]` records
- `List[MitigationAction]` records

### Technologies / Libraries
- SQLAlchemy — database writes
- Python standard library

---

## Module 08 — Alert & Report Generator

### Purpose
Compile all scan results into structured, human-readable security reports. Generate in-system alerts.

### Inputs
- Completed scan record
- `List[ClassifiedFinding]` with mitigations
- Risk score and risk level
- Provenance record

### Processing

**JSON Report Assembly**
```json
{
  "report_id": "...",
  "scan_id": "...",
  "artifact": {...},
  "provenance": {...},
  "risk_score": 7.5,
  "risk_level": "HIGH RISK",
  "finding_summary": {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 0, "LOW": 1, "INFO": 3},
  "findings": [...],
  "generated_at": "..."
}
```

**Markdown Report Assembly**
- Human-readable report formatted for readability and viva presentation

**Storage**
- Save JSON report to `reports/{scan_id}.json`
- Store report record in database

### Outputs
- JSON report file
- Markdown summary string
- `Report` database record

### Technologies / Libraries
- Python `json` — JSON serialization
- Python `datetime` — timestamps

---

## Module 09 — Dashboard (Frontend)

### Purpose
Provide a browser-based interface for all AISecGuard operations: uploading artifacts, monitoring scans, viewing findings, and reading reports.

### Inputs
- User interactions (file uploads, button clicks, navigation)
- API responses from the FastAPI backend

### Key Pages / Views

| Page | Path | Description |
|---|---|---|
| Login | `/login` | User authentication |
| Dashboard Home | `/` | Overview: recent scans, summary stats, alerts |
| Upload Artifact | `/upload` | File upload form with type selection |
| Scans List | `/scans` | List of all scans with status |
| Scan Detail | `/scans/:id` | Findings, risk score, MITRE ATLAS mappings |
| Findings | `/findings` | All findings across scans |
| Reports | `/reports/:id` | Full security report view |
| Provenance | `/artifacts/:id` | Artifact provenance information |

### Technologies / Libraries
- **React 18** — component framework
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first styling
- **React Router** — client-side routing
- **Axios** — HTTP API calls
- **Recharts** — charts for risk scores and finding summaries

---

## Module 10 — API Layer

### Purpose
Expose all AISecGuard functionality via a secure, documented REST API.

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (unauthenticated) |
| `POST` | `/api/users/register` | User registration |
| `POST` | `/api/users/login` | Authentication (returns JWT) |
| `POST` | `/api/artifacts/upload` | Upload artifact file |
| `GET` | `/api/artifacts` | List all artifacts |
| `GET` | `/api/artifacts/{id}` | Get artifact details + provenance |
| `POST` | `/api/artifacts/{id}/quarantine` | Manually quarantine artifact |
| `POST` | `/api/scans` | Initiate a new scan |
| `GET` | `/api/scans` | List all scans |
| `GET` | `/api/scans/{id}` | Get scan details |
| `GET` | `/api/findings` | List all findings |
| `GET` | `/api/findings/{id}` | Get finding details |
| `GET` | `/api/reports/{id}` | Get report for a scan |

### Input Validation
- All inputs validated by Pydantic models
- File type and size validated before storage

### Authentication
- JWT-based authentication (python-jose)
- Token passed as `Authorization: Bearer <token>` header
- `/health` endpoint is public

### Auto-generated Documentation
- OpenAPI docs available at `/docs` (Swagger UI)
- ReDoc available at `/redoc`

### Technologies / Libraries
- **FastAPI** — route definition, dependency injection, auto-docs
- **Uvicorn** — ASGI server
- **Pydantic** — request/response validation
- **python-jose** — JWT
- **passlib** — password hashing (bcrypt)
- **python-multipart** — file upload handling
- **SQLAlchemy** — ORM for database access

---

## Module Dependency Map

```
API Layer
    │
    ├─→ Orchestrator / Scan Manager
    │       │
    │       ├─→ Model Security Scanner  ──┐
    │       │                             │
    │       ├─→ Dataset Security Scanner ─┼─→ Provenance & Integrity Checker
    │       │                             │         │
    │       └─→ Dependency Scanner ───────┘         │
    │                                               ▼
    │                                    Risk Assessment Engine
    │                                               │
    │                                    Attack Detection Engine
    │                                               │
    │                                    Mitigation Engine
    │                                               │
    │                                    Report Generator
    │                                               │
    └─────────────────────────────→ Database + Storage
```
