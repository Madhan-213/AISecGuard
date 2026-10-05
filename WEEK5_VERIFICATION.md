# AISecGuard — Week 5 Final Verification Report

**Date of Verification:** 2026-10-05  
**Project Status:** WORKING  
**Total Automated Tests:** 97 passing (100%)  

---

## 1. System Component Status

| Component | Status | Verification Detail |
|---|---|---|
| **Backend API** | **PASS** | FastAPI server operational; `/health`, Swagger UI (`/docs`), OpenAPI schema verified |
| **Database & Migrations** | **PASS** | SQLite/SQLAlchemy operational; Alembic migration `a1b2c3d4e5f6` applied (`users`, `quarantine_events`) |
| **JWT Authentication** | **PASS** | Registration, login, token refresh, `/auth/me` with bcrypt hashing & HS256 tokens |
| **Artifact Quarantine** | **PASS** | `/artifacts/{id}/quarantine` and `/release` with physical file relocation & immutable audit log |
| **Report Export Engine** | **PASS** | Structured JSON remediation reports and dynamically generated PDF reports (ReportLab) |
| **Real-time SSE Stream** | **PASS** | `GET /scans/{id}/status` Server-Sent Events stream for scan execution phase progression |
| **Model Security Scanner** | **PASS** | Static pickle opcode inspection, SafeTensors/ONNX validation, zero unsafe deserialization |
| **Dataset Security Scanner** | **PASS** | CSV, JSON, Parquet checks for empty data, malformed records, outliers, and duplicates |
| **Dependency Scanner** | **PASS** | Manifest parser flags unpinned versions, permissive ranges, and known typosquats |
| **Risk Assessment Engine** | **PASS** | Central numeric scoring engine assigns 0–10 risk scores and severity classifications |
| **Frontend Web Dashboard** | **PASS** | React 19 + Vite 6 + Tailwind CSS v4 builds cleanly (`npm run build` completed in 2.56s) |
| **Test Suite** | **PASS** | **97 automated pytest tests passing with 0 failures and 0 errors** |

---

## 2. Test Execution Summary

```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0
rootdir: D:\MCA 3rd SEM\project\AISecGuard
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.13.0, asyncio-1.4.0
asyncio: mode=Mode.AUTO

tests\test_api_week4.py .........                                        [  9%]
tests\test_api_week5.py .....                                            [ 14%]
tests\test_artifacts.py ...........                                      [ 25%]
tests\test_auth.py ........                                              [ 34%]
tests\test_dataset_scanner.py ........                                   [ 42%]
tests\test_dependency_scanner.py ......                                  [ 48%]
tests\test_health.py ...                                                 [ 51%]
tests\test_integrity.py ......                                           [ 57%]
tests\test_model_scanner.py ............                                 [ 70%]
tests\test_quarantine.py .......                                         [ 77%]
tests\test_report_export.py .....                                        [ 82%]
tests\test_risk_engine.py .......                                        [ 89%]
tests\test_scans.py ..........                                           [100%]

======================= 97 passed, 1 warning in 15.82s ========================
```

- **Total tests:** 97
- **Passed:** 97
- **Failed:** 0
- **Skipped:** 0
- **Pass Rate:** 100%

---

## 3. Frontend Production Build Verification

```text
> frontend@0.0.0 build
> vite build

vite v8.3.2 building client environment for production...
transforming...
✓ 666 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-Dt2C4TY8.css   11.45 kB │ gzip:   3.33 kB
dist/assets/index-D5HGVO5p.js   745.67 kB │ gzip: 223.07 kB
✓ built in 2.56s
```

---

## 4. Academic Disclaimer

AISecGuard is an academic security prototype developed for the MCA 3rd Semester Final Year Project. Scanner findings are heuristic indicators produced through static analysis. A finding flags a potential security risk and does not guarantee that an artifact is actively exploitable.
