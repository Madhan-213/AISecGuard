# AISecGuard - Week 4 Baseline Report

**Date:** 2026-10-03

## Baseline Test Results

All 38 existing Week 1-3 tests PASS before any Week 4 changes.

## Working Features
- FastAPI app, health endpoint, Swagger UI
- Database: SQLite, all ORM models, Alembic migration
- File upload: extension validation, size limit, SHA-256, UUID storage
- Model Scanner (static only): pickle, pytorch, hdf5, onnx, safetensors
- Provenance Scanner: hash baseline, integrity violation detection
- Scan pipeline: POST/GET scans, findings persistence
- API: artifacts, scans, findings endpoints all working

## Not Implemented (Week 4)
- Dataset Scanner (scanners/dataset_scanner/ is empty)
- Dependency Scanner (scanners/dependency_scanner/ is empty)
- Risk Assessment Engine with numeric score
- risk_score field on Scan model
- rule_id field on Finding model
- Dataset/Dependency scanning in pipeline
- Test fixtures directory
- Week 4 scanner tests
- Documentation files for Week 4

## Existing Bugs
- scanners/ top-level directories are empty
- Scan pipeline only handles MODEL type artifacts
- No numeric risk_score stored in DB
- FindingType enum too narrow for Week 4

## Existing API Endpoints
- GET /health
- POST /api/v1/artifacts/upload
- GET /api/v1/artifacts
- GET /api/v1/artifacts/{artifact_id}
- POST /api/v1/scans
- GET /api/v1/scans
- GET /api/v1/scans/{scan_id}
- GET /api/v1/findings
- GET /api/v1/findings/{finding_id}

## Test Coverage Before Week 4
- test_health.py: 3 tests PASS
- test_artifacts.py: 11 tests PASS
- test_integrity.py: 6 tests PASS
- test_model_scanner.py: 8 tests PASS
- test_scans.py: 10 tests PASS
- Total: 38 PASS

