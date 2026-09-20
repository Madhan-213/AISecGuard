# AISecGuard — Requirements Document

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Week:** 2  
**Document Type:** Requirements Analysis  
**Author:** MCA 3rd Semester Student  
**Date:** September 2026  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Scope](#4-scope)
5. [Target Users](#5-target-users)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Inputs](#8-system-inputs)
9. [System Outputs](#9-system-outputs)
10. [Assumptions](#10-assumptions)
11. [Constraints](#11-constraints)
12. [Project Limitations](#12-project-limitations)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Project Overview

AISecGuard is an automated security framework designed to detect, prevent, and mitigate attacks targeting the AI and machine learning supply chain. The system monitors AI artifacts (models, datasets, and dependencies) for integrity violations, provenance issues, and known vulnerability patterns.

The project is developed as an MCA final-year project over a 12-week schedule. It is intended to demonstrate a practical, end-to-end AI supply chain security scanning system backed by research-informed design.

---

## 2. Problem Statement

The rapid adoption of AI and machine learning systems has created a new and growing attack surface: the AI supply chain. Attackers can compromise AI systems at multiple stages — from injecting poisoned data during training to distributing backdoored pre-trained models via public repositories.

Key problems include:

- **No unified scanning tool** exists for AI/ML artifacts (models, datasets, dependencies) in the same way vulnerability scanners exist for traditional software.
- **Model integrity** is rarely verified before deployment; many organisations download models from public hubs (Hugging Face, GitHub) without cryptographic verification.
- **Data poisoning** can silently alter model behaviour; detection requires statistical and heuristic checks.
- **Unsafe serialization formats** (e.g., Python pickle embedded in `.pkl` model files) can execute arbitrary code on load.
- **AI-specific dependency risks** go undetected by standard SAST/SCA tools.

As documented in the Week 1 literature review, the number of AI-related CVEs increased by 34.6% year-over-year (H1 2026, Recorded Future), and malicious open-source packages grew by 73%. AISecGuard addresses this gap by providing an integrated, automated security assessment platform for AI artifacts.

---

## 3. Project Objectives

The primary objectives of AISecGuard are:

1. **Detect** integrity violations, suspicious patterns, and known vulnerabilities in AI models, datasets, and dependencies.
2. **Verify provenance** of AI artifacts — track origin, lineage, and modification history.
3. **Scan AI model files** for unsafe serialization, embedded code, and tampering indicators.
4. **Scan datasets** for statistical anomalies, format inconsistencies, and data poisoning indicators.
5. **Scan AI/ML dependencies** for known CVEs and suspicious package behaviour.
6. **Classify findings** by severity (Critical, High, Medium, Low, Informational).
7. **Generate security reports** summarising findings with evidence.
8. **Provide mitigation actions** — alerting, quarantine, and remediation recommendations.
9. **Provide a web dashboard** for interactive security monitoring.

---

## 4. Scope

### 4.1 In Scope

#### A. Data Supply Chain Security
- Dataset upload and integrity verification (hash-based)
- Dataset provenance recording (origin, upload metadata)
- Statistical anomaly detection on tabular datasets (label distribution, outlier detection)
- Detection of potential data poisoning indicators (sudden label shifts, unusual feature distributions)
- Dataset format validation

#### B. Model Supply Chain Security
- Model file upload and hash-based integrity verification
- Provenance recording (source, version, upload date)
- Detection of unsafe serialization (e.g., Python pickle in `.pkl` files — static check)
- Model metadata extraction and analysis
- Detection of suspicious model file characteristics (unexpected embedded scripts, large metadata blobs)

#### C. Dependency Supply Chain Security
- Extraction of AI/ML dependencies from requirements files (`requirements.txt`, `pyproject.toml`)
- Matching dependencies against known vulnerable package lists
- Risk scoring based on dependency characteristics

#### D. Security Assessment
- Severity classification of all findings (Critical / High / Medium / Low / Info)
- Evidence collection per finding
- Aggregated risk score per artifact/scan
- Security report generation (structured JSON + human-readable summary)

#### E. Mitigation
- Alert generation for high-severity findings
- Quarantine flag for suspicious artifacts (preventing further processing)
- Remediation recommendations for each finding type

### 4.2 Out of Scope

- Real-time monitoring of production AI systems
- Runtime adversarial attack detection (live inference monitoring)
- Automated model retraining after poisoning detection
- Full MITRE ATLAS attack simulation (only classification/mapping is performed)
- LLM prompt injection detection (Week 1 research noted this; outside current scope)
- Differential privacy implementation
- Network-level intrusion detection
- Hardware/firmware security

---

## 5. Target Users

| User Type | Description |
|-----------|-------------|
| **ML Engineers** | Developers building and deploying AI/ML models who need to verify artifact security before deployment |
| **Data Scientists** | Practitioners who prepare datasets and need to validate data integrity |
| **Security Analysts** | Cybersecurity professionals auditing AI systems for vulnerabilities |
| **AI Project Managers** | Managers overseeing AI pipelines who need consolidated security reports |
| **Researchers / Students** | Academics studying AI supply chain security (this project is itself academic) |

---

## 6. Functional Requirements

### FR-01: User Authentication
- The system shall support user registration and login.
- Authenticated users shall be able to upload artifacts, trigger scans, and view reports.
- (MVP: Basic authentication; no multi-factor auth required for the academic prototype.)

### FR-02: Artifact Upload
- The system shall accept model files (`.pkl`, `.h5`, `.pt`, `.onnx`, `.joblib`, `.bin`, `.safetensors`).
- The system shall accept dataset files (`.csv`, `.json`, `.parquet`, `.jsonl`).
- The system shall accept dependency files (`requirements.txt`, `pyproject.toml`).
- File size limit: 100 MB per upload (configurable).
- The system shall compute and store a SHA-256 hash of every uploaded artifact.

### FR-03: Provenance Recording
- The system shall record upload timestamp, filename, file type, uploader identity, and file hash.
- The system shall store provenance records in the database.
- Users shall be able to view provenance records for any artifact.

### FR-04: Model Security Scanning
- The system shall scan model files for unsafe serialization indicators (pickle protocol usage in `.pkl` files).
- The system shall check for unexpected file structure anomalies.
- The system shall extract model metadata where possible.
- Findings shall be classified by severity.

### FR-05: Dataset Security Scanning
- The system shall validate dataset format and structure.
- The system shall compute statistical summaries (label distribution, class balance, outlier counts).
- The system shall flag datasets with highly imbalanced label distributions as potential poisoning indicators.
- The system shall check for duplicate or corrupted rows.

### FR-06: Dependency Scanning
- The system shall parse `requirements.txt` and `pyproject.toml` files.
- The system shall compare extracted packages and versions against a known-vulnerable package list.
- The system shall report vulnerable packages with CVE references where available.

### FR-07: Integrity Verification
- The system shall compute SHA-256 hashes of uploaded artifacts.
- Users shall be able to provide a known-good hash for comparison.
- The system shall flag hash mismatches as integrity violations.

### FR-08: Risk Assessment
- The system shall assign a severity level to each finding.
- The system shall compute an overall risk score for each scan.
- Risk scores shall range from 0 (no risk) to 10 (critical risk).

### FR-09: Mitigation Actions
- The system shall quarantine artifacts flagged as high-severity.
- The system shall generate alert notifications for critical/high findings.
- The system shall provide a text remediation recommendation for each finding.

### FR-10: Report Generation
- The system shall generate a structured JSON security report per scan.
- The system shall generate a human-readable summary report.
- Reports shall be retrievable via API and dashboard.

### FR-11: Dashboard
- The dashboard shall display a list of recent scans with status.
- The dashboard shall display finding summaries per scan.
- The dashboard shall display artifact provenance information.
- The dashboard shall allow users to trigger new scans.

### FR-12: API
- The system shall expose a REST API for all core operations.
- API documentation shall be auto-generated via FastAPI/OpenAPI.

---

## 7. Non-Functional Requirements

### NFR-01: Performance
- A scan on a model file up to 50 MB shall complete within 60 seconds.
- A scan on a CSV dataset up to 10 MB shall complete within 30 seconds.
- The dashboard shall load within 3 seconds on a standard broadband connection.

### NFR-02: Reliability
- The system shall return a clear error message for any failed scan.
- Failed scans shall not leave partial data in the database.

### NFR-03: Security
- All file uploads shall be stored in an isolated directory, not in the web root.
- Uploaded files shall not be executed by the backend during scanning (static analysis only).
- API endpoints shall require authentication (except `/health`).
- Database credentials shall be stored in environment variables, not in source code.

### NFR-04: Usability
- The web dashboard shall be usable by a person with basic ML knowledge.
- Error messages shall be descriptive and actionable.

### NFR-05: Maintainability
- The codebase shall follow a modular structure separating scanners, API routes, and services.
- Each scanner module shall be independently testable.

### NFR-06: Portability
- The backend shall run on Python 3.10+ (developed on Python 3.12).
- Docker configuration shall be provided for reproducible deployment.

### NFR-07: Scalability (Limited)
- For the academic prototype, a single-instance deployment is sufficient.
- The modular architecture shall support future horizontal scaling if needed.

---

## 8. System Inputs

| Input Type | Format(s) | Description |
|---|---|---|
| AI Model File | `.pkl`, `.h5`, `.pt`, `.onnx`, `.joblib`, `.bin`, `.safetensors` | Model artifact to be scanned |
| Dataset File | `.csv`, `.json`, `.parquet`, `.jsonl` | Training/validation dataset |
| Dependency File | `requirements.txt`, `pyproject.toml` | Python package dependency list |
| Known-Good Hash | SHA-256 string | User-supplied hash for integrity verification |
| User Credentials | Username / Password | Authentication |
| Scan Configuration | JSON (via API) | Optional scan parameters |

---

## 9. System Outputs

| Output Type | Format | Description |
|---|---|---|
| Security Report | JSON + Markdown | Structured findings per scan |
| Findings List | JSON | Individual security findings with severity |
| Risk Score | Numeric (0–10) | Aggregated risk score per scan |
| Provenance Record | JSON | Artifact origin and integrity metadata |
| Alert | In-app notification | Alert for critical/high findings |
| Quarantine Flag | Database flag | Prevents further processing of flagged artifact |
| Dashboard Display | Web UI | Visual summary of scans and findings |

---

## 10. Assumptions

1. Users upload AI artifacts in supported formats; the system does not need to handle every possible ML framework format.
2. The system performs **static analysis only** — uploaded files are never executed.
3. The vulnerability reference database (for dependency scanning) will initially be a curated local JSON file; integration with live NVD/OSV feeds is a future enhancement.
4. The project is deployed on a single machine for academic demonstration.
5. Internet connectivity is available for package installation during setup.
6. Users have basic knowledge of AI/ML workflows and can interpret security findings.

---

## 11. Constraints

| Constraint | Description |
|---|---|
| **Time** | 12-week development schedule; Week 2 is system design only |
| **Team Size** | Single developer (MCA student) |
| **Academic Context** | Must be explainable for viva/review; not a production system |
| **No Live Execution** | Uploaded files are scanned statically; no sandboxed execution |
| **No Offensive Capability** | The system only detects and flags; it does not replicate attacks |
| **Hardware** | Standard student laptop; no GPU cluster or cloud infrastructure |

---

## 12. Project Limitations

1. **Statistical anomaly detection is heuristic.** The dataset scanner uses statistical indicators; it cannot guarantee detection of sophisticated, well-crafted poisoning attacks that closely resemble clean data.
2. **Pickle scanning is static.** The system checks for pickle protocol markers in model files but does not execute the pickle payload. This reduces false negatives but cannot catch all embedded code.
3. **Dependency vulnerability DB is local.** Without live NVD/OSV integration, the vulnerability database may lag behind newly disclosed CVEs.
4. **No runtime monitoring.** AISecGuard scans artifacts before use; it does not monitor deployed models during inference.
5. **Limited model format support.** Full deep inspection of every ML framework's binary format is not feasible; focus is on commonly used formats.
6. **Single-user demo.** Multi-tenant isolation, role-based access control, and enterprise authentication are not implemented in the academic prototype.

---

## 13. Future Enhancements

> These items are **not** part of the current 12-week project scope. They are documented here for completeness and future work.

| Enhancement | Description |
|---|---|
| Live NVD/OSV integration | Real-time CVE feed for dependency scanning |
| Runtime inference monitoring | Monitor model predictions for anomalous output distributions |
| LLM prompt injection detection | Detect prompt injection patterns in LLM-based systems |
| MITRE ATLAS attack simulation | Controlled simulation of documented AI attack techniques |
| Differential privacy analysis | Assess whether training datasets expose private information |
| CI/CD integration | GitHub Actions / GitLab CI plugin for automated scanning on push |
| Multi-tenant support | Role-based access control for enterprise use |
| Model explainability checks | Detect anomalous behaviour via SHAP/LIME explanation analysis |
| Federated model provenance | Blockchain-based tamper-evident provenance ledger |
| SBOM/AIBOM export | Export AI-BOM records in CycloneDX or SPDX format |
