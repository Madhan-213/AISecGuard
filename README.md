# AISecGuard

**Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks**

> MCA 3rd Semester Final Year Project  
> Domain: Cybersecurity + AI/ML Supply Chain Security

---

## 📌 Current Status

```
CURRENT STATUS:
Week 2 — Requirements, architecture, threat modeling, and initial project setup completed.
Implementation begins in Week 3.
```

---

## 🔍 Problem Statement

The rapid adoption of AI and machine learning systems has created a new and growing attack surface: the **AI supply chain**. Unlike traditional software supply chains, the AI supply chain includes additional attack surfaces:

- **Data poisoning** — manipulating training data to alter model behaviour
- **Unsafe model serialization** — distributing `.pkl` model files with embedded malicious code
- **Model tampering** — modifying model weights post-training without detection
- **Backdoored pre-trained models** — distributing compromised models via public hubs
- **Malicious AI/ML dependencies** — vulnerable or compromised Python packages

No unified scanning tool currently exists for AI/ML artifacts in the same way that vulnerability scanners exist for traditional software. AISecGuard addresses this gap.

> Research context: The number of AI-related CVEs increased by 34.6% year-over-year (H1 2026) and malicious open-source packages grew by 73% (Recorded Future, 2026 — reviewed in Week 1 literature review).

---

## 🎯 Objectives

1. Detect integrity violations and vulnerabilities in AI models, datasets, and dependencies
2. Verify provenance of AI artifacts (origin, lineage, hash integrity)
3. Scan AI model files for unsafe serialization and tampering indicators
4. Scan datasets for statistical anomalies and data poisoning indicators
5. Scan AI/ML dependencies for known CVEs
6. Classify findings by severity (Critical → Info)
7. Generate structured security reports
8. Provide mitigation actions (alerts, quarantine, remediation recommendations)
9. Provide a web dashboard for security monitoring

---

## 🏗️ Architecture Overview

```
User
  │
  ▼
React Web Dashboard (Vite + Tailwind CSS)
  │
  ▼
FastAPI Backend (Python 3.12)
  │
  ▼
AISecGuard Security Engine
  ├── Model Security Scanner       (Pickle detection, format inspection)
  ├── Dataset Security Scanner     (Statistical anomaly, label distribution)
  ├── Dependency Scanner           (CVE matching, unpinned packages)
  ├── Provenance & Integrity Checker (SHA-256, metadata recording)
  ├── Risk Assessment Engine       (Severity scoring, 0–10 risk score)
  ├── Attack Detection Engine      (MITRE ATLAS mapping)
  ├── Mitigation Engine            (Quarantine, alerts, remediation)
  └── Report Generator             (JSON + Markdown reports)
  │
  ▼
PostgreSQL Database + Artifact Storage
```

See [`docs/system-architecture.md`](docs/system-architecture.md) for the full architecture document.  
See [`docs/architecture/system-architecture.mmd`](docs/architecture/system-architecture.mmd) for the Mermaid diagram source.

---

## 🔒 Core Modules

| Module | Description | Status |
|---|---|---|
| Model Security Scanner | Detects unsafe serialization (pickle) and model tampering | Designed (Week 3) |
| Dataset Security Scanner | Statistical anomaly and data poisoning indicator detection | Designed (Week 3) |
| Provenance & Integrity Checker | SHA-256 hashing, origin recording, tamper detection | Designed (Week 3) |
| Dependency Scanner | CVE matching for AI/ML Python packages | Designed (Week 3-4) |
| Risk Assessment Engine | Severity classification and risk scoring | Designed (Week 4) |
| Attack Detection Engine | MITRE ATLAS technique mapping | Designed (Week 4) |
| Mitigation Engine | Quarantine, alerting, remediation recommendations | Designed (Week 4-5) |
| Report Generator | JSON and Markdown security reports | Designed (Week 5) |
| Web Dashboard | React-based security monitoring UI | Designed (Week 6-7) |
| API Layer | FastAPI REST API with JWT auth | Health check working ✅ |

---

## 🛠️ Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Python + FastAPI + Uvicorn | 3.12 / 0.137 |
| Frontend | React + Vite + Tailwind CSS | 18 / 5 / 3 |
| Database | PostgreSQL (prod) / SQLite (dev) | 15 / built-in |
| ORM | SQLAlchemy + Alembic | 2.0 |
| Auth | python-jose + passlib (bcrypt) | — |
| Analysis | pandas, numpy, scipy, packaging | Latest |
| Infrastructure | Docker + Docker Compose | — |
| Version Control | Git + GitHub | — |

See [`docs/technology-stack.md`](docs/technology-stack.md) for full rationale.

---

## 📁 Repository Structure

```
AISecGuard/
├── backend/                    FastAPI backend application
│   ├── main.py                 App entry point + /health endpoint
│   ├── Dockerfile              Backend container definition
│   └── app/
│       ├── core/config.py      Application settings
│       ├── api/v1/router.py    API v1 router
│       ├── models/             SQLAlchemy ORM models (Week 3)
│       ├── routes/             API route handlers (Week 3)
│       ├── services/           Business logic services (Week 3)
│       ├── scanners/           Scanner module stubs (Week 3)
│       └── utils/              Utility functions (Week 3)
│
├── frontend/                   React + Vite dashboard (Week 6)
│
├── scanners/                   Standalone scanner modules
│   ├── model_scanner/
│   ├── dataset_scanner/
│   └── dependency_scanner/
│
├── tests/                      pytest test suite
│   └── test_health.py          Health check test (passing ✅)
│
├── docs/                       All project documentation
│   ├── DOCS/                   Week 1 research (preserved)
│   │   ├── Week1_Literature_Review.md
│   │   └── Week1_Research_Papers.pdf
│   ├── requirements.md         Week 2: Requirements analysis
│   ├── threat-model.md         Week 2: Threat model
│   ├── system-architecture.md  Week 2: Architecture design
│   ├── module-design.md        Week 2: Module design
│   ├── database-design.md      Week 2: Database design
│   ├── api-design.md           Week 2: API design
│   ├── technology-stack.md     Week 2: Tech stack decisions
│   ├── architecture/
│   │   └── system-architecture.mmd
│   └── weekly-reports/
│       ├── week-01.md          (Literature review — in DOCS/)
│       └── week-02.md          Week 2 progress report
│
├── samples/                    Test artifact samples (Week 3)
├── scripts/                    Utility scripts
├── requirements.txt            Python dependencies
├── .env.example                Environment variable template
├── .gitignore
└── docker-compose.yml          PostgreSQL + Backend orchestration
```

---

## 🚀 How to Run (Current Setup — Week 2)

### Prerequisites
- Python 3.10+ (tested on 3.12.10)
- pip

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/AISecGuard.git
cd AISecGuard
```

### 2. Install Python dependencies
```bash
pip install fastapi uvicorn pydantic pydantic-settings python-dotenv python-multipart httpx
```

### 3. Run the backend
```bash
cd backend
uvicorn main:app --reload
```

### 4. Test the health endpoint
```bash
# In another terminal:
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "ok",
#   "project": "AISecGuard",
#   "version": "0.1.0",
#   "timestamp": "2026-..."
# }
```

### 5. View API documentation
Open your browser: http://localhost:8000/docs

---

## 🐳 Docker Setup (PostgreSQL + Backend)

```bash
# Start PostgreSQL and Backend via Docker Compose
docker-compose up -d

# Check backend health
curl http://localhost:8000/health
```

> Docker is optional for Week 2. SQLite is used for local development without Docker.

---

## 🗺️ Project Roadmap

| Week | Focus | Status |
|---|---|---|
| Week 1 | Literature review (10 research papers) | ✅ Completed |
| Week 2 | Requirements, threat model, architecture, database/API design, initial setup | ✅ Completed |
| Week 3 | Database ORM, authentication, artifact upload, provenance checker, model scanner (basic) | 🔜 Planned |
| Week 4 | Dataset scanner, dependency scanner, risk assessment engine | 🔜 Planned |
| Week 5 | Attack detection engine, mitigation engine, report generator | 🔜 Planned |
| Week 6 | React frontend foundation, dashboard layout | 🔜 Planned |
| Week 7 | Frontend: upload UI, scan monitoring, findings view | 🔜 Planned |
| Week 8 | Integration testing, end-to-end scan flow | 🔜 Planned |
| Week 9 | Test samples, security evaluation | 🔜 Planned |
| Week 10 | Performance testing, bug fixes | 🔜 Planned |
| Week 11 | Final documentation, demo preparation | 🔜 Planned |
| Week 12 | Project submission and viva preparation | 🔜 Planned |

---

## 📚 Documentation

| Document | Location |
|---|---|
| Week 1 Literature Review | [`docs/DOCS/Week1_Literature_Review.md`](DOCS/Week1_Literature_Review.md) |
| Requirements Analysis | [`docs/requirements.md`](docs/requirements.md) |
| Threat Model | [`docs/threat-model.md`](docs/threat-model.md) |
| System Architecture | [`docs/system-architecture.md`](docs/system-architecture.md) |
| Module Design | [`docs/module-design.md`](docs/module-design.md) |
| Database Design | [`docs/database-design.md`](docs/database-design.md) |
| API Design | [`docs/api-design.md`](docs/api-design.md) |
| Technology Stack | [`docs/technology-stack.md`](docs/technology-stack.md) |
| Week 2 Progress Report | [`docs/weekly-reports/week-02.md`](docs/weekly-reports/week-02.md) |

---

## ⚠️ Important Notes

- **This is an academic project** — not a production security tool.
- All scanning is **static analysis only** — uploaded files are never executed.
- The system **does not implement offensive capabilities** — only detection and flagging.
- Security claims are technically accurate and honest — heuristic detection is clearly distinguished from guaranteed detection.

---

## 🔮 Future Enhancements (Post-Project)

- Live NVD/OSV dependency vulnerability feed integration
- Runtime inference monitoring
- LLM prompt injection detection
- CI/CD plugin (GitHub Actions)
- CycloneDX / SPDX AI-BOM export
- Multi-tenant enterprise support

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.
