# AISecGuard — System Architecture

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Week:** 2  
**Document Type:** System Architecture  
**Author:** MCA 3rd Semester Student  
**Date:** September 2026  

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Architectural Style](#2-architectural-style)
3. [Component Descriptions](#3-component-descriptions)
4. [Data Flow](#4-data-flow)
5. [Deployment View](#5-deployment-view)
6. [Security Considerations in Architecture](#6-security-considerations-in-architecture)
7. [Architecture Decisions and Rationale](#7-architecture-decisions-and-rationale)

---

## 1. Architecture Overview

AISecGuard follows a **layered, modular architecture** with a clear separation between the presentation layer (React dashboard), the API layer (FastAPI backend), the security engine (scanning modules), and the data layer (PostgreSQL database + artifact storage).

```
┌─────────────────────────────────────────────────┐
│                  USER / BROWSER                  │
└─────────────────────┬───────────────────────────┘
                      │  HTTPS
┌─────────────────────▼───────────────────────────┐
│              REACT WEB DASHBOARD                 │
│  (Vite + React + Tailwind CSS)                   │
│  • Upload UI • Scan Monitor • Reports • Alerts   │
└─────────────────────┬───────────────────────────┘
                      │  REST API (HTTP/JSON)
┌─────────────────────▼───────────────────────────┐
│              FASTAPI BACKEND (API LAYER)         │
│  Routes:                                         │
│  /health  /api/artifacts  /api/scans             │
│  /api/findings  /api/reports  /api/users         │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│           AISECGUARD SECURITY ENGINE             │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  Orchestrator / Scan Manager             │   │
│  │  (coordinates all scanner modules)       │   │
│  └──────┬──────────┬──────────┬─────────────┘   │
│         │          │          │                   │
│  ┌──────▼──┐ ┌─────▼───┐ ┌──▼────────┐          │
│  │ Model   │ │Dataset  │ │Dependency │          │
│  │Security │ │Security │ │ Scanner   │          │
│  │Scanner  │ │Scanner  │ │           │          │
│  └──────┬──┘ └─────┬───┘ └──┬────────┘          │
│         │          │         │                   │
│  ┌──────▼──────────▼─────────▼────────────┐     │
│  │  Provenance & Integrity Checker        │     │
│  └───────────────────┬────────────────────┘     │
│                      │                           │
│  ┌───────────────────▼────────────────────┐     │
│  │  Risk Assessment Engine                │     │
│  └───────────────────┬────────────────────┘     │
│                      │                           │
│  ┌───────────────────▼────────────────────┐     │
│  │  Attack Detection Engine               │     │
│  └───────────────────┬────────────────────┘     │
│                      │                           │
│  ┌───────────────────▼────────────────────┐     │
│  │  Mitigation Engine                     │     │
│  └───────────────────┬────────────────────┘     │
│                      │                           │
│  ┌───────────────────▼────────────────────┐     │
│  │  Report Generator                      │     │
│  └───────────────────┬────────────────────┘     │
└────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│               DATA LAYER                         │
│                                                  │
│  ┌─────────────────┐   ┌──────────────────────┐ │
│  │  PostgreSQL DB  │   │  Artifact Storage    │ │
│  │  (structured    │   │  (local filesystem   │ │
│  │   records)      │   │   /uploads/)         │ │
│  └─────────────────┘   └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 2. Architectural Style

| Property | Choice | Rationale |
|---|---|---|
| **Pattern** | Layered + Modular | Clear separation of concerns; each layer has a single responsibility |
| **API Style** | REST | Widely supported; easy to test with tools like Postman; supports future frontend flexibility |
| **Frontend–Backend Communication** | HTTP/JSON | Standard, stateless, easy to debug |
| **Database** | Relational (PostgreSQL) | Structured security data; relationships between scans, findings, and artifacts |
| **Artifact Storage** | Local filesystem (MVP) | Simple for academic prototype; path can be replaced with S3 in future |
| **Scanning** | Static analysis only | Uploaded files are never executed; reduces security risk of handling untrusted artifacts |

---

## 3. Component Descriptions

### 3.1 React Web Dashboard
**Layer:** Presentation  
**Responsibility:**
- Provides a browser-based interface for all user interactions.
- Upload artifacts (models, datasets, dependency files).
- Monitor scan status and progress.
- View scan findings, risk scores, and reports.
- View artifact provenance records.
- Receive alert notifications for high-severity findings.

**Technology:** React 18, Vite, Tailwind CSS

---

### 3.2 FastAPI Backend (API Layer)
**Layer:** Application / API  
**Responsibility:**
- Expose REST API endpoints for all system operations.
- Handle file upload, validation, and secure storage.
- Authenticate users and protect endpoints.
- Delegate scan execution to the Security Engine.
- Return structured JSON responses to the frontend.
- Serve auto-generated OpenAPI documentation at `/docs`.

**Technology:** Python 3.12, FastAPI, Uvicorn, SQLAlchemy (ORM), Pydantic (validation)

---

### 3.3 Orchestrator / Scan Manager
**Layer:** Security Engine  
**Responsibility:**
- Receives a scan request from the API layer.
- Determines the artifact type (model, dataset, dependency file).
- Invokes the appropriate scanner modules in sequence.
- Collects results from all scanners.
- Passes aggregated raw findings to the Risk Assessment Engine.
- Updates scan status in the database throughout the process.

---

### 3.4 Model Security Scanner
**Layer:** Security Engine — Scanner  
**Responsibility:**
- Inspect model file format and structure.
- Detect unsafe serialization: scan `.pkl` and `.joblib` files for pickle opcodes (`REDUCE`, `GLOBAL`, `BUILD`) that indicate callable code.
- Extract and validate model metadata.
- Check for unexpected embedded data (unusually large metadata sections).
- Flag suspicious model file characteristics.

**Inputs:** Model file path, file type  
**Outputs:** List of model-level findings with severity and evidence

---

### 3.5 Dataset Security Scanner
**Layer:** Security Engine — Scanner  
**Responsibility:**
- Parse and validate dataset format (CSV, JSON, Parquet).
- Compute basic statistical summary (row count, column count, class distribution).
- Check label distribution for unusual imbalance (potential poisoning indicator).
- Detect duplicate rows.
- Detect anomalous outlier proportions in numeric columns.
- Flag structural inconsistencies (missing required columns, mixed types).

**Inputs:** Dataset file path, file type  
**Outputs:** List of dataset-level findings with statistical evidence

---

### 3.6 Dependency Scanner
**Layer:** Security Engine — Scanner  
**Responsibility:**
- Parse `requirements.txt` or `pyproject.toml`.
- Extract package names and version specifications.
- Compare against a local known-vulnerable package database (JSON file with CVE references).
- Flag packages with known vulnerabilities.
- Flag unpinned dependencies (no version specifier) as a risk indicator.

**Inputs:** Dependency file path  
**Outputs:** List of dependency findings with package name, version, CVE reference

---

### 3.7 Provenance & Integrity Checker
**Layer:** Security Engine — Cross-cutting  
**Responsibility:**
- Compute SHA-256 hash of every uploaded artifact.
- Store hash in the provenance record on first upload.
- On subsequent uploads or explicit integrity checks, compare computed hash to stored baseline.
- Flag hash mismatches as integrity violations.
- Record provenance metadata: source URL (if provided), upload timestamp, uploader identity, file type.

**Inputs:** Artifact file path, optional known-good hash  
**Outputs:** Provenance record; integrity finding if mismatch detected

---

### 3.8 Risk Assessment Engine
**Layer:** Security Engine  
**Responsibility:**
- Receive all findings from scanner modules and the integrity checker.
- Assign severity levels: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`.
- Compute an overall risk score for the scan (0–10 scale).
- Apply severity weights: Critical findings heavily penalise the score.

**Scoring formula (simplified):**
```
risk_score = min(10, (critical × 4 + high × 2 + medium × 1 + low × 0.3) / normaliser)
```

**Inputs:** List of raw findings  
**Outputs:** Severity-annotated findings; overall scan risk score

---

### 3.9 Attack Detection Engine
**Layer:** Security Engine  
**Responsibility:**
- Map scanner findings to specific known attack patterns.
- Assign MITRE ATLAS technique IDs where applicable.
- Generate human-readable attack classification labels (e.g., "Potential Pickle RCE — AML.T0010").
- Aggregate evidence for each detected attack pattern.

**Inputs:** Risk-assessed findings  
**Outputs:** Attack detection results with MITRE ATLAS mappings

---

### 3.10 Mitigation Engine
**Layer:** Security Engine  
**Responsibility:**
- For each finding, select an appropriate mitigation action from a predefined catalogue.
- If severity is `CRITICAL` or `HIGH`: set quarantine flag on the artifact.
- Generate alert records for `CRITICAL` and `HIGH` findings.
- Attach a text remediation recommendation to each finding.

**Inputs:** Attack-classified findings  
**Outputs:** Mitigation actions per finding; quarantine flag if applicable; alert records

---

### 3.11 Report Generator
**Layer:** Security Engine  
**Responsibility:**
- Compile all findings, risk scores, attack classifications, and mitigation actions into a structured report.
- Generate a JSON report (machine-readable).
- Generate a Markdown text summary (human-readable).
- Store report in the database and associate it with the scan.

**Inputs:** Completed scan results  
**Outputs:** JSON report; Markdown summary

---

### 3.12 PostgreSQL Database
**Layer:** Data  
**Responsibility:**
- Persist all structured data: users, artifacts, scans, findings, provenance records, mitigation actions, reports.
- Provide relational integrity between entities.

---

### 3.13 Artifact Storage
**Layer:** Data  
**Responsibility:**
- Store uploaded artifact files on the local filesystem under `/uploads/`.
- Files are **never executed**; they are only opened for static read during scanning.
- Quarantined artifacts are moved to `/uploads/quarantine/`.

---

## 4. Data Flow

The following describes the complete flow of a scan from artifact upload to report:

```
Step 1: UPLOAD
  User selects artifact file via dashboard.
  Dashboard sends POST /api/artifacts/upload request with file.
  API Layer receives file, validates format and size.
  File is saved to /uploads/{artifact_id}/.
  SHA-256 hash is computed.

Step 2: PROVENANCE RECORDING
  API Layer creates an artifact record in the database.
  Provenance record is created: filename, hash, uploader, timestamp, source.

Step 3: SCAN INITIATION
  User (or automatic trigger) sends POST /api/scans with artifact_id.
  API Layer creates a scan record (status: PENDING).
  Orchestrator is invoked with the artifact ID and file path.

Step 4: TYPE DETECTION
  Orchestrator reads artifact type from the database record.
  Routes to Model Scanner, Dataset Scanner, or Dependency Scanner accordingly.

Step 5: SCANNING
  Scanner module reads the artifact file (read-only, static).
  Produces a list of raw findings.

Step 6: INTEGRITY CHECK
  Provenance & Integrity Checker computes/compares hash.
  Adds integrity finding if mismatch detected.

Step 7: RISK ASSESSMENT
  Risk Assessment Engine processes all raw findings.
  Assigns severity levels and computes overall risk score.

Step 8: ATTACK DETECTION
  Attack Detection Engine maps findings to attack patterns.
  Assigns MITRE ATLAS identifiers.

Step 9: MITIGATION
  Mitigation Engine selects remediation actions.
  Sets quarantine flag if severity warrants.
  Creates alert records.

Step 10: REPORT GENERATION
  Report Generator compiles complete scan results.
  Creates JSON and Markdown reports.
  Stores report in database.
  Scan record updated to status: COMPLETED.

Step 11: DASHBOARD UPDATE
  Frontend polls or receives notification of scan completion.
  Dashboard displays findings, risk score, and report.
  Alerts displayed for high-severity findings.
```

---

## 5. Deployment View

For the academic prototype, all components run on a single machine:

```
Local Machine
├── PostgreSQL (port 5432)
├── FastAPI Backend (Uvicorn, port 8000)
│   └── /uploads/  (artifact storage directory)
└── React Frontend (Vite dev server, port 5173)
```

Docker Compose configuration will be provided to orchestrate all services:

```yaml
services:
  db:       PostgreSQL 15
  backend:  Python 3.12 + FastAPI
  frontend: Node.js 20 + Vite
```

---

## 6. Security Considerations in Architecture

| Concern | Mitigation |
|---|---|
| Arbitrary code execution from uploaded files | Files are opened read-only; Python `pickle.loads()` is NEVER called on uploaded files; only pickle opcodes are inspected as bytes |
| Path traversal in uploads | Filenames are sanitised and replaced with UUID-based paths |
| SQL injection | All database access via SQLAlchemy ORM with parameterised queries |
| Unauthenticated API access | All endpoints except `/health` require JWT authentication |
| Sensitive credentials in source | All secrets (DB password, JWT secret) stored in `.env` file excluded from Git |
| Malicious file content displayed in UI | Reports display extracted text only; no file content is rendered as HTML |

---

## 7. Architecture Decisions and Rationale

| Decision | Chosen Approach | Rationale |
|---|---|---|
| **Static vs. dynamic analysis** | Static only | Executing untrusted files introduces severe security risk on the scanning machine; static analysis is safer and more appropriate for an academic prototype |
| **Monolith vs. microservices** | Modular monolith | Simpler to develop and maintain for a single-developer academic project; modules are independently testable |
| **SQL vs. NoSQL** | SQL (PostgreSQL) | Structured security data with clear relationships fits relational model; PostgreSQL is industry standard |
| **REST vs. GraphQL** | REST | Simpler to implement; well-understood; good FastAPI support with auto-generated docs |
| **Real-time vs. polling** | Polling (MVP) | Avoids WebSocket complexity for the academic prototype; can be upgraded later |
| **Local storage vs. S3** | Local filesystem (MVP) | Zero cost for academic; straightforward to implement; architecture supports future S3 replacement |
