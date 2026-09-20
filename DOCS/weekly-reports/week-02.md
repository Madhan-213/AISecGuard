# Week 2 Progress Report

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Week:** 2  
**Period:** September 2026 (Week 2 of 12-week schedule)  
**Author:** MCA 3rd Semester Student  

---

## Tasks & Work Completed

### 1. Project Inspection and Understanding (Week 1 Review)

Before beginning Week 2 work, the existing project state was thoroughly inspected:

- Read the existing `README.md` (minimal — contained only the project title and a one-line description).
- Reviewed the complete `DOCS/Week1_Literature_Review.md` (318 lines, 10 research papers reviewed).
- Identified that Week 1 covered: Data Lineage & Provenance (AI-BOM), Model Integrity, Vulnerability Detection, Backdoor/Data Poisoning, Runtime Protection, MITRE ATLAS, OWASP LLM Top 10 (2026), AI-BOM Standards, Industry Threat Intelligence (Recorded Future), and Compliance (CISA G7).
- Checked Git history: 2 commits existed (Initial commit + Week 1 research upload).
- Confirmed Python 3.12.10 and pip 26.1.2 are available.
- Confirmed all major core Python packages (FastAPI, Uvicorn, Pydantic) were already installed.

No existing Week 2 work was present; all the following was newly created.

---

### 2. Requirements Analysis

**File created:** `docs/requirements.md`

Produced a comprehensive requirements document covering:

- **Project overview and problem statement** — documenting the AI supply chain security gap with evidence from Week 1 research (73% increase in malicious packages, 34.6% increase in AI-related CVEs).
- **Project objectives** (9 specific objectives).
- **Scope definition** — divided into 5 areas: Data Supply Chain Security, Model Supply Chain Security, Dependency Security, Security Assessment, and Mitigation.
- **Target users** — 5 user types identified (ML Engineers, Data Scientists, Security Analysts, AI Project Managers, Researchers).
- **12 functional requirements** (FR-01 through FR-12) covering authentication, upload, provenance, scanning, risk assessment, mitigation, and reporting.
- **7 non-functional requirements** (NFR-01 through NFR-07) covering performance, reliability, security, usability, maintainability, portability, and scalability.
- **System inputs and outputs tables.**
- **Assumptions, constraints, limitations, and future enhancements.**

---

### 3. Threat Modeling

**File created:** `docs/threat-model.md`

Produced a threat model analysing 8 AI supply chain stages:

1. Data Collection
2. Data Storage
3. Data Preprocessing
4. Model Training
5. Model Packaging
6. Model Storage / Distribution
7. Model Deployment
8. Model Maintenance

For each stage: asset, threat, attack scenario, MITRE ATLAS reference, vulnerability, impact, detection approach, mitigation approach, and AISecGuard coverage status were documented.

**14 attack categories identified and classified** using MITRE ATLAS IDs and OWASP LLM Top 10 (2026) references. Coverage matrix clearly distinguishes what AISecGuard will implement, what is partial, and what is out of scope.

---

### 4. System Architecture Design

**File created:** `docs/system-architecture.md`

Designed a layered, modular architecture with:

- **Presentation Layer:** React + Vite dashboard
- **API Layer:** FastAPI backend
- **Security Engine:** Orchestrator coordinating 7 sub-modules
- **Data Layer:** PostgreSQL + local artifact storage

**Complete data flow documented** (11 steps from upload to dashboard display).

Deployment view and security considerations in the architecture (no file execution, UUID-based paths, JWT auth, ORM for SQL injection prevention) also documented.

Architectural decisions were documented with rationale (static-only analysis, modular monolith, REST API, local filesystem for MVP).

---

### 5. Architecture Diagram

**File created:** `docs/architecture/system-architecture.mmd`

Created a Mermaid flowchart diagram showing the complete AISecGuard system with all layers, modules, and data flow connections. The diagram uses a dark theme and clearly labels all components.

---

### 6. Module Design

**File created:** `docs/module-design.md`

Designed 10 modules in detail, each with: purpose, inputs, processing steps (with pseudocode/algorithms), outputs, technology/library choices, and security considerations:

1. Model Security Scanner — pickle opcode scanning, format inspection
2. Dataset Security Scanner — statistical anomaly detection, label distribution analysis
3. Provenance & Integrity Checker — SHA-256 hashing, baseline comparison
4. Dependency Scanner — requirements parsing, CVE matching
5. Risk Assessment Engine — severity weighting, 0–10 score formula
6. Attack Detection Engine — MITRE ATLAS mapping
7. Mitigation Engine — quarantine logic, alert generation
8. Alert & Report Generator — JSON + Markdown report assembly
9. Dashboard (Frontend) — React page structure
10. API Layer — REST endpoint catalogue

---

### 7. Database Design

**File created:** `docs/database-design.md`

Designed a PostgreSQL relational database with 9 tables:

`users`, `artifacts`, `provenance_records`, `scans`, `findings`, `dependencies`, `mitigation_actions`, `reports`, `alerts`

Each table documented with: column name, data type, key type, nullable status, and purpose. A Mermaid ER diagram is included showing all entity relationships. All primary keys use UUIDs.

---

### 8. API Design

**File created:** `docs/api-design.md`

Designed a complete REST API with:

- **18 endpoints** across Users, Artifacts, Scans, Findings, Reports, and Alerts resource groups
- Each endpoint documented with: HTTP method, URL, purpose, request body, response body, and status codes
- Standard error response format defined with error code catalogue
- Authentication scheme (JWT Bearer) documented

---

### 9. Technology Stack Decision

**File created:** `docs/technology-stack.md`

Documented the complete technology stack with rationale for every choice:

- **Backend:** Python 3.12 + FastAPI + Uvicorn
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Database:** PostgreSQL 15 (SQLite for local dev without Docker)
- **ORM:** SQLAlchemy 2.0 + Alembic
- **Security/Analysis:** hashlib, pandas, numpy, scipy, packaging
- **Infrastructure:** Docker + Docker Compose + Git + GitHub

Rejected alternatives documented with reasons.

---

### 10. Project Structure Setup

The following directory structure was established:

```
AISecGuard/
├── backend/
│   ├── main.py                        ← FastAPI app entry point
│   ├── Dockerfile
│   └── app/
│       ├── core/config.py             ← Application settings
│       ├── api/v1/router.py           ← API v1 router
│       ├── models/__init__.py         ← ORM models (Week 3)
│       ├── routes/__init__.py         ← Route stubs (Week 3)
│       ├── services/__init__.py       ← Service stubs (Week 3)
│       ├── scanners/__init__.py       ← Scanner stubs (Week 3)
│       └── utils/__init__.py          ← Utility stubs (Week 3)
├── docs/
│   ├── DOCS/Week1_Literature_Review.md   ← Preserved from Week 1
│   ├── DOCS/Week1_Research_Papers.pdf    ← Preserved from Week 1
│   ├── requirements.md                   ← NEW Week 2
│   ├── threat-model.md                   ← NEW Week 2
│   ├── system-architecture.md            ← NEW Week 2
│   ├── module-design.md                  ← NEW Week 2
│   ├── database-design.md                ← NEW Week 2
│   ├── api-design.md                     ← NEW Week 2
│   ├── technology-stack.md               ← NEW Week 2
│   ├── architecture/
│   │   └── system-architecture.mmd       ← NEW Week 2
│   └── weekly-reports/
│       └── week-02.md                    ← NEW Week 2
├── tests/
│   └── test_health.py
├── scanners/
│   ├── model_scanner/
│   ├── dataset_scanner/
│   └── dependency_scanner/
├── frontend/                             ← Setup in Week 6
├── samples/                              ← Test samples (Week 3)
├── scripts/
├── requirements.txt                      ← NEW Week 2
├── .env.example                          ← NEW Week 2
├── .gitignore                            ← NEW Week 2
├── docker-compose.yml                    ← NEW Week 2
└── README.md                             ← UPDATED Week 2
```

---

### 11. Initial Backend Setup

**FastAPI application created** (`backend/main.py`) with:
- Health check endpoint `GET /health` implemented
- CORS middleware configured
- Auto-generated OpenAPI docs at `/docs`
- Configuration management via `app/core/config.py` (pydantic-settings)

**Verified working:**
```
GET /health → 200 OK
{
  "status": "ok",
  "project": "AISecGuard",
  "version": "0.1.0",
  "timestamp": "2026-09-20T..."
}
```

---

### 12. README Updated

The project README was completely updated with: project description, problem statement, objectives, core modules overview, architecture overview, technology stack, current status, project roadmap, repository structure, how-to-run instructions, and future modules.

---

## Roadblocks & Challenges

### Challenge 1: Scope Realism
**Problem:** The initial project concept risks being too broad for a 12-week MCA student project. Multiple ambitious features (runtime monitoring, LLM prompt injection, differential privacy) were listed in the research.  
**Resolution:** Clearly separated in-scope vs. out-of-scope features in the requirements document. Focused the design on static analysis only (no code execution), which is both safer and more realistic for the timeline.

### Challenge 2: Threat Model Accuracy
**Problem:** Distinguishing what can genuinely be detected statically vs. what requires runtime access is technically important for honest claims.  
**Resolution:** The threat model and coverage matrix are explicit about limitations. For example, training-time backdoor detection is marked as "provenance recording only" — not as a solved problem. This honesty is critical for viva review.

### Challenge 3: Database Complexity vs. Simplicity
**Problem:** Designing a database that is complete enough to support all features but simple enough for a student to implement in the remaining weeks.  
**Resolution:** Settled on 9 tables with clear, minimal columns. Avoided JSON blobs for most data (except the final report). Used UUID PKs throughout for simplicity.

### Challenge 4: Technology Stack Justification
**Problem:** The chosen stack (FastAPI + React + PostgreSQL + Docker) needs to be justified rather than blindly adopted.  
**Resolution:** Every technology choice is documented in `docs/technology-stack.md` with explicit rationale and rejected alternatives.

---

## Plan & Roadmap for Next Week

### Week 3 Objectives

Week 3 will focus on implementing the basic backend infrastructure and beginning the first scanner modules:

1. **Database setup** — Implement SQLAlchemy ORM models for all 9 tables. Set up Alembic migrations. Create the database in SQLite (for local dev) and PostgreSQL (via Docker).
2. **User authentication** — Implement `POST /api/users/register` and `POST /api/users/login` endpoints with bcrypt password hashing and JWT token generation.
3. **Artifact upload endpoint** — Implement `POST /api/artifacts/upload` with file validation, UUID-based storage, and SHA-256 hash computation.
4. **Provenance & Integrity Checker** — Implement the first scanner module (hash computation and provenance recording).
5. **Model Security Scanner (basic)** — Implement pickle opcode scanning for `.pkl` and `.joblib` files.
6. **Basic scan endpoint** — Implement `POST /api/scans` to trigger a scan and `GET /api/scans/{id}` to check status.
7. **Unit tests** — Write pytest tests for the Provenance Checker and Model Scanner.

---

## Technologies / Tools Used

| Technology / Tool | Purpose | Version |
|---|---|---|
| Python | Backend language, analysis scripting | 3.12.10 |
| FastAPI | Web framework (health check endpoint) | 0.137.0 |
| Uvicorn | ASGI server | 0.49.0 |
| Pydantic | Settings validation | 2.13.4 |
| pydantic-settings | `.env` configuration loading | Latest |
| Git | Version control | System installed |
| Mermaid | Architecture diagram source format | Specification |
| Markdown | Documentation format | — |

---

## Development Hours

**Estimated total:** 10 hours

| Activity | Hours |
|---|---|
| Week 1 review and project inspection | 1.0 |
| Requirements analysis document | 1.5 |
| Threat modeling | 2.0 |
| System architecture design | 1.5 |
| Module design | 1.5 |
| Database design | 0.5 |
| API design | 0.5 |
| Technology stack research/documentation | 0.5 |
| Project structure setup + initial backend | 1.0 |
| **Total** | **10.0** |

---

## Key Learning Outcome

The most significant learning this week was understanding the gap between **research concepts** and **implementable system components**.

Week 1 identified threats like data poisoning and model tampering at a conceptual level. Week 2 required translating these concepts into concrete questions: *What exactly will the scanner read from the file? What algorithm will it apply? What data will be stored in the database? What will the API response look like?*

This translation process revealed that many "detection" capabilities must be implemented as **heuristics and indicators** rather than definitive detection. For example, a severely imbalanced label distribution in a training dataset is a *potential indicator* of data poisoning — not proof of it. Being precise about this distinction is critical for technical honesty in an academic project and for passing viva examination.

The Week 2 design work also revealed that the **provenance and integrity** components are the most practically implementable and most universally useful features of AISecGuard — they require no special AI/ML knowledge, work on any artifact type, and provide immediate security value. This will be the first implemented priority in Week 3.
