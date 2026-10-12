# AISecGuard

**Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks**

> MCA 3rd Semester Final Year Project
> Domain: Cybersecurity + AI/ML Supply Chain Security

---

## Current Status

```
CURRENT STATUS:
Week 5 — Frontend Dashboard (React + Vite + Tailwind CSS v4), JWT Authentication,
Artifact Quarantine System, Remediation Reports (JSON & PDF), and SSE Scan Status Stream.
97 tests passing (100%).
```

---

## Problem Statement

The rapid adoption of AI and machine learning systems has created a new attack surface: the **AI supply chain**. Unlike traditional software supply chains, the AI supply chain includes:

- **Data poisoning** — manipulating training data to alter model behaviour
- **Unsafe model serialization** — distributing `.pkl` files with embedded malicious code
- **Model tampering** — modifying model weights post-training without detection
- **Backdoored pre-trained models** — distributing compromised models via public hubs
- **Malicious AI/ML dependencies** — vulnerable or compromised Python packages

No unified scanning tool currently exists for AI/ML artifacts in the same way that vulnerability scanners exist for traditional software. AISecGuard addresses this gap.

> Research context: The number of AI-related CVEs increased by 34.6% year-over-year (H1 2026) and malicious open-source packages grew by 73% (Recorded Future, 2026 - reviewed in Week 1 literature review).

---

## Objectives

1. Detect integrity violations in AI models, datasets, and dependencies
2. Verify provenance of AI artifacts (origin, lineage, hash integrity)
3. Scan AI model files for unsafe serialization and tampering indicators
4. Scan datasets for statistical anomalies and data poisoning indicators
5. Scan AI/ML dependencies for known CVEs
6. Classify findings by severity (Critical to Info)
7. Generate structured security reports
8. Provide mitigation actions (alerts, quarantine, remediation recommendations)
9. Provide a web dashboard for security monitoring

---

## Architecture Overview

```
User
  |
  v
React Web Dashboard (Vite + Tailwind CSS)  [Designed - Week 6+]
  |
  v
FastAPI Backend (Python 3.12)  [Working]
  |
  v
AISecGuard Security Engine
  +-- Model Security Scanner       [Implemented - Week 3]
  +-- Dataset Security Scanner     [Designed - Week 4]
  +-- Dependency Scanner           [Designed - Week 4]
  +-- Provenance & Integrity       [Implemented - Week 3]
  +-- Risk Assessment Engine       [Partially - Week 3 simplified]
  +-- Attack Detection Engine      [Designed - Week 4-5]
  +-- Mitigation Engine            [Designed - Week 4-5]
  +-- Report Generator             [Designed - Week 5]
  |
  v
PostgreSQL Database + Artifact Storage  [Working]
```

---

## Core Modules

| Module | Description | Status |
|---|---|---|
| Model Security Scanner | Static pickle opcode inspection, format detection, SafeTensors/ONNX validation | Implemented & Hardened (Week 3-5) |
| Provenance & Integrity Checker | SHA-256 baseline recording, hash mismatch detection | Implemented (Week 3) |
| Artifact Upload API | Multipart upload, validation, safe storage, provenance recording | Implemented (Week 3) |
| Scan Orchestrator | Pipeline: provenance check + model scan + risk calculation | Implemented (Week 3) |
| Database (SQLAlchemy + Alembic) | ORM models, migrations (`users`, `quarantine_events`, etc.) | Implemented (Week 3-5) |
| Dataset Security Scanner | Statistical anomaly and heuristic poisoning indicator detection | Implemented (Week 4) |
| Dependency Scanner | Static dependency manifest analysis, unpinned packages, typosquatting heuristics | Implemented (Week 4) |
| Risk Assessment Engine | Central transparent scoring (INFORMATIONAL=0, LOW=1, MED=3, HIGH=6, CRIT=10) | Implemented (Week 4-5) |
| JWT Authentication | User registration, login, refresh token, bcrypt hashing, HS256 tokens | Implemented (Week 5) |
| Mitigation / Quarantine Engine | Physical file isolation, release workflow, immutable audit log | Implemented (Week 5) |
| Report Generator | JSON structured export and PDF remediation reports (ReportLab) | Implemented (Week 5) |
| Web Dashboard & Homepage | React 19 + Vite 6 + Tailwind CSS v4 redesigned UI, scan details & auth | Implemented (Week 5) |
| Real-time Telemetry | Server-Sent Events (SSE) `/scans/{id}/status` live scan stream | Implemented (Week 5) |
| API Layer | FastAPI REST API with authenticated endpoints and OpenAPI docs | Fully operational |

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Python + FastAPI + Uvicorn | 3.12 / 0.137 |
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 | Operational |
| Database | SQLite (dev) / PostgreSQL (prod) | Built-in / 15 |
| ORM | SQLAlchemy + Alembic | 2.0+ / 1.13+ |
| Auth | PyJWT + bcrypt / passlib | Operational (HS256) |
| Report Generation | ReportLab (PDF) + JSON Engine | Operational |
| Analysis | pandas, numpy, scipy, packaging | Latest |
| Infrastructure | Docker + Docker Compose | Operational |
| Version Control | Git + GitHub | - |

---

## Repository Structure

```
AISecGuard/
+-- backend/                     FastAPI backend application
|   +-- main.py                  App entry point + /health endpoint
|   +-- Dockerfile               Backend container definition (fixed Week 3)
|   +-- alembic.ini              Alembic configuration
|   +-- alembic/                 Database migration scripts
|   |   +-- env.py               Configured for autogenerate
|   |   +-- versions/            Migration files
|   +-- app/
|       +-- core/config.py       Application settings (Pydantic v2)
|       +-- db/                  Database layer (NEW Week 3)
|       |   +-- base.py          SQLAlchemy DeclarativeBase
|       |   +-- session.py       Engine, SessionLocal, get_db()
|       +-- models/              SQLAlchemy ORM models (NEW Week 3)
|       |   +-- enums.py         Shared enumerations
|       |   +-- artifact.py      Artifact model
|       |   +-- provenance.py    ProvenanceRecord model
|       |   +-- scan.py          Scan model
|       |   +-- finding.py       Finding model
|       +-- api/v1/              API layer
|       |   +-- router.py        API v1 router
|       |   +-- endpoints/       (NEW Week 3)
|       |       +-- artifacts.py Upload + list + get
|       |       +-- scans.py     Create + list + get
|       |       +-- findings.py  List + get
|       +-- schemas/             Pydantic v2 request/response schemas (NEW)
|       |   +-- artifact.py
|       |   +-- scan.py
|       +-- scanners/            Security scanner implementations (NEW Week 3)
|       |   +-- model_scanner.py Static model analysis (pickle/pytorch/hdf5/onnx)
|       |   +-- provenance_scanner.py SHA-256 + integrity checking
|       +-- services/            Business logic
|       |   +-- scan_service.py  Scan orchestrator pipeline
|       +-- utils/               Utilities (NEW Week 3)
|           +-- hashing.py       Chunked SHA-256
|           +-- storage.py       Safe UUID-based artifact storage
|
+-- frontend/                    React dashboard (Designed - Week 6+)
|
+-- scanners/                    Stub directories (Week 2 placeholder)
|   +-- model_scanner/           (stub - no implementation)
|   +-- dataset_scanner/         (stub - no implementation)
|   +-- dependency_scanner/      (stub - no implementation)
|
+-- tests/                       pytest test suite
|   +-- conftest.py              Test fixtures and DB isolation
|   +-- test_health.py           Health + docs endpoints
|   +-- test_integrity.py        SHA-256 hashing tests
|   +-- test_artifacts.py        Artifact upload and retrieval
|   +-- test_model_scanner.py    Model scanner static analysis
|   +-- test_scans.py            Scan pipeline and findings
|
+-- DOCS/                        Project documentation
|   +-- weekly-reports/
|   |   +-- week-02.md
|   |   +-- week-03.md           (NEW)
|   +-- requirements.md
|   +-- threat-model.md
|   +-- system-architecture.md
|   +-- module-design.md
|   +-- database-design.md
|   +-- api-design.md
|   +-- technology-stack.md
|
+-- samples/                     Test artifacts (NEW Week 3)
|   +-- generate_samples.py
|   +-- models/
|   +-- datasets/
|   +-- dependencies/
|
+-- pytest.ini                   pytest configuration (NEW Week 3)
+-- requirements.txt             Python dependencies (updated Week 3)
+-- .env.example                 Environment variable template
+-- .gitignore
+-- docker-compose.yml           Fixed in Week 3
```

---

## How to Run

### Prerequisites
- Python 3.10+ (tested on 3.12.10)
- pip

### 1. Clone and install dependencies

```bash
git clone https://github.com/<your-username>/AISecGuard.git
cd AISecGuard
pip install -r requirements.txt
```

### 2. Create a .env file

```bash
cp .env.example .env
# Edit .env if needed (SQLite is default for local dev)
```

### 3. Run the backend

```bash
cd backend
uvicorn main:app --reload
# API running at http://localhost:8000
# Swagger documentation at http://localhost:8000/docs
```

### 4. Run the React frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard accessible at http://localhost:5173
```

### 5. Run tests (97 tests, 100% passing)

```bash
# From project root:
pytest -v
```

### 6. Test the upload pipeline

```bash
# Upload a model file
curl -X POST http://localhost:8000/api/v1/artifacts/upload \
  -F "file=@samples/models/safe_model.pkl"

# Trigger a scan (use the artifact_id from upload response)
curl -X POST http://localhost:8000/api/v1/scans/ \
  -H "Content-Type: application/json" \
  -d '{"artifact_id": "<id from upload>"}'

# Get scan results with findings
curl http://localhost:8000/api/v1/scans/<scan_id>

# Download remediation report
curl http://localhost:8000/api/v1/scans/<scan_id>/report?format=json
```

---

## Docker Setup

```bash
# Fixed in Week 3 - context is now project root
docker compose up -d

# Check backend health
curl http://localhost:8000/health
```

> PostgreSQL is used in Docker. SQLite is the default for local development without Docker.

---

## Project Roadmap

| Week | Focus | Status |
|---|---|---|
| Week 1 | Literature review (10 research papers) | Completed |
| Week 2 | Requirements, threat model, architecture, database/API design, initial setup | Completed |
| Week 3 | Database ORM, artifact upload, SHA-256, provenance checker, model scanner, scan pipeline, 38 tests | Implemented |
| Week 4 | Dataset scanner, dependency scanner, improved model scanner, central risk engine, 72 tests | Implemented |
| Week 5 | Attack detection engine, mitigation engine, report generator | Planned |
| Week 6 | React frontend foundation, dashboard layout | Planned |
| Week 7 | Frontend: upload UI, scan monitoring, findings view | Planned |
| Week 8 | Integration testing, end-to-end scan flow | Planned |
| Week 9 | Test samples, security evaluation | Planned |
| Week 10 | Performance testing, bug fixes | Planned |
| Week 11 | Final documentation, demo preparation | Planned |
| Week 12 | Project submission and viva preparation | Planned |

---

## Documentation

| Document | Location |
|---|---|
| Week 1 Literature Review | DOCS/Week1_Research_Papers.pdf |
| Requirements Analysis | DOCS/requirements.md |
| Threat Model | DOCS/threat-model.md |
| System Architecture | DOCS/system-architecture.md |
| Module Design | DOCS/module-design.md |
| Database Design | DOCS/database-design.md |
| API Design | DOCS/api-design.md |
| Technology Stack | DOCS/technology-stack.md |
| Dataset Security Scanner | DOCS/dataset-scanner.md |
| Dependency Security Scanner | DOCS/dependency-scanner.md |
| Model Security Scanner | DOCS/model-scanner.md |
| Risk Assessment Engine | DOCS/risk-assessment.md |
| Week 2 Progress Report | DOCS/weekly-reports/week-02.md |
| Week 3 Progress Report | DOCS/weekly-reports/week-03.md |
| Week 4 Progress Report | DOCS/weekly-reports/week-04.md |
| Week 4 Verification Report | WEEK4_VERIFICATION.md |

---

## Important Notes

- **This is an academic project** - not a production security tool.
- All scanning is **static analysis only** - uploaded files are never executed.
- The system **does not implement offensive capabilities** - only detection and flagging.
- Security claims are technically accurate - heuristic detection is clearly distinguished from guaranteed detection.
- The model scanner detecting "pickle format" is a format risk warning, not guaranteed malware detection.
- Authentication is not implemented in Week 3. uploader_id fields are stored as NULL.

---

## License

MIT License - see LICENSE file.

# Hell this is my first git branch 