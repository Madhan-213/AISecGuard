# AISecGuard — Week 5 Baseline Audit

**Audit Date:** 2026-10-10
**Auditor:** Senior Full-Stack Developer / AI Security Engineer
**Purpose:** Establish pre-change baseline before Week 5 improvements

---

## 1. Repository Overview

| Item | Value |
|---|---|
| Project | AISecGuard |
| Language | Python 3.12 (backend), JavaScript/JSX (frontend) |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 |
| Test Suite | pytest (97 tests, 100% passing at baseline) |

---

## 2. Feature Status at Baseline

### 2.1 Backend — WORKING

| Feature | Status | Notes |
|---|---|---|
| FastAPI server | WORKING | /health, /docs, /redoc functional |
| JWT Authentication | WORKING | Register, login, bcrypt, HS256 tokens |
| Artifact Upload | WORKING | SHA-256, size validation, secure storage |
| Model Scanner | WORKING | pkl/joblib opcode scan, PyTorch/HDF5/ONNX magic bytes |
| Dataset Scanner | WORKING | CSV/JSON/JSONL/Parquet static analysis |
| Dependency Scanner | WORKING | requirements.txt + pyproject.toml |
| Risk Assessment Engine | WORKING | Weighted scoring system |
| Scan History | WORKING | Persisted scan records |
| SHA-256 Integrity | WORKING | Computed on upload |
| Report Generation | WORKING | JSON and PDF (reportlab) |
| Quarantine System | WORKING | Artifact quarantine/release with audit log |
| SSE Status Stream | WORKING | Real-time scan status events |

### 2.2 Tests at Baseline: 97 passed, 0 failed

| Test File | Tests |
|---|---|
| test_api_week4.py | 9 |
| test_api_week5.py | 5 |
| test_artifacts.py | 11 |
| test_auth.py | 8 |
| test_dataset_scanner.py | 8 |
| test_dependency_scanner.py | 6 |
| test_health.py | 3 |
| test_integrity.py | 6 |
| test_model_scanner.py | 12 |
| test_quarantine.py | 7 |
| test_report_export.py | 5 |
| test_risk_engine.py | 7 |
| test_scans.py | 10 |
| **TOTAL** | **97** |

---

## 3. Issues Identified at Baseline

### 3.1 Model Scanner Gaps
- SafeTensors: Only reports format informational — no header metadata inspection
- ONNX: Only magic bytes check, no graph structure inspection
- No explicit unsupported format distinction

### 3.2 Homepage Design
- 59KB JSX file — extremely large for a single component
- Complex multi-section layout, heavy animations
- Dark neon/terminal aesthetic — generic for a security product
- Some marketing claims do not match actual implementation

### 3.3 Documentation
- WEEK5_BASELINE.md did not exist prior to this audit
- WEEK5_VERIFICATION.md needs updating after Week 5 work

---

## 4. Week 5 Improvement Plan

1. Improve Model Scanner with SafeTensors header inspection and better ONNX analysis
2. Homepage complete redesign — professional, modern, credible aesthetic
3. Accuracy corrections in frontend (remove unsupported claims)
4. New tests for Week 5 scenarios
5. Update all documentation

*Generated during Week 5 development phase — 2026-10-10*
