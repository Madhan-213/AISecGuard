# AISecGuard

**Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks**

> **MCA 3rd Semester Final Year Project**  
> **Domain:** Cybersecurity + AI/ML Supply Chain Security  
> **Platforms Supported:** Linux (Ubuntu/Debian, Fedora, Arch, WSL2), macOS, and Windows

---

## Current Status

```
STATUS: Standalone Mode Active (Zero Database Required, No Login Needed)
Architecture: React 19 + Vite 6 + Tailwind CSS v4 Frontend & FastAPI Backend.
Persistence: Local Device Cache Memory (Client-side localStorage + in-memory execution).
Security Engine: Static bytecode disassembly, statistical dataset anomaly scoring, 
                 manifest auditing, and automated artifact quarantine.
Test Suite: 97 Backend PyTest tests passing (100%) + 34 Frontend SSR verification checks passing (100%).
```

---

## Problem Statement

The rapid adoption of AI and machine learning systems has created a critical new attack surface: the **AI supply chain**. Unlike traditional software supply chains, the AI supply chain includes:

- **Data poisoning** — manipulating training data to alter model behaviour or create hidden triggers.
- **Unsafe model serialization** — distributing `.pkl` / `.joblib` files with embedded malicious arbitrary code opcodes.
- **Model tampering** — modifying model weights post-training without detection.
- **Backdoored pre-trained models** — distributing compromised models via public model hubs (e.g., Hugging Face, ModelZoo).
- **Malicious AI/ML dependencies** — vulnerable or typosquatted Python packages in machine learning pipelines.

Traditional vulnerability scanners (e.g., Snyk, Trivy, SonarQube) focus primarily on source code and general software dependencies, leaving AI/ML serialized model files, training datasets, and model provenance uninspected. **AISecGuard** bridges this critical defense gap.

> *Research Context:* AI-related CVEs increased by 34.6% year-over-year and malicious open-source packages grew by 73% (Recorded Future, 2026).

---

## Core Objectives

1. **Static Analysis & Zero Code Execution:** Inspect models, datasets, and dependency manifests without ever executing untrusted user code.
2. **Model Security Inspection:** Detect unsafe deserialization opcodes (pickle, PyTorch `weights_only=False`), format vulnerabilities, and validate safe formats (SafeTensors, ONNX).
3. **Dataset Integrity & Anomaly Detection:** Identify statistical anomalies, high missing-value ratios, extreme outlier z-scores, and heuristic data poisoning indicators in CSV, JSON, JSONL, and Parquet files.
4. **Dependency Auditing:** Detect unpinned packages, permissive version ranges, and typosquatting heuristics in `requirements.txt` and `pyproject.toml`.
5. **Provenance & Baseline Verification:** Compute chunked SHA-256 baselines to detect post-training tampering or byte modification.
6. **Central Risk Engine:** Transparent 0–10 scoring scale classifying findings into Informational, Low, Medium, High, and Critical severity.
7. **Mitigation & Quarantine System:** Physically isolate hazardous artifacts, record immutable audit logs, and provide release mechanisms.
8. **Remediation Reports:** Export human-readable PDF reports and machine-actionable JSON remediation guides.
9. **Interactive Dashboard & SSE Telemetry:** Modern web dashboard with live Server-Sent Events status streams.

---

## Architecture Overview

```
                          User / Security Analyst
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │  React 19 Web Dashboard (Vite 6 + Tailwind CSS v4)      │
        │  Interactive UI • Real-time SSE Stream • Upload Portal │
        └────────────────────────────┬───────────────────────────┘
                                     │ HTTP / REST & SSE
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │       FastAPI Security Backend (Python 3.12)           │
        │       Auth (JWT/bcrypt) • Upload API • Health & Docs   │
        └────────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │              AISecGuard Security Engine                │
        │  ┌─────────────────────────┬────────────────────────┐  │
        │  │ Model Security Scanner  │ Dataset Anomaly Scanner│  │
        │  ├─────────────────────────┼────────────────────────┤  │
        │  │ Dependency CVE Scanner  │ Provenance & SHA-256   │  │
        │  ├─────────────────────────┼────────────────────────┤  │
        │  │ Central Risk Engine     │ Quarantine Engine      │  │
        │  ├─────────────────────────┴────────────────────────┤  │
        │  │ Report Generator (JSON & ReportLab PDF)          │  │
        │  └──────────────────────────────────────────────────┘  │
        └────────────────────────────┬───────────────────────────┘
                                     │
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │        Persistence & Secure Storage                    │
        │  SQLite (Dev) / PostgreSQL (Prod)  •  Isolated Storage │
        └────────────────────────────────────────────────────────┘
```

---

## Core Modules

| Module | Description | Implementation Status |
|---|---|---|
| **Model Security Scanner** | Static pickle opcode inspection, format detection, SafeTensors/ONNX validation | Implemented & Hardened (Week 3–5) |
| **Dataset Security Scanner** | Statistical anomaly, extreme z-score outliers, class imbalance, and poisoning indicators | Implemented (Week 4) |
| **Dependency Scanner** | Manifest parser (`requirements.txt`, `pyproject.toml`), unpinned packages, typosquatting | Implemented (Week 4) |
| **Provenance & Integrity** | Chunked SHA-256 baseline recording and byte mismatch detection | Implemented (Week 3) |
| **Risk Assessment Engine** | Standardized 0–10 scoring (INFO=0, LOW=1, MED=3, HIGH=6, CRIT=10) with severity breakdown | Implemented (Week 4–5) |
| **Quarantine & Mitigation** | File quarantine isolation, release authorization workflow, audit logging | Implemented (Week 5) |
| **Report Generator** | Structured JSON export and professional PDF remediation reports (ReportLab) | Implemented (Week 5) |
| **Authentication & AuthZ** | User registration, login, JWT token refresh, bcrypt hashing, HS256 tokens | Implemented (Week 5) |
| **Real-time Telemetry** | Server-Sent Events (SSE) `/api/v1/scans/{id}/status` live scan stream | Implemented (Week 5) |
| **Web Dashboard** | Responsive React 19 + Vite 6 + Tailwind CSS v4 dashboard & homepage | Implemented (Week 5) |

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Backend Framework** | Python + FastAPI + Uvicorn | 3.12 / 0.110+ / 0.27+ | Asynchronous REST API and SSE streaming |
| **Frontend UI** | React 19 + Vite 6 + Tailwind CSS v4 | Latest / 19.2+ | Responsive security monitoring dashboard |
| **Database** | SQLite (dev) / PostgreSQL 15 (prod) | Built-in / 15-alpine | Relational persistence for scans, findings, users |
| **ORM & Migrations** | SQLAlchemy 2.0 + Alembic | 2.0+ / 1.13+ | Database abstraction and migration tracking |
| **Authentication** | PyJWT + Passlib (bcrypt) | 3.3+ / 1.7+ | Token-based stateless authentication |
| **PDF Generation** | ReportLab | 4.x / 5.x | High-quality remediation reports |
| **Data Analysis** | pandas, numpy, scipy, packaging | Latest | Statistical analysis and version parsing |
| **Containers** | Docker & Docker Compose | Engine 24+ / Compose v2 | Multi-container reproducible deployment |
| **Testing** | pytest, pytest-asyncio, httpx | 8.0+ / 0.26+ | Automated unit and integration testing |

---

## Repository Structure

```
AISecGuard/
├── backend/                     FastAPI backend application
│   ├── main.py                  Application entry point & lifespan management
│   ├── Dockerfile               Container build specification
│   ├── alembic.ini              Alembic migration configuration
│   ├── alembic/                 Database migration scripts
│   │   ├── env.py               Alembic environment runner
│   │   └── versions/            Migration version files
│   └── app/
│       ├── core/config.py       Pydantic v2 application settings
│       ├── db/                  Database connection and session handling
│       │   ├── base.py          SQLAlchemy DeclarativeBase
│       │   └── session.py       Engine and SessionLocal factories
│       ├── models/              SQLAlchemy ORM models
│       │   ├── user.py          User accounts model
│       │   ├── artifact.py      Uploaded artifact model
│       │   ├── scan.py          Scan record model
│       │   ├── finding.py       Security finding model
│       │   ├── provenance.py    SHA-256 provenance baseline model
│       │   └── quarantine.py    Quarantine isolation records
│       ├── api/v1/              REST API routing & controllers
│       │   ├── router.py        Main v1 router aggregator
│       │   └── endpoints/       Modular route endpoints (auth, scans, reports...)
│       ├── scanners/            Security scanner implementations
│       │   ├── model_scanner.py Static model opcode analyzer
│       │   ├── dataset_scanner.py Statistical dataset poison detector
│       │   ├── dependency_scanner.py Package manifest auditor
│       │   └── provenance_scanner.py SHA-256 integrity checker
│       ├── services/            Business logic & orchestrators
│       │   ├── scan_service.py  Multi-scanner pipeline coordinator
│       │   ├── risk_engine.py   0–10 Risk scoring calculator
│       │   └── quarantine_service.py Artifact isolation manager
│       └── utils/               Helper utilities (hashing, file storage)
├── frontend/                    React web application
│   ├── src/                     React components, pages, context, and styles
│   ├── scripts/test_homepage.js Automated SSR frontend verification script
│   ├── package.json             Frontend dependencies (React 19, Tailwind CSS v4)
│   └── vite.config.js           Vite development & proxy configuration
├── samples/                     Ready-to-use testing artifacts
│   ├── models/                  Safe and malicious test models (.pkl)
│   ├── datasets/                Sample dataset files (.csv)
│   └── dependencies/            Sample requirement manifests (.txt)
├── scripts/                     Automation and verification scripts
│   ├── verify_live_api.py       End-to-end live API verification
│   ├── live_demo.py             Interactive demonstration runner
│   └── benchmark_scanners.py    Performance benchmark suite
├── tests/                       PyTest backend test suite (97 tests)
├── setup_linux.sh               Automated environment setup script for Linux/WSL
├── run_linux.sh                 Concurrently start backend & frontend on Linux
├── docker-compose.yml           Docker Compose configuration (Postgres + Backend)
├── pytest.ini                   PyTest configuration and Python paths
├── requirements.txt             Python backend dependencies
└── README.md                    Documentation and execution guide
```

---

## How to Run on Linux (Ubuntu, Debian, Fedora, Arch, WSL2)

Linux is fully supported as a first-class platform. Follow the instructions below for your distribution.

### 1. Linux System Prerequisites

Install Python 3.10+, development headers, `python3-venv`, and Node.js.

#### Ubuntu / Debian / WSL2 (Ubuntu):
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv build-essential libpq-dev git curl nodejs npm
```

> **Note on Ubuntu/Debian:** The `python3-venv` package is required to create virtual environments; Debian derivatives do not include `ensurepip` in standard `python3-pip`.

#### Fedora / RHEL / CentOS:
```bash
sudo dnf install -y python3 python3-pip python3-devel gcc gcc-c++ libpq-devel git curl nodejs npm
```

#### Arch Linux / Manjaro:
```bash
sudo pacman -Syu --needed python python-pip python-virtualenv base-devel postgresql-libs git curl nodejs npm
```

---

### Option A: Automated Linux Setup (Fastest)

We provide automated setup and runner scripts for Linux:

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/AISecGuard.git
cd AISecGuard

# 2. Make the scripts executable
chmod +x setup_linux.sh run_linux.sh

# 3. Run the automated setup (creates venv, installs dependencies, sets up .env and frontend)
./setup_linux.sh

# 4. Start both Backend and Frontend concurrently
./run_linux.sh
```

---

### Option B: Manual Linux Step-by-Step Setup

If you prefer full control over each step:

#### Step 1: Clone and Set Up Python Virtual Environment

Modern Linux distributions enforce **PEP 668** (Externally Managed Environments). Always use a virtual environment:

```bash
git clone https://github.com/<your-username>/AISecGuard.git
cd AISecGuard

# Create Python virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip and install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# (Optional) Install reportlab for PDF remediation reports:
pip install reportlab>=4.0.0
```

#### Step 2: Configure Environment Variables

```bash
cp .env.example .env

# Ensure the upload and database directory exists with proper permissions
mkdir -p uploads
chmod 755 uploads
```

By default, the backend operates **completely in memory** (`sqlite:///:memory:`). No external database server or disk file setup is required. All scan evaluations and findings are persisted directly in **client device cache memory (`localStorage`)**.

#### Step 3: Zero Database & No Login Setup

No database initialization or migrations are necessary. The application runs immediately out of the box with zero credentials or login required. All routes (`/dashboard`, `/upload`, `/scans`, `/quarantine`) are completely unlocked.

#### Step 4: Run the Backend API Server

With your virtual environment active:

```bash
cd backend
# Run on 0.0.0.0 to allow access from local machine, WSL2, or LAN
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API Base: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`
- Healthcheck Endpoint: `http://localhost:8000/health`

#### Step 5: Run the Frontend Dashboard (in a New Terminal)

Open a second terminal window:

```bash
cd AISecGuard/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev -- --host
```

- Web Dashboard: `http://localhost:5173`
- The Vite development server automatically proxies `/api` calls to `http://localhost:8000`.

---

## How to Run on Windows (PowerShell / CMD)

### 1. Windows Prerequisites
- Python 3.10+ (tested on Python 3.12) with "Add Python to PATH" enabled.
- Node.js 18+ and npm (from [nodejs.org](https://nodejs.org/)).
- Git for Windows.

### 2. Setup and Execution

#### In Terminal 1 (Backend):
```powershell
# Clone and enter project
git clone https://github.com/<your-username>/AISecGuard.git
cd AISecGuard

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1
# (If using CMD: venv\Scripts\activate.bat)

# Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install reportlab

# Configure environment
Copy-Item .env.example .env

# Run backend
cd backend
uvicorn main:app --reload --port 8000
```

#### In Terminal 2 (Frontend):
```powershell
cd AISecGuard\frontend
npm install
npm run dev
```

Dashboard is accessible at `http://localhost:5173`.

---

## Running with Docker & Docker Compose (Cross-Platform)

Docker Compose provides a zero-configuration containerized deployment with PostgreSQL and the FastAPI backend:

```bash
# 1. Build and start containers in the background
docker compose up -d --build

# 2. View running containers
docker compose ps

# 3. View live backend logs
docker compose logs -f backend

# 4. Verify API health
curl http://localhost:8000/health

# 5. Stop containers
docker compose down

# (Optional) Stop and wipe PostgreSQL database volumes
docker compose down -v
```

> **Linux Docker Tip:** If you encounter `permission denied` with Docker on Linux, add your user to the `docker` group:
> ```bash
> sudo usermod -aG docker $USER
> newgrp docker
> ```

---

## Automated Testing Suite

AISecGuard maintains a 100% pass rate across its automated test suites.

### 1. Backend Automated Tests (97 Tests)

From the project root with the virtual environment activated:

```bash
# On Linux / macOS:
source venv/bin/activate
pytest -v

# On Windows:
.\venv\Scripts\Activate.ps1
pytest -v
```

Test breakdown:
- `test_health.py`: Health endpoints, OpenAPI specifications, and CORS
- `test_integrity.py`: SHA-256 baseline hashing and byte tampering detection
- `test_artifacts.py`: Multipart uploads, extension validation, isolated storage
- `test_model_scanner.py`: Pickle opcode disassembly, PyTorch/SafeTensors/ONNX inspection
- `test_dataset_scanner.py`: Anomaly detection, extreme z-scores, statistical outliers
- `test_dependency_scanner.py`: Manifest parsing, unpinned versions, typosquatting heuristics
- `test_risk_engine.py`: 0–10 risk scoring and severity mapping
- `test_auth.py`: User registration, bcrypt authentication, token refreshing
- `test_quarantine.py`: Isolation workflow, audit logging, file release
- `test_report_export.py`: JSON export and ReportLab PDF compilation
- `test_scans.py` & `test_api_week5.py`: End-to-end scan orchestrator workflows

### 2. Frontend Automated Verification (34 Checks)

```bash
cd frontend
node scripts/test_homepage.js
```

### 3. Scanner Benchmark Suite

```bash
python3 scripts/benchmark_scanners.py
```

### 4. Live API End-to-End Verification

With the backend running on `http://localhost:8000`:

```bash
python3 scripts/verify_live_api.py
```

---

## API Verification via CLI (`curl`)

You can test the entire security pipeline directly from the command line using `curl`:

### 1. Health Check
```bash
curl -s http://localhost:8000/health
```

### 2. Register & Authenticate User
```bash
# Register a security analyst
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@example.com","password":"StrongPassword123!","full_name":"Security Analyst"}'

# Login and obtain JWT Access Token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"analyst@example.com","password":"StrongPassword123!"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Bearer Token: $TOKEN"
```

### 3. Upload AI Artifact
```bash
# Upload a test model file
UPLOAD_RES=$(curl -s -X POST http://localhost:8000/api/v1/artifacts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@samples/models/safe_model.pkl")

echo "$UPLOAD_RES"
ARTIFACT_ID=$(echo "$UPLOAD_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
```

### 4. Trigger Scan & Stream Real-Time Status
```bash
# Trigger pipeline scan
SCAN_RES=$(curl -s -X POST http://localhost:8000/api/v1/scans/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"artifact_id\": \"$ARTIFACT_ID\"}")

SCAN_ID=$(echo "$SCAN_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

# Stream Server-Sent Events (SSE) status
curl -N http://localhost:8000/api/v1/scans/$SCAN_ID/status
```

### 5. Retrieve Results & Download Reports
```bash
# View detailed scan results with security findings
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/scans/$SCAN_ID

# Export JSON remediation report
curl -s http://localhost:8000/api/v1/scans/$SCAN_ID/report?format=json > remediation_report.json

# Export PDF remediation report (ReportLab)
curl -s http://localhost:8000/api/v1/scans/$SCAN_ID/report?format=pdf -o remediation_report.pdf
```

---

## Linux Production & Background Service Deployment

For long-running deployments or VM hosting on Linux servers:

### Option 1: Running as a `systemd` Service

Create a systemd unit file for automatic restart and boot persistence:

```ini
# /etc/systemd/system/aisecguard-backend.service
[Unit]
Description=AISecGuard FastAPI Backend Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/AISecGuard/backend
Environment="PATH=/var/www/AISecGuard/venv/bin"
ExecStart=/var/www/AISecGuard/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aisecguard-backend
sudo systemctl status aisecguard-backend
```

### Option 2: Running with `tmux` or `nohup`
```bash
# Using nohup in the background
source venv/bin/activate
cd backend
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
```

### Option 3: Linux Firewall Configuration (UFW)
```bash
# Allow API and Frontend ports if hosting on a remote Linux server
sudo ufw allow 8000/tcp comment "AISecGuard API"
sudo ufw allow 5173/tcp comment "AISecGuard Frontend Dev"
```

---

## Linux Troubleshooting & Common Pitfalls

### 1. `error: externally-managed-environment`
- **Cause:** Debian 12 / Ubuntu 24.04+ enforce PEP 668 to protect system Python packages.
- **Fix:** Always create and activate a Python virtual environment:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  ```

### 2. `Error: Command '['.../venv/bin/python3', '-Im', 'ensurepip', ...]' returned non-zero exit status 1`
- **Cause:** Ubuntu/Debian packages `python3-venv` separately from core Python.
- **Fix:**
  ```bash
  sudo apt install -y python3-venv
  ```

### 3. Missing C Compiler or PostgreSQL headers (`pg_config executable not found`)
- **Cause:** Compiling `psycopg2` or numerical extensions without C build tools.
- **Fix:**
  ```bash
  sudo apt install -y build-essential libpq-dev python3-dev
  ```

### 4. WSL2 Port Access from Windows Host
- When running in WSL2, ensure Uvicorn binds to `0.0.0.0` rather than `127.0.0.1`:
  ```bash
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
- Windows can connect via `http://localhost:8000` thanks to WSL2 auto-port forwarding.

### 5. `ModuleNotFoundError: No module named 'reportlab'`
- **Fix:** Install reportlab inside your active virtual environment:
  ```bash
  pip install reportlab
  ```

### 6. Permission Denied on `uploads/`
- **Fix:** Ensure write permissions on the artifact directory:
  ```bash
  mkdir -p uploads
  chmod -R 755 uploads
  ```

---

## Project Roadmap

| Phase | Focus Area | Status | Deliverables |
|---|---|---|---|
| **Week 1** | Literature Review | Completed | 10 research papers on AI supply chain vulnerabilities |
| **Week 2** | System Design | Completed | Threat model, database schema, API specification |
| **Week 3** | Core Pipeline | Completed | SHA-256 provenance, Pickle opcode scanner, uploads, 38 tests |
| **Week 4** | Scanners & Risk | Completed | Dataset anomaly scanner, dependency auditor, 0–10 risk engine, 72 tests |
| **Week 5** | Auth, Quarantine & UI | Completed | JWT auth, physical quarantine, JSON/PDF reports, React dashboard, 97 tests |
| **Week 6** | Advanced Mitigation | Planned | Automated unpickling sandbox heuristics, SafeTensors converters |
| **Week 7** | Model Hub Integration | Planned | Hugging Face model repository integrity inspection |
| **Week 8** | Integration & E2E Flow | Planned | End-to-end automated scanning workflows & CI/CD pipeline |
| **Week 9** | Security Evaluation | Planned | Evaluation against adversarial model payloads & benchmarks |
| **Week 10** | Performance & Scalability | Planned | Redis caching, Celery async background worker queue |
| **Week 11** | Documentation & Demo | Planned | Final user manuals, academic paper, demonstration videos |
| **Week 12** | Submission & Viva | Planned | Academic project submission and defense |

---

## Documentation Index

| Document | File Path | Focus |
|---|---|---|
| **Week 1 Research Review** | `DOCS/Week1_Research_Papers.pdf` | Academic literature review |
| **Requirements Analysis** | `DOCS/requirements.md` | Functional and non-functional specifications |
| **Threat Model** | `DOCS/threat-model.md` | AI supply chain attack surface and vectors |
| **System Architecture** | `DOCS/system-architecture.md` | Architectural layers and design patterns |
| **Module Design** | `DOCS/module-design.md` | Component contracts and class structures |
| **Database Design** | `DOCS/database-design.md` | Relational schema and entity relationships |
| **API Design** | `DOCS/api-design.md` | RESTful endpoints and request/response models |
| **Model Security Scanner** | `DOCS/model-scanner.md` | Static opcode inspection methodology |
| **Dataset Security Scanner** | `DOCS/dataset-scanner.md` | Statistical anomaly detection and poisoning heuristics |
| **Dependency Security Scanner** | `DOCS/dependency-scanner.md` | Manifest auditing and typosquatting detection |
| **Risk Assessment Engine** | `DOCS/risk-assessment.md` | 0–10 risk scoring algorithm |
| **Week 4 Verification** | `WEEK4_VERIFICATION.md` | Scanner integration audit report |
| **Week 5 Verification** | `WEEK5_VERIFICATION.md` | Final Week 5 full-stack verification audit |

---

## Important Security & Academic Notes

- **Academic Context:** Developed as an MCA 3rd Semester Final Year Project in Cybersecurity and AI/ML Supply Chain Defense.
- **Zero Execution Guarantee:** AISecGuard strictly performs static code and file structure inspection. Uploaded models or datasets are **never** executed, imported, or deserialized in the host Python runtime.
- **Heuristics vs. Formal Verification:** Scanner warnings distinguish between definitive malicious patterns (e.g. dangerous `os.system` / `subprocess` opcodes) and format risk warnings (e.g. standard pickle usage or unpinned dependencies).
- **Safe Alternatives:** The scanner recommends safe alternatives such as SafeTensors, ONNX, and frozen dependency hashes.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.