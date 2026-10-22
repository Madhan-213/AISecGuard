# AISecGuard — Week 6 Development Documentation

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Phase:** Week 6 — Security Dashboard Integration & Full Scan Workflow  
**Date:** October 19, 2026  
**Status:** Completed & Validated  

---

## 1. Executive Summary

During Week 6, the **AISecGuard Security Dashboard** was built and integrated with the FastAPI backend. Prior to this milestone, the frontend application utilized hardcoded fallback states and local browser cache simulations. In Week 6, full end-to-end integration was established:
- Real-time aggregated statistics from the backend database.
- A 3-step scan workflow supporting AI Models (`.pkl`, `.pth`, `.pt`, `.onnx`, `.bin`, `.h5`), Datasets (`.csv`, `.json`, `.parquet`), and Dependency files (`requirements.txt`, `Pipfile`, `environment.yml`).
- Deep inspection results with severity breakdown (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL), SHA-256 cryptographic verification, rule identifiers, and actionable remediation steps.
- Quarantine management actions directly linked to backend status changes.
- Persistent scan history querying the SQLite / PostgreSQL database.

---

## 2. Architecture & Implementation Details

### 2.1 Backend Enhancements
- **New Aggregation Endpoint (`/api/v1/stats`)**:
  - Implemented in `backend/app/api/v1/endpoints/stats.py` and registered in `backend/app/api/v1/router.py`.
  - Calculates dynamic database metrics: `total_scans`, `total_findings`, `critical_findings`, `quarantined_artifacts`, `avg_risk_score`, `risk_distribution`, and `severity_distribution`.
  - Returns the 10 most recent scans with timestamps, risk scores, and artifact IDs.
- **Scan Service (`backend/app/services/scan_service.py`)**:
  - Refined scan initializations to correctly inherit the artifact type (`MODEL`, `DATASET`, or `DEPENDENCY`) rather than defaulting to generic strings.

### 2.2 Frontend Enhancements & Pages Integrated
- **API Client Layer (`frontend/src/api/client.js`)**:
  - Configured centralized Axios instance with `VITE_API_BASE_URL` fallback (`http://localhost:8000`).
  - Added structured endpoints: `statsApi.getStats()`, `scansApi.getAll()`, `scansApi.getById()`, `scansApi.uploadAndScan()`, `artifactsApi.getQuarantined()`, and `artifactsApi.releaseQuarantine()`.
  - Standardized error parsing to extract FastAPI error details (`err.response.data.detail`).
- **Dashboard Overview (`frontend/src/pages/DashboardPage.jsx`)**:
  - Connected directly to `/api/v1/stats` and `/api/v1/scans`.
  - Displays real metric cards: Total Scans, Total Findings, Critical Vulnerabilities, Quarantined Artifacts, and Average Risk Score.
  - Interactive Severity Distribution bar charts and Risk Level indicators.
  - Recent scans table linking directly to detailed scan reports.
- **Upload & Scan Workflow (`frontend/src/pages/UploadPage.jsx`)**:
  - **Step 1:** Artifact category selection (AI Model, Dataset, Dependency).
  - **Step 2:** File drag-and-drop or file browser with client-side extension validation.
  - **Step 3:** Execution and live scanning phases:
    1. Uploading file & computing SHA-256 hash.
    2. Static byte & opcode inspection (Zero-execution security model).
    3. Heuristic vulnerability & supply-chain analysis.
    4. Compiling risk score and findings.
  - Submits `multipart/form-data` directly to `/api/v1/scans/upload-and-scan`.
  - Seamless navigation to the Scan Detail report upon completion.
- **Scan Results & Findings (`frontend/src/pages/ScanDetailPage.jsx`)**:
  - Displays overall risk level badge (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `SAFE`), risk score gauge, and completion latency.
  - Shows artifact metadata: original filename, file size, SHA-256 digest, and status.
  - Finding cards grouped by severity with:
    - Rule ID and Scanner module name.
    - Title and detailed technical description.
    - Code / snippet evidence where captured.
    - Prescribed mitigation guidance.
  - Action buttons: Quarantine / Release artifact and Report download.
- **Scan History (`frontend/src/pages/ScansPage.jsx`)**:
  - Fetches all historical scans from `/api/v1/scans`.
  - Filterable by status (`COMPLETED`, `FAILED`, `RUNNING`) and risk level.
  - Detailed timestamp and duration tracking.
- **Quarantine Center (`frontend/src/pages/QuarantinePage.jsx`)**:
  - Lists compromised or isolated artifacts from `/api/v1/quarantine`.
  - Allows security operators to review quarantine triggers and release items when cleared.

---

## 3. Integrated API Endpoints

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/api/v1/stats/` | Dashboard aggregate metrics and recent scan summaries | Verified (200 OK) |
| `POST` | `/api/v1/scans/upload-and-scan` | Upload artifact file and trigger static scanner | Verified (200 OK) |
| `GET` | `/api/v1/scans/` | Retrieve all historical scan records | Verified (200 OK) |
| `GET` | `/api/v1/scans/{scan_id}` | Retrieve specific scan details and list of findings | Verified (200 OK) |
| `GET` | `/api/v1/artifacts/` | List registered artifacts | Verified (200 OK) |
| `GET` | `/api/v1/quarantine/` | List currently quarantined artifacts | Verified (200 OK) |
| `POST` | `/api/v1/quarantine/{artifact_id}/release` | Release artifact from quarantine | Verified (200 OK) |
| `GET` | `/api/v1/reports/{scan_id}/download` | Download PDF or JSON compliance report | Verified (200 OK) |

---

## 4. Security & Safety Compliance

- **Strict Non-Execution Policy:** All model and artifact analysis operates exclusively via static opcode walkers, bytecode disassembly, AST parsing, and signature matching. At no point are untrusted pickle, PyTorch, or ONNX files deserialized or executed in Python runtime.
- **Safe Error Boundaries:** Network failures, 400 Bad Request (unsupported file formats), and 413 Payload Too Large are captured cleanly without exposing server call stacks to the end user.
- **Secure File Handling:** Uploaded artifacts are securely hashed and stored in designated sandbox directories before processing.

---

## 5. Testing & Verification

1. **Frontend Production Build:**
   - Ran `npm run build` in `frontend/`.
   - Verified that Vite bundled all 2,548 modules with 0 compilation errors.
2. **Browser Workflow Verification:**
   - Executed headless browser automation tests against `http://localhost:5173`.
   - Verified navigation across `/`, `/upload`, `/scans`, `/scans/{id}`, and `/quarantine`.
   - Performed real artifact scanning with zero browser console errors.
3. **Backend Integration:**
   - Verified `/api/v1/stats/` and `/api/v1/scans/` live responses.
   - Verified database records generated in SQLite development database.

---

## 6. How to Run Locally

### Backend
```bash
cd backend
# Create virtual environment if needed
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be accessible at: `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Dashboard will be accessible at: `http://localhost:5173`

---

## 7. Next Steps (Week 7 Outlook)

- Add real-time WebSocket progress reporting during scans for very large model files (>500MB).
- Expand scanner coverage for Hugging Face model repository URLs (remote ingestion).
- Enhance PDF report export templates with institution and audit header customization.
