# Week 3 Progress Report - AISecGuard

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks
**Student:** MCA 3rd Semester Final Year Project
**Week:** 3 of 12
**Date:** September 2026

---

## 1. Tasks and Work Completed

### 1.1 Foundation Fixes

#### A. Python Import Path Fix
- Added `pytest.ini` with `pythonpath = backend` so all test files import `from app.xxx` directly.
- Removed the fragile `sys.path.insert` hack from `test_health.py`.

#### B. pytest -q Works from Root
- `pytest.ini` sets `testpaths = tests` so `pytest -q` from the project root collects all tests automatically.
- `tests/conftest.py` provides in-memory SQLite test engine and FastAPI dependency override for full test isolation.

#### C. Docker Build Context Fix
- **Problem**: `backend/Dockerfile` had `COPY ../requirements.txt` while `docker-compose.yml` set `context: ./backend`. Docker cannot copy files above the build context root.
- **Fix**: `docker-compose.yml` now uses `context: .` (project root) and `dockerfile: backend/Dockerfile`. `COPY requirements.txt` works correctly.
- The bind-mount of `./backend:/app` was also removed from the compose file — the built image is used instead.

#### D. Secrets and .env
- No credentials hardcoded anywhere in source.
- `.env` is in `.gitignore`. `.env.example` templates all required variables.

---

### 1.2 Database Foundation

**Location:** `backend/app/db/`

| File | Purpose |
|---|---|
| `base.py` | SQLAlchemy `DeclarativeBase` shared by all ORM models |
| `session.py` | Engine, `SessionLocal`, `get_db()` FastAPI dependency |

- Engine reads `DATABASE_URL` from environment (defaults to SQLite for local dev).
- SQLite WAL mode enabled for concurrent reads in development.
- PostgreSQL used in Docker via `DATABASE_URL=postgresql+psycopg2://...`.

---

### 1.3 SQLAlchemy ORM Models

**Location:** `backend/app/models/`

**enums.py** - Shared enumerations:
- `ArtifactType`: MODEL, DATASET, DEPENDENCY, OTHER
- `ArtifactStatus`: UPLOADED, PENDING_SCAN, SCANNING, SCANNED, QUARANTINED, FAILED
- `ScanStatus`: PENDING, RUNNING, COMPLETED, FAILED
- `RiskLevel`: UNKNOWN, LOW, MEDIUM, HIGH, CRITICAL
- `FindingSeverity`: INFORMATIONAL, LOW, MEDIUM, HIGH, CRITICAL
- `FindingType`: UNSAFE_SERIALIZATION, SUSPICIOUS_REFERENCE, INTEGRITY_VIOLATION, LARGE_FILE_WARNING, UNKNOWN_FORMAT, PROVENANCE_RECORDED, OTHER

**artifact.py** - Fields: id (UUID), filename, original_filename, artifact_type, file_size, file_extension, sha256, storage_path, status, uploaded_at. Relationships: provenance_records, scans.

**provenance.py** - Fields: id, artifact_id (FK), source_url (nullable), sha256_hash, file_size, uploaded_at, uploader_id (nullable - auth not in Week 3).

**scan.py** - Fields: id, artifact_id (FK), scan_type, status, risk_level, started_at, completed_at. Relationships: artifact, findings.

**finding.py** - Fields: id, scan_id (FK), finding_type, severity, title, description, evidence, recommendation, created_at.

All models use SQLAlchemy 2.x `Mapped`/`mapped_column` typed syntax.

---

### 1.4 Alembic Migrations

**Location:** `backend/alembic/`, `backend/alembic.ini`

- Alembic initialised inside `backend/`.
- `env.py` configured for autogenerate: imports all models, reads `DATABASE_URL` from environment.
- Initial migration `initial_schema_week3` generated - detects all 4 tables automatically.
- `alembic upgrade head` verified to run successfully.
- In Docker: Dockerfile CMD runs `alembic upgrade head` before starting the server.
- In development/tests: `Base.metadata.create_all()` called in FastAPI lifespan handler.

---

### 1.5 Artifact Storage

**Location:** `backend/app/utils/storage.py`

Security measures:
- Original filenames are NEVER used as storage paths (prevents path traversal).
- Files stored as `{UUID}{original_extension}` only.
- Files written binary-only - never executed.
- Upload directory created automatically if missing.

---

### 1.6 SHA-256 Utility

**Location:** `backend/app/utils/hashing.py`

Three functions:
- `compute_sha256_file(path)` - chunked 64 KiB reads, safe for large files
- `compute_sha256_bytes(data)` - for in-memory byte objects
- `compute_sha256_stream(stream)` - rewinds stream to position 0 after reading

---

### 1.7 Artifact Upload API

**Endpoint:** `POST /api/v1/artifacts/upload` (multipart/form-data)

Validation enforced:
- Filename required
- Extension must be in allowed list (from config: model/dataset/dependency extensions)
- Empty files rejected (HTTP 400)
- Oversized files rejected (HTTP 413) - limit from `MAX_UPLOAD_SIZE_MB`
- SHA-256 computed immediately on upload
- File stored with UUID-based safe name
- ProvenanceRecord created as integrity baseline
- Artifact status set to PENDING_SCAN

Note: Extension validation is basic input filtering only. It is not malware detection.

---

### 1.8 Provenance Scanner

**Location:** `backend/app/scanners/provenance_scanner.py`

Responsibilities:
1. Computes SHA-256 of the stored artifact on disk
2. Records provenance metadata (hash, file size, timestamp, optional source URL)
3. Detects hash mismatch when `expected_hash` is provided by the caller
4. Detects hash mismatch when a `baseline_hash` from a previous record is provided

Design: The hash computed at first upload is the BASELINE. It is NOT flagged as a violation. An INTEGRITY_VIOLATION finding is only created when comparing against a trusted hash that differs from the computed hash.

---

### 1.9 Model Security Scanner

**Location:** `backend/app/scanners/model_scanner.py`

CRITICAL: Static analysis only. Files are NEVER loaded, executed, or deserialized.

| Format | Detection Method | Key Finding |
|---|---|---|
| .pkl / .pickle / .joblib | Pickle opcode walk via pickletools.genops | UNSAFE_SERIALIZATION (HIGH) always; SUSPICIOUS_REFERENCE (CRITICAL) if dangerous module refs found |
| .pt / .pth | ZIP magic bytes check | UNSAFE_SERIALIZATION MEDIUM (zip) or HIGH (legacy) |
| .h5 | HDF5 magic signature | UNSAFE_SERIALIZATION MEDIUM |
| .onnx | Format detection | INFORMATIONAL |
| .safetensors | Format identification | INFORMATIONAL |
| .bin | Generic binary | INFORMATIONAL |

Suspicious references detected: os, subprocess, eval, exec, __import__, Popen, system, socket, urllib, etc.

---

### 1.10 Scan Orchestrator

**Location:** `backend/app/services/scan_service.py`

Pipeline per scan:
1. Fetch artifact from DB
2. Create Scan record, mark artifact SCANNING
3. Run provenance check (always)
4. If artifact type is MODEL: run model scanner
5. Collect all findings
6. Calculate preliminary risk level from max finding severity
7. Persist all Finding records
8. Mark scan COMPLETED, artifact SCANNED
9. Return completed scan

Risk logic (Week 3 simplified): No findings = LOW. INFORMATIONAL only = LOW. Any MEDIUM = MEDIUM. Any HIGH = HIGH (integrity violation forces HIGH minimum). Any CRITICAL = CRITICAL.

---

### 1.11 API Endpoints Implemented

| Method | Path | Status |
|---|---|---|
| GET | /health | Implemented, tested |
| GET | /docs | Working (Swagger UI) |
| GET | /openapi.json | Working |
| POST | /api/v1/artifacts/upload | Implemented, tested |
| GET | /api/v1/artifacts/ | Implemented, tested |
| GET | /api/v1/artifacts/{id} | Implemented, tested |
| POST | /api/v1/scans/ | Implemented, tested |
| GET | /api/v1/scans/ | Implemented, tested |
| GET | /api/v1/scans/{id} | Implemented, tested |
| GET | /api/v1/findings/ | Implemented, tested |
| GET | /api/v1/findings/{id} | Implemented, tested |

Pydantic v2 schemas in `backend/app/schemas/` for all request/response bodies.

---

### 1.12 Test Suite

**38 tests passing, 0 failures.**

| File | Count | Coverage |
|---|---|---|
| test_health.py | 3 | Health endpoint, Swagger docs, OpenAPI schema |
| test_integrity.py | 6 | SHA-256 known values, file, stream, rewind, cross-method consistency |
| test_artifacts.py | 11 | Valid uploads (.pkl/.csv/.txt), empty rejection, bad extension, oversized, SHA-256 correctness, list/get, 404 |
| test_model_scanner.py | 8 | Safe pickle, suspicious pickle CRITICAL, joblib, safetensors, pytorch zip, hdf5, onnx |
| test_scans.py | 10 | Scan creation, findings produced, HIGH/CRITICAL risk for suspicious model, missing artifact 404, list, get, findings list/get, 404 |

Test isolation: fresh SQLite tables per test function, FastAPI dependency overrides, no cross-test contamination.

---

### 1.13 Sample Test Artifacts

**Location:** `samples/`

| File | Purpose |
|---|---|
| models/safe_model.pkl | Benign pickle dict, no dangerous opcodes |
| models/test_suspicious_opcode.pkl | Static test fixture with GLOBAL os.system reference (never executed, intentionally incomplete) |
| datasets/sample_dataset.csv | 4-row CSV for dataset upload testing |
| dependencies/sample_requirements.txt | Sample requirements.txt for dependency scanner testing |
| integrity_test.bin + .sha256 | Baseline integrity test file with expected hash stored |

---

### 1.14 Scanner Architecture Decision

Both `backend/app/scanners/` and root-level `scanners/` existed:
- `backend/app/scanners/` - actual scanner implementations (model_scanner.py, provenance_scanner.py). This is the authoritative location integrated with the API.
- Root `scanners/` - empty stub directories from Week 2. Retained but clearly documented as stubs for potential future standalone CLI use. No duplicate implementations.

---

## 2. Roadblocks and Challenges

### 2.1 Docker Build Context Bug
`COPY ../requirements.txt` in the Dockerfile with `context: ./backend` fails because Docker cannot reach outside the build context. Fix: move context to project root.

### 2.2 Python Import Path
`pytest -q` from the project root failed because `from app.xxx import ...` resolves relative to `backend/` not the root. Fix: `pytest.ini` with `pythonpath = backend`.

### 2.3 SQLAlchemy Table Lifecycle in Tests
The FastAPI startup calls `create_all` against the production engine. Tests needed their own SQLite engine. Fix: moved `create_all` to the FastAPI `lifespan` asynccontextmanager (not module-level), then patched `app.db.session.engine` to the test engine before TestClient context opens.

### 2.4 FastAPI Empty Path Routes
FastAPI 0.137 raises `FastAPIError: Prefix and path cannot be both empty` for `@router.get("")` when a prefix is set. Fix: change all empty-string paths to `"/"`.

### 2.5 Pydantic V2 Deprecation
`class Config:` inner class was deprecated in Pydantic V2. Fix: `model_config = {...}` dict-based configuration.

### 2.6 Pickle Test Fixture Safety
The suspicious pickle test fixture needed to contain a GLOBAL opcode reference to `os.system` detectable by static analysis, but without actually executing anything at fixture-creation time. Fix: construct raw pickle bytes manually using protocol opcodes rather than using `pickle.dumps()` with a real callable.

---

## 3. Plan for Week 4

**Focus: Dataset Security Scanner + Dependency Scanner**

1. Dataset Security Scanner (`backend/app/scanners/dataset_scanner.py`)
   - CSV/JSON/Parquet parsing using pandas
   - Label distribution analysis (class imbalance)
   - Statistical outlier detection
   - Duplicate row detection
   - Missing value pattern analysis

2. Dependency Scanner (`backend/app/scanners/dependency_scanner.py`)
   - Parse requirements.txt and pyproject.toml
   - Detect unpinned/loosely-pinned packages
   - Known vulnerable package version detection
   - Deprecated package flagging

3. Expanded scan orchestration: route DATASET and DEPENDENCY artifacts to correct scanners

4. MITRE ATLAS technique mapping per finding type

5. Target: 30+ additional tests

---

## 4. Technologies Used

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12.10 | Primary language |
| FastAPI | 0.137.0 | REST API framework |
| SQLAlchemy | 2.1.1 | ORM and database abstraction |
| Alembic | 1.20.0 | Database schema migrations |
| Pydantic | 2.13.4 | Data validation |
| pydantic-settings | 2.15.0 | Environment config |
| pytest | 9.1.1 | Test framework |
| SQLite | built-in | Development and test database |
| PostgreSQL | 15 (Docker) | Production database |
| pickletools | stdlib | Safe static pickle opcode inspection |
| hashlib | stdlib | SHA-256 implementation |
| Docker / Docker Compose | - | Container orchestration |

---

## 5. Development Hours

**Estimated: 10 hours**

- Foundation fixes (imports, Docker, pytest): 1.5 hrs
- Database models and SQLAlchemy setup: 1.5 hrs
- Alembic migrations: 0.5 hrs
- Storage and SHA-256 utilities: 0.5 hrs
- Artifact upload API: 1 hr
- Provenance scanner: 1 hr
- Model security scanner: 1.5 hrs
- Scan orchestrator service: 0.5 hrs
- Test suite (38 tests): 1.5 hrs
- Documentation: 0.5 hrs

---

## 6. Key Learning Outcomes

**Static Security Analysis Without Execution**
The model scanner uses `pickletools.genops()` to walk pickle opcodes as a read-only generator. No deserialization occurs. This is the same principle used by antivirus static scanners. The distinction between "pickle format detected (always risky)" and "dangerous module reference found (specifically suspicious)" prevents false positives.

**Test Database Isolation Pattern**
The correct pattern for testing database-backed FastAPI apps: patch the SQLAlchemy engine before TestClient opens, override the `get_db` dependency, drop and recreate tables per test function for full isolation.

**Docker Build Context**
Files above the build context root are inaccessible during `COPY`. Moving context to the project root is the correct fix when backend code needs access to root-level files like `requirements.txt`.

**Hash Baseline vs Hash Violation**
A SHA-256 computed at first upload is a baseline, not evidence of tampering. A violation is only reported when a trusted baseline hash from a previous record differs from the current computed hash.

---

## 7. Pipeline Verification

The full Week 3 pipeline verified end-to-end via pytest TestClient:

```
UPLOAD .pkl
  -> SHA-256 computed and verified
  -> File stored as UUID.pkl (safe path)
  -> ProvenanceRecord created (baseline)
  -> Artifact status: PENDING_SCAN

POST /api/v1/scans {artifact_id}
  -> Provenance check runs
  -> Model scanner runs (static analysis only)
  -> Findings created and persisted
  -> Risk level: HIGH or CRITICAL (suspicious pickle)
  -> Scan status: COMPLETED
  -> Artifact status: SCANNED

GET /api/v1/scans/{id}     -> Returns scan + findings
GET /api/v1/findings/{id}  -> Returns individual finding with evidence
```

All 38 tests pass. `python -m compileall backend` passes with no errors.
