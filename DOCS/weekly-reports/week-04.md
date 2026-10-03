# AISecGuard — Weekly Progress Report (Week 4)

**Project Name:** AISecGuard — Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Phase:** Week 4 — Multi-Modal Static Scanners & Central Risk Engine  
**Date:** October 2026  

---

## 1. Tasks Completed

1. **Dataset Security Scanner:**
   - Implemented `scanners.dataset_scanner` with static parsers for `.csv`, `.json`, `.jsonl`, and `.parquet`.
   - Built 11 rules (`DATA-001` through `DATA-011`) covering file validation, structural anomalies, and heuristic data poisoning indicators (high duplicate concentration, extreme numerical outliers, class imbalance, missing values).

2. **Dependency Security Scanner:**
   - Implemented `scanners.dependency_scanner` supporting `requirements.txt` and `pyproject.toml`.
   - Built 7 rules (`DEP-001` through `DEP-007`) detecting unpinned dependencies, overly broad version ranges, typosquatting candidates using Levenshtein distance, and suspicious package naming patterns.

3. **Improved Model Security Scanner:**
   - Improved static opcode analysis (`pickletools.genops`), byte pattern scanning for embedded commands (`os.system`, `/bin/sh`), and format detection (`.pkl`, `.pt`, `.h5`, `.onnx`, `.safetensors`, `.bin`).
   - Added SHA-256 calculation and large file warnings (>500MB).
   - Created modular scanner package `scanners/model_scanner` while maintaining backwards compatibility with `backend/app/scanners/model_scanner.py`.

4. **Central Risk Assessment Engine:**
   - Implemented `app.services.risk_engine` using transparent weighted scoring (`INFORMATIONAL=0`, `LOW=1`, `MEDIUM=3`, `HIGH=6`, `CRITICAL=10`).
   - Integrated critical count overrides and explainable severity breakdown generation.

5. **API & Database Integration:**
   - Added `risk_score` column to `scans` table and `rule_id` column to `findings` table with an Alembic batch migration for SQLite/PostgreSQL compatibility.
   - Added direct upload-and-scan endpoints: `POST /api/v1/scans/model`, `/dataset`, `/dependency`, and `/upload`, plus singular `/api/v1/scan` alias.

6. **Comprehensive Automated Testing & Test Fixtures:**
   - Created safe synthetic test fixtures in `tests/fixtures/` (no live malware).
   - Created unit tests for dataset scanner (8 tests), dependency scanner (6 tests), risk engine (7 tests), model scanner extensions (4 tests), and Week 4 API integration (9 tests).
   - Total test suite expanded from 38 baseline tests to **72 tests, 100% passing**.

---

## 2. Challenges & Solutions

1. **ARM64 Wheels for Data Science Dependencies:**
   - *Challenge:* `pandas`, `numpy`, and `scipy` were missing from the local Python 3.12 ARM64 environment.
   - *Solution:* Installed official pre-built `win_arm64` wheels for `numpy`, `scipy`, and `pandas`.

2. **SQLite DDL Limitations in Alembic:**
   - *Challenge:* SQLite does not support `ALTER TABLE ... ALTER COLUMN` syntax directly.
   - *Solution:* Used Alembic's `batch_alter_table` context with `server_default` for non-null integer columns to ensure compatibility with SQLite development and PostgreSQL production.

3. **Extreme Outlier Detection in Small Datasets:**
   - *Challenge:* Thomson's theorem bounds sample z-scores by $(N-1)/\sqrt{N}$. In small 10-row samples, $z \le 2.85$, making a 5-sigma outlier mathematically impossible.
   - *Solution:* Tuned sample sizes and synthetic fixtures to ensure statistical rigor while detecting true anomalies.

---

## 3. Technologies Used

- **Core Web Framework:** FastAPI, Uvicorn, Starlette
- **ORM & Migrations:** SQLAlchemy 2.0, Alembic
- **Static Analysis & Data Science:** Pandas, NumPy, Scipy, Pickletools, Levenshtein Distance
- **Hashing & Cryptography:** Python hashlib (SHA-256)
- **Testing:** Pytest, Pytest-Asyncio, HTTPX

---

## 4. Testing Summary

| Test Suite | Purpose | Tests | Status |
|---|---|---|---|
| `test_artifacts.py` | Upload, validation, SHA-256 | 11 | PASS |
| `test_health.py` | System health & metadata | 3 | PASS |
| `test_integrity.py` | SHA-256 provenance check | 6 | PASS |
| `test_model_scanner.py` | Opcode walking & formats | 12 | PASS |
| `test_dataset_scanner.py` | Data poisoning & structure | 8 | PASS |
| `test_dependency_scanner.py` | Unpinned & typosquatting | 6 | PASS |
| `test_risk_engine.py` | Weighted scoring & breakdown | 7 | PASS |
| `test_scans.py` | Pipeline & findings | 10 | PASS |
| `test_api_week4.py` | Direct scan & API aliases | 9 | PASS |
| **Total** | | **72** | **100% PASS** |

---

## 5. Key Learning

- Safe static analysis requires zero execution of untrusted artifacts: disassembling opcodes and reading structured tables provides rich security insights without code execution risk.
- Explainability is vital in security tools: users need to see not just a raw number, but exactly which findings, rules, and weights contributed to their risk level.

---

## 6. Next Week Plan (Week 5)

1. Implement frontend UI dashboard components (React + Vite + Tailwind CSS) for file upload, scan progress visualization, and risk breakdown charts.
2. Build interactive report viewer displaying findings, evidence snippets, and remediation recommendations.
3. Implement artifact quarantine and remediation export features.
