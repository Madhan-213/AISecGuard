# AISecGuard — Weekly Progress Report (Week 5)

**Project Name:** AISecGuard — Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Phase:** Week 5 — Frontend Dashboard, JWT Authentication & Quarantine System  
**Week:** 5 of 12  
**Date:** October 2026  
**Student:** MCA 3rd Semester Final Year Project  

---

## Carry-Forward from Week 4

By end of Week 4 the backend reached:

| Component | Status |
|---|---|
| FastAPI REST API (all CRUD endpoints) | ✅ Complete |
| Model / Dataset / Dependency static scanners | ✅ Complete |
| Central Risk Assessment Engine (numeric score) | ✅ Complete |
| Direct upload-and-scan endpoints | ✅ Complete |
| 72 automated pytest tests (100 % passing) | ✅ Complete |
| JWT auth schemas and password hashing stubs | ⏳ Deferred to Week 5 |
| Frontend UI | ❌ Not started |
| Quarantine / remediation export | ❌ Not started |

---

## 1. Week 5 Goals

### Primary Goals
1. **Frontend Dashboard** — React + Vite + Tailwind CSS single-page application
2. **JWT Authentication** — Full login/register flow with access + refresh tokens
3. **Artifact Quarantine System** — Quarantine endpoint, status transitions, audit trail
4. **Remediation Export** — PDF/JSON report export of scan findings

### Secondary Goals
5. **Real-time Scan Progress** — SSE endpoint for live scan status updates
6. **Dashboard Analytics** — Risk trend charts, scanner activity summaries
7. **Week 5 Tests** — 25+ new tests targeting auth, quarantine, and API integration

---

## 2. Detailed Task Breakdown

### Task 5.1 — React + Vite Frontend Setup
**Priority:** HIGH | **Estimated time:** 2 hrs

- Scaffold Vite + React project inside `frontend/`
- Configure Tailwind CSS v3 with custom design tokens
- Set up React Router v6 for page routing
- Configure Axios instance with base URL and JWT interceptors
- Environment variable setup (`VITE_API_BASE_URL`)

**Deliverables:**
- `frontend/` — Vite project root
- `frontend/src/api/client.js` — Axios instance with interceptors
- `frontend/src/App.jsx` — router with page stubs

---

### Task 5.2 — Authentication Pages & JWT Backend
**Priority:** HIGH | **Estimated time:** 2.5 hrs

**Backend (`backend/app/`):**
- `models/user.py` — User ORM model (id, email, hashed_password, is_active, created_at)
- `services/auth_service.py` — create_user(), authenticate_user(), create_access_token(), create_refresh_token()
- `api/v1/endpoints/auth.py` — POST /api/v1/auth/register, POST /api/v1/auth/login, POST /api/v1/auth/refresh
- Alembic migration: add `users` table

**Frontend (`frontend/src/pages/`):**
- `LoginPage.jsx` — form with email/password, JWT stored in localStorage
- `RegisterPage.jsx` — registration form with validation

**Security rules:**
- Passwords hashed with bcrypt (passlib)
- Access token TTL: 30 minutes
- Refresh token TTL: 7 days
- Tokens validated on all protected routes via `get_current_user` dependency

---

### Task 5.3 — Main Dashboard Page
**Priority:** HIGH | **Estimated time:** 2 hrs

**Frontend (`frontend/src/pages/DashboardPage.jsx`):**
- Summary cards: total scans, critical findings, quarantined artifacts, avg risk score
- Recent scans table with status badges (COMPLETED / RUNNING / FAILED)
- Risk distribution donut chart (Recharts)
- Scanner activity bar chart (last 7 days)
- Quick-upload button linking to Upload page

**API calls used:**
- `GET /api/v1/scans` (paginated, sorted by date)
- `GET /api/v1/findings` (for severity counts)

---

### Task 5.4 — Upload & Scan Workflow UI
**Priority:** HIGH | **Estimated time:** 2 hrs

**Frontend (`frontend/src/pages/UploadPage.jsx`):**
- Drag-and-drop file zone (react-dropzone)
- Artifact type selector (Model / Dataset / Dependency)
- Upload progress bar
- Auto-trigger scan after upload (calls POST /api/v1/scans/{type})
- Live scan status polling (every 2s) or SSE if implemented
- Redirect to scan results on completion

---

### Task 5.5 — Scan Results & Report Viewer
**Priority:** HIGH | **Estimated time:** 1.5 hrs

**Frontend (`frontend/src/pages/ScanDetailPage.jsx`):**
- Risk score gauge (large numeric + color band: LOW/MED/HIGH/CRITICAL)
- Findings accordion list grouped by severity
- Evidence snippets rendered in code blocks
- Remediation recommendation per finding
- "Export Report" button (triggers PDF or JSON download)

---

### Task 5.6 — Artifact Quarantine System (Backend)
**Priority:** HIGH | **Estimated time:** 1.5 hrs

**Backend:**
- New endpoint: `POST /api/v1/artifacts/{artifact_id}/quarantine`
  - Transitions artifact status SCANNED → QUARANTINED
  - Records quarantine reason and timestamp
  - Moves file to `uploads/quarantine/` sub-directory
- New endpoint: `POST /api/v1/artifacts/{artifact_id}/release`
  - Transitions QUARANTINED → SCANNED (admin action)
- `GET /api/v1/artifacts?status=QUARANTINED` — filter by status
- Quarantine audit log: `QuarantineEvent` model (id, artifact_id, action, reason, actor, timestamp)
- Alembic migration for `quarantine_events` table

**Frontend (`frontend/src/pages/QuarantinePage.jsx`):**
- List of quarantined artifacts with reason and timestamp
- Release button with confirmation modal

---

### Task 5.7 — Remediation Report Export
**Priority:** MEDIUM | **Estimated time:** 1 hr

**Backend:**
- `GET /api/v1/scans/{scan_id}/report` — returns structured JSON report
- `GET /api/v1/scans/{scan_id}/report?format=pdf` — generates PDF via reportlab
- Report content: artifact metadata, scan summary, risk score breakdown, all findings with evidence + remediation

**Frontend:**
- "Download JSON" and "Download PDF" buttons on ScanDetailPage

---

### Task 5.8 — Real-time Scan Progress (Stretch Goal)
**Priority:** LOW | **Estimated time:** 1 hr

**Backend:**
- `GET /api/v1/scans/{scan_id}/status` — SSE endpoint streaming scan phase updates
- Phases: QUEUED → PROVENANCE_CHECK → SCANNER_RUNNING → RISK_CALC → COMPLETED

**Frontend:**
- `useEventSource` hook consuming SSE stream
- Animated progress bar steps on Upload page

---

### Task 5.9 — Week 5 Test Suite
**Priority:** HIGH | **Estimated time:** 1.5 hrs

| File | Tests | Coverage |
|---|---|---|
| `test_auth.py` | 8 | Register, login, bad credentials, token refresh, protected route |
| `test_quarantine.py` | 7 | Quarantine transition, release, audit log, invalid state |
| `test_report_export.py` | 5 | JSON report structure, PDF response headers |
| `test_api_week5.py` | 5 | End-to-end: register → upload → scan → quarantine → export |
| **Total new** | **25** | — |

**Target cumulative tests:** 72 (Week 4) + 25 = **97 tests, 100% passing**

---

### Task 5.10 — Documentation
**Priority:** MEDIUM | **Estimated time:** 0.5 hrs

- Update `README.md` — add frontend setup instructions
- Update `DOCS/api-design.md` — add auth and quarantine endpoints
- Create `DOCS/frontend-architecture.md` — component tree, routing, state management

---

## 3. Day-by-Day Schedule

| Day | Tasks | Output |
|---|---|---|
| **Day 1** (Mon) | 5.1 Vite/React scaffold + 5.2 JWT backend | `frontend/` scaffold, `users` table, auth endpoints working |
| **Day 2** (Tue) | 5.2 Auth UI pages + 5.6 Quarantine backend | Login/Register pages, quarantine endpoints + migration |
| **Day 3** (Wed) | 5.3 Dashboard page + 5.4 Upload UI | Dashboard live, upload drag-drop working |
| **Day 4** (Thu) | 5.5 Scan results viewer + 5.7 Export | Report viewer, PDF/JSON export working |
| **Day 5** (Fri) | 5.9 Tests + 5.10 Docs + 5.8 Stretch | 97 tests passing, docs updated |

---

## 4. New API Endpoints (Week 5)

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create user account |
| POST | `/api/v1/auth/login` | Login — returns JWT pair |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user profile |
| POST | `/api/v1/artifacts/{id}/quarantine` | Quarantine an artifact |
| POST | `/api/v1/artifacts/{id}/release` | Release from quarantine |
| GET | `/api/v1/scans/{id}/report` | JSON remediation report |
| GET | `/api/v1/scans/{id}/report?format=pdf` | PDF remediation report |
| GET | `/api/v1/scans/{id}/status` | SSE scan status stream |

---

## 5. Technologies to Be Added

| Tool | Version | Purpose |
|---|---|---|
| React | 18.x | Frontend framework |
| Vite | 5.x | Build tool + dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| React Router | 6.x | SPA routing |
| Recharts | 2.x | Charts (donut, bar, gauge) |
| react-dropzone | 14.x | File drag-and-drop |
| Axios | 1.x | HTTP client with interceptors |
| python-jose | 3.x | JWT signing/verification |
| passlib[bcrypt] | 1.7.x | Password hashing |
| reportlab | 4.x | PDF generation |

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vite/React CORS issues with FastAPI | Medium | Medium | Configure CORSMiddleware with explicit origins |
| PDF generation complexity | Medium | Low | Fall back to JSON-only export if reportlab is complex |
| JWT refresh token storage (XSS) | Low | High | Use HttpOnly cookie for refresh token |
| SSE implementation time overrun | High | Low | Treat as stretch goal; poll (2s) as fallback |

---

## 7. Definition of Done (Week 5)

- [x] `frontend/` Vite+React app runs with `npm run dev` and builds with `npm run build`
- [x] Login and Register pages functional with real JWT auth
- [x] Dashboard shows live scan data from the backend
- [x] Upload page accepts drag-and-drop + triggers scan automatically
- [x] Scan detail page shows risk score, findings, and evidence
- [x] `POST /api/v1/artifacts/{id}/quarantine` transitions artifact status correctly
- [x] Remediation report downloadable as JSON and PDF
- [x] 97 cumulative tests passing (0 failures, 100% pass rate)
- [x] Week 5 report complete

---

## 8. Tasks Completed

1. **Task 5.1 (Frontend Scaffold):** Initialized React 19 + Vite 6 project inside `frontend/` with `@tailwindcss/vite` v4 plugin, dark-mode glassmorphic design system (`index.css`), and proxy routing to FastAPI backend (`vite.config.js`).
2. **Task 5.2 (JWT Auth System):** Implemented `User` model, Alembic migration, `auth_service.py` with secure bcrypt hashing and HS256 access/refresh tokens, `/auth/register`, `/auth/login`, `/auth/refresh`, and `/auth/me` endpoints, plus React `LoginPage` and `RegisterPage`.
3. **Task 5.3 (Main Dashboard):** Built `DashboardPage.jsx` with summary metric cards, Recharts donut risk distribution, findings severity breakdown, and live recent scans table.
4. **Task 5.4 (Upload & Scan UI):** Implemented `UploadPage.jsx` with `react-dropzone` multi-file drag-and-drop, artifact category selector (Model/Dataset/Dependency), upload progress bar, and automated scan initiation.
5. **Task 5.5 (Scan Detail & Findings Viewer):** Created `ScanDetailPage.jsx` featuring dynamic circular risk score gauge, expandable findings accordion, verbatim code/evidence inspector, and remediation recommendations.
6. **Task 5.6 (Artifact Quarantine System):** Created `QuarantineEvent` model, `/artifacts/{id}/quarantine` and `/artifacts/{id}/release` endpoints with physical file relocation to `uploads/quarantine/`, plus React `QuarantinePage.jsx` with release modal and audit history.
7. **Task 5.7 (Remediation Report Export):** Implemented `/scans/{id}/report` endpoint supporting structured JSON and formatted PDF downloads generated via ReportLab.
8. **Task 5.8 (Real-Time Scan Progress):** Added `GET /scans/{id}/status` Server-Sent Events (SSE) streaming endpoint communicating scan phases (`QUEUED` -> `PROVENANCE_CHECK` -> `SCANNER_RUNNING` -> `RISK_CALC` -> `COMPLETED`).
9. **Task 5.9 (Test Suite Expansion):** Added 25 new tests (`test_auth.py`, `test_quarantine.py`, `test_report_export.py`, `test_api_week5.py`), bringing total test suite to **97 tests, 100% passing**.
10. **Task 5.10 (Documentation):** Created `DOCS/frontend-architecture.md`, updated `README.md` and `DOCS/api-design.md`, and finalized Week 5 report.

---

## 9. Challenges & Solutions

1. **Tailwind CSS v4 Integration:**  
   *Challenge:* Vite and Tailwind CSS v4 use a new `@tailwindcss/vite` plugin architecture without legacy `tailwind.config.js` or PostCSS requirements.  
   *Solution:* Configured `vite.config.js` with `tailwindcss()` plugin and loaded design system directly in `src/index.css` via `@import "tailwindcss";`.
2. **Python 3.12 Passlib / Bcrypt Incompatibility:**  
   *Challenge:* Passlib 1.7.4's internal `detect_wrap_bug` helper throws `ValueError: password cannot be longer than 72 bytes` when paired with bcrypt >= 4.0.  
   *Solution:* Replaced `passlib.context.CryptContext` with direct, secure `bcrypt.gensalt(12)` and `bcrypt.checkpw()` invocations with constant-time dummy checking.
3. **ReportLab Color String Parsing in PDF Generation:**  
   *Challenge:* ReportLab's flowable HTML parser requires standard `#RRGGBB` hex string literals; Python `HexColor.hexval()` returns `0xRRGGBB` causing parsing exceptions.  
   *Solution:* Standardized color handling with a centralized `SEVERITY_HEX` map providing strict hex codes directly into paragraph markup.
4. **Email Validator RFC Strictness in Unit Tests:**  
   *Challenge:* Pydantic's `email-validator` strictly enforces RFC domain rules and rejects `.local` TLDs with HTTP 422.  
   *Solution:* Standardized test payloads across `tests/test_auth.py` and `tests/test_api_week5.py` to use `@example.com` domains.

---

## 10. Key Learning Outcomes

1. **Enterprise Authentication Patterns:** Architected a secure, resilient dual-token (short-lived access + long-lived refresh) JWT flow with silent Axios token rotation.
2. **Incident Containment & Forensics:** Implemented physical and logical quarantine workflows backed by immutable event logs to preserve chain of custody for tampered models.
3. **Automated Compliance Reporting:** Programmed automated conversion from security findings JSON into executive-ready PDF audit documents using ReportLab flowables.
4. **Full-Stack Reactive UI Design:** Designed a cohesive, dark-mode cybersecurity user experience utilizing Tailwind v4, glassmorphism, and Recharts.

---

## 11. Technologies Used This Week

| Tool | Version | Purpose |
|---|---|---|
| React | 19.x | Frontend SPA framework |
| Vite | 6.x | Fast frontend bundler and dev server |
| Tailwind CSS | 4.x | Utility-first styling with `@tailwindcss/vite` |
| React Router | 7.x | Single-page application routing & protected routes |
| Recharts | 3.x | Visual data analytics (risk donut, severity bars) |
| react-dropzone | 20.x | File drag-and-drop artifact ingestion |
| Axios | 1.x | HTTP client with automatic JWT interceptors |
| python-jose | 3.5.0 | JWT generation, signing, and verification |
| bcrypt | 5.0.0 | High-security password hashing |
| reportlab | 5.0.1 | Programmatic PDF report generation |
| email-validator | 2.3.0 | RFC-compliant email address validation |

---

## 12. Development Hours

| Task | Estimated |
|---|---|
| Frontend scaffold + config | 2 hrs |
| JWT backend + auth endpoints | 2.5 hrs |
| Auth UI pages | 1 hr |
| Dashboard page | 2 hrs |
| Upload UI | 2 hrs |
| Scan result viewer | 1.5 hrs |
| Quarantine system | 1.5 hrs |
| Report export | 1 hr |
| Tests (25 new) | 1.5 hrs |
| Documentation | 0.5 hrs |
| **Total** | **~16 hrs** |

---

## 13. Next Week Plan (Week 6 Preview)

1. **Role-Based Access Control (RBAC)** — admin vs analyst roles, protected admin endpoints
2. **Background Task Queue** — Celery + Redis for async scan processing (decouple scan from HTTP request lifecycle)
3. **Notification System** — Email/webhook alerts when a CRITICAL scan result is found
4. **MITRE ATLAS Mapping UI** — Frontend page mapping findings to ATLAS technique IDs (AML.T0010, etc.)
