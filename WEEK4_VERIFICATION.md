# AISecGuard — Week 4 Final Verification Report

**Date of Verification:** 2026-10-03  
**Project Status:** WORKING  

---

## 1. System Component Status

| Component | Status | Verification Detail |
|---|---|---|
| **Backend** | **PASS** | FastAPI server initializes cleanly; `/health` and `/docs` return HTTP 200 |
| **Database** | **PASS** | SQLite/SQLAlchemy operational; Alembic migration `6e6a6aa64397` applied |
| **Authentication** | **PASS** | Baseline auth schemas and password hashing operational (full JWT flow deferred to Week 5) |
| **File Upload** | **PASS** | UUID storage path, extension validation, size checking, SHA-256 baseline hashing verified |
| **Model Scanner** | **PASS** | Static opcode walking (pickletools), safe formats (SafeTensors/ONNX), byte string scan |
| **Dataset Scanner** | **PASS** | Static checks on CSV/JSON/JSONL/Parquet; detects empty, malformed, duplicates, outliers |
| **Dependency Scanner**| **PASS** | Parses requirements.txt and pyproject.toml; flags unpinned, broad ranges, typosquatting |
| **Risk Assessment** | **PASS** | Central engine computes numeric score (`INFORMATIONAL=0, LOW=1, MED=3, HIGH=6, CRIT=10`) |
| **API Integration** | **PASS** | Direct upload-and-scan (`/api/v1/scans/model`, `/dataset`, `/dependency`, `/upload`) & `/scan` alias |
| **Tests** | **PASS** | 72 automated pytest test cases passing in 1.21s with 0 errors |
| **Security Validation** | **PASS** | Zero unsafe deserialization (`pickle.load` never invoked); path traversal protection active |
| **Regression Tests** | **PASS** | All 38 original Week 1–3 tests continue to pass with zero regressions |

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

tests\test_api_week4.py .........                                        [ 12%]
tests\test_artifacts.py ...........                                      [ 27%]
tests\test_dataset_scanner.py ........                                   [ 38%]
tests\test_dependency_scanner.py ......                                  [ 47%]
tests\test_health.py ...                                                 [ 51%]
tests\test_integrity.py ......                                           [ 59%]
tests\test_model_scanner.py ............                                 [ 76%]
tests\test_risk_engine.py .......                                        [ 86%]
tests\test_scans.py ..........                                           [100%]

======================== 72 passed, 1 warning in 1.21s ========================
```

- **Total tests:** 72
- **Passed:** 72
- **Failed:** 0
- **Skipped:** 0

---

## 3. Scanner Performance Benchmarks

| Scanner Module | Target Sample | Scan Time |
|---|---|---|
| **Dependency Scanner** | `requirements_unpinned.txt` | 1.49 ms |
| **Model Scanner** | `sample_model.safetensors` | 0.12 ms |
| **Dataset Scanner** | Small CSV (10 rows) | 264.71 ms (cold start) |
| **Dataset Scanner** | Medium CSV (1,000 rows) | 13.42 ms |

---

## 4. Academic Disclaimer

AISecGuard is an academic security prototype. Scanner findings are heuristic indicators produced through static analysis. A finding flags a potential security risk and does not guarantee that an artifact is malicious or actively exploitable.
