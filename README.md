<div align="center">

# 🛡️ AISecGuard
### Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite_6-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy_2.0-D71F00.svg?style=flat&logo=sqlalchemy)](https://www.sqlalchemy.org)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?style=flat&logo=python)](https://www.python.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](LICENSE)

**A unified, static-analysis cybersecurity platform designed to protect machine learning pipelines, serialized models, training datasets, and software dependencies from supply chain tampering, data poisoning, and arbitrary code execution.**

> **🎓 Academic Context:** Master of Computer Applications (MCA) Final Year Project  
> **🔐 Domain:** Cybersecurity · AI/ML Supply Chain Defense · DevSecOps  
> **💻 Platforms:** Windows, Linux (Ubuntu/Debian, Fedora, Arch, WSL2), macOS

---

</div>

## 📌 Table of Contents
- [Problem Statement](#-problem-statement)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Quick Start Guide](#-quick-start-guide)
- [Default Login Credentials](#-default-login-credentials)
- [Admin Control Portal](#-admin-control-portal)
- [Key Endpoints & Admin Panel](#-key-endpoints--admin-panel)
- [Threat Detection Rules](#-threat-detection-rules)
- [Directory Structure](#-directory-structure)
- [Testing & Verification](#-testing--verification)
- [License](#-license)

---

## 🎯 Problem Statement

Traditional application security scanners (such as SonarQube, Snyk, and Trivy) focus predominantly on conventional source code and OS packages. They are blind to the unique vulnerabilities of modern Artificial Intelligence pipelines:

1. **Malicious Model Serialization:** Attacker-crafted `.pkl` / `.joblib` / `.pt` files containing weaponized Python pickle bytecode that executes arbitrary system shellcode when loaded.
2. **Training Data Poisoning:** Backdoors, manipulated labels, extreme outlier z-scores, and malicious payloads embedded in training CSV, JSON, or Parquet datasets.
3. **Dependency Typosquatting:** Compromised, unpinned, or typosquatted AI/ML packages (e.g. `torchofficial`, `reqeusts`) infiltrating pipeline manifests.
4. **Silent Model Tampering:** Post-training byte alterations and unverified model distribution across untrusted repositories.

**AISecGuard** solves these challenges by providing zero-execution static inspection, cryptographic provenance verification, automated quarantine isolation, and actionable remediation reporting.

---

## ✨ Key Features

### 1. 🔍 Static Model Security Inspection (Zero Code Execution)
- **Safe Pickle Opcode Disassembly:** Inspects Python pickle bytecode using `pickletools` without ever unpickling or executing untrusted files.
- **Dangerous Call Detection:** Flags dangerous system primitives (`eval`, `exec`, `subprocess`, `os.system`, `socket`, `posix`, `builtins.__import__`).
- **PyTorch & Format Validation:** Flags unsafe PyTorch checkpoints (`weights_only=False`) and recommends secure alternatives such as **SafeTensors** and **ONNX**.

### 2. 📊 Dataset Integrity & Poisoning Detection
- **Statistical Anomaly Scoring:** Evaluates multi-column tabular datasets (CSV, JSON, JSONL, Parquet).
- **Extreme Z-Score Outliers:** Pinpoints anomalous data points deviating beyond $3\sigma$ thresholds.
- **Data Poisoning Heuristics:** Identifies label distribution skews, high missing-value ratios, and format anomalies indicative of poisoning attacks.

### 3. 📦 Dependency Auditing & Supply Chain Defense
- **Manifest Parser:** Analyzes `requirements.txt` and `pyproject.toml` dependencies.
- **Vulnerability Checks:** Integrates with OSV.dev for known CVE vulnerability correlation.
- **Typosquatting Engine:** Employs Levenshtein distance algorithms to detect imitation of popular AI libraries (`torch`, `tensorflow`, `numpy`, `scikit-learn`, `transformers`).

### 4. 🔏 Cryptographic Provenance & Ed25519 Signing
- **Chunked SHA-256 Hashes:** Computes cryptographic digests to detect file tampering.
- **Digital Signatures:** Signs verified artifacts using Ed25519 public-key cryptography.
- **Interactive Lineage Graph:** Visualizes relationships between training datasets, intermediate weights, and deployed models.

### 5. 🛑 Automated Quarantine & Risk Scoring
- **0–10 Severity Score:** Normalized scoring formula classifying artifacts into `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, and `INFORMATIONAL`.
- **Physical Quarantine:** Automatically moves hazardous artifacts into an isolated storage vault with immutable audit logs.

### 6. 👥 Multi-User Isolation & Role-Based Access Control (RBAC)
- **Account Isolation:** Each registered user owns their own private workspace, scans, and finding history.
- **RBAC Roles:**
  - `ADMIN`: Full authority across scans, artifacts, quarantine releases, and database administration.
  - `ANALYST`: Scans artifacts, creates supply chain lineage, and exports reports.
  - `AUDITOR`: Read-only compliance inspection mode.

### 7. 🗄️ Database Administration Panel (SQLAdmin)
- Built-in Django-style administrative interface at `/admin`.
- Live inspection, sorting, real-time searching, and row-level detail viewing for all tables (**Users**, **Artifacts**, **Scans**, **Findings**, **Signatures**, **Lineage**).

### 8. 🎨 Modern SaaS Dashboard (Light & Dark Themes)
- Built with React 19, Tailwind CSS, and Recharts.
- Instant Light / Dark mode toggle.
- Collapsible sidebar menu to maximize screen width.
- Fully responsive layout for desktop, tablets, and mobile devices.

---

## 🏗️ System Architecture

```
                          Security Analyst / Developer
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │        React 19 Web Dashboard (Vite 6 + Tailwind CSS)       │
        │  Modern SaaS Theme • Mobile Drawer • Responsive Charts UI   │
        └──────────────────────────────┬──────────────────────────────┘
                                       │ REST API (JWT Auth)
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │            FastAPI Backend Service (Python 3.12)            │
        │    Auth (bcrypt) • Scanners • Admin (/admin) • Docs (/docs) │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
  ┌───────────────────────────┐                 ┌───────────────────────────┐
  │   AISecGuard Core Engine  │                 │    Storage & Persistence  │
  │ • Pickle Opcode Inspector │                 │ • Persistent SQLite / PG  │
  │ • Dataset Anomaly Engine  │                 │ • Isolated Quarantine Box │
  │ • Typosquat & CVE Checker │                 │ • Ed25519 Signing Keyring │
  │ • Ed25519 Signer & Lineage│                 │ • Generated PDF & Reports │
  └───────────────────────────┘                 └───────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com) 0.115+ (Asynchronous Python REST API) |
| **Frontend Framework** | [React 19](https://react.dev) + [Vite 6](https://vitejs.dev) + [Tailwind CSS](https://tailwindcss.com) |
| **Database & ORM** | [SQLAlchemy 2.0](https://www.sqlalchemy.org) + [Alembic](https://alembic.sqlalchemy.org) (SQLite WAL / PostgreSQL) |
| **Database Admin GUI** | [SQLAdmin](https://github.com/aminalaee/sqladmin) (Django-style database management) |
| **Cryptography** | [Cryptography](https://cryptography.io) (Ed25519 Digital Signatures, SHA-256) |
| **Authentication** | OAuth2 Password Bearer with JWT (JSON Web Tokens) & Passlib/Bcrypt |
| **Data Science / Anomaly** | NumPy, Pandas, PyArrow |
| **Reporting Engine** | ReportLab (Enterprise PDF generation) & Native JSON exporter |
| **Visualization & Icons** | Recharts, Lucide Icons, Motion (Framer Motion) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.12+** installed ([python.org](https://www.python.org/downloads/))
- **Node.js 18+** & **npm** installed ([nodejs.org](https://nodejs.org/))
- **Git** installed ([git-scm.com](https://git-scm.com/))

---

### Step 1: Clone the Repository

```powershell
git clone https://github.com/your-username/AISecGuard.git
cd AISecGuard
```

---

### Step 2: Backend Setup

1. Open a terminal in the `backend/` directory:
   ```powershell
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```powershell
   uvicorn main:app --reload --port 8000
   ```

> 💡 *The backend will automatically initialize database tables and seed default role-based accounts.*

---

### Step 3: Frontend Setup

1. Open a second terminal in the `frontend/` directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the frontend development server:nn
   ```powershell
   npm run dev
   ```

4. Open your browser and navigate to:
   👉 **`http://localhost:5173`**

---

## 🔑 Default Login Credentials

The system initializes default role-based accounts during startup:

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `admin@aisecguard.local` | `AdminPassword@123` | **Full Platform Authority:** User account lifecycle, disaster recovery & database restore, security policy updates, and complete admin portal control. |
| **ADMIN** | `admin@aisecguard.local` | `AdminPassword@123` | User suspension/activation, telemetry inspection, security logs, point-in-time backups. |
| **ANALYST** | `analyst@aisecguard.local` | `AnalystPassword@123` | Upload models/datasets, run security scans, sign artifacts (Ed25519), build lineage edges. |
| **AUDITOR** | `auditor@aisecguard.local` | `AuditorPassword@123` | Read-only compliance mode: audit logs, verification reports, and finding history. |
| **USER** | *(Self-registered)* | *(Custom)* | Standard private user portal workspace with isolated artifacts, scans, and reports. |

> 🔒 *Security Note: Non-admin users attempting to access administrative endpoints or pages are strictly blocked with `HTTP 403 Forbidden` and logged in the forensic Security Events ledger.*

---

## 🎛️ Admin Control Portal

AISecGuard features a separate, privileged **Admin Control Portal** designed for cybersecurity administrators to govern the platform, monitor live infrastructure telemetry, conduct forensic audits, and execute disaster recovery operations.

### 1. Privileged Navigation & Routes

| Route | View | Description | Access Level |
| :--- | :--- | :--- | :--- |
| `/admin/login` | **Admin Gateway** | Dedicated privileged login screen with cyber-shield theme. | Public / Admin |
| `/admin/dashboard` | **Control Center** | Aggregated telemetry, user stats, 14-day scan timeline, risk distribution. | Admin |
| `/admin/users` | **User Governance** | User list with scan/upload counts, last login, active/suspend toggle, role modifier. | Admin / Super Admin |
| `/admin/roles` | **RBAC Matrix** | Role definitions, permission breakdown, and privilege hierarchy. | Admin |
| `/admin/activity-logs` | **Forensic Audit Logs** | Comprehensive audit trail of all platform actions with user correlation. | Admin |
| `/admin/audit-reports` | **Compliance Reports** | Exportable compliance and activity logs in CSV and structured JSON formats. | Admin |
| `/admin/security-events` | **Threat Events Ledger** | Automated security event log (failed logins, privilege escalation attempts). | Admin |
| `/admin/login-history` | **Session Forensics** | Historical authentication attempts with IP addresses, user agents, and status. | Admin |
| `/admin/settings` | **Platform Config** | Dynamic configuration: upload limits, timeouts, scan concurrency limits. | Admin |
| `/admin/security-policies`| **Security Policies** | Rule severity overrides, quarantine automation thresholds, enforcement toggles. | Admin |
| `/admin/scan-configuration`| **Scanner Engines** | Engine diagnostics for AST bytecode, dataset heuristics, and CVE correlation. | Admin |
| `/admin/system-health` | **Live Diagnostics** | Real-time API uptime, database latency, scanner health, and disk usage bars. | Admin |
| `/admin/backups` | **Disaster Recovery** | Point-in-time database snapshot generation and SHA-256 integrity restore. | Super Admin (Restore) |

### 2. Dual Deployment Architecture

AISecGuard provides two flexible ways to run the Admin Control Portal:

1. **Unified Application Mode (Default & Seamless):**
   - The Admin Portal is baked into the main frontend router under `/admin/*`.
   - Access anytime via **`http://localhost:5173/admin/login`** or click the discreet **"Admin Login"** link in the public homepage footer.
   - Automatically synchronizes theme, authentication tokens, and API requests through `frontend/src/admin/`.

2. **Decoupled Standalone Mode (`admin-portal/`):**
   - An independent Vite + React application located in `admin-portal/`.
   - Runs on its own dedicated port **`http://localhost:5174`** for air-gapped or isolated administrative hosting.
   - Run via:
     ```powershell
     cd admin-portal
     npm install
     npm run dev
     ```

---

## 🌐 Key Endpoints & Admin Panel

| Service | URL | Description |
| :--- | :--- | :--- |
| **User Application** | `http://localhost:5173` | Main SaaS user interface for scanning and supply chain defense |
| **Admin Control Portal** | `http://localhost:5173/admin/login` | Full cybersecurity administrative governance console |
| **Standalone Admin Portal** | `http://localhost:5174` | Decoupled admin application (optional isolated host) |
| **Admin REST API** | `http://localhost:8000/api/v1/admin/*` | Role-protected administrative REST endpoints |
| **Database Administration** | `http://localhost:8000/admin` | SQLAdmin Django-style low-level ORM table browser |
| **Swagger Interactive Docs** | `http://localhost:8000/docs` | OpenAPI REST interactive API documentation |
| **ReDoc Documentation** | `http://localhost:8000/redoc` | Clean API reference docs |
| **System Health Check** | `http://localhost:8000/health` | Service status & engine diagnostic endpoint |

---

## 🛡️ Threat Detection Rules

| Rule ID | Threat Classification | Target Artifact | Severity | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`ASG-001`** | Unsafe Pickle Deserialization | `.pkl`, `.joblib`, `.bin` | **CRITICAL** | Detects bytecode instructions that execute arbitrary shell or OS commands. |
| **`ASG-002`** | PyTorch Full Serialization | `.pt`, `.pth` | **HIGH** | Flags legacy PyTorch weights saved without `weights_only=True`. |
| **`ASG-003`** | Insecure Model Format | `.pkl`, `.pt` | **MEDIUM** | Warns against legacy serialization and suggests **SafeTensors** or **ONNX**. |
| **`ASG-004`** | Dataset Poisoning / Outliers | `.csv`, `.json`, `.parquet` | **HIGH** | Extreme z-scores (> 3.0), label skew, or abnormal distribution shifts. |
| **`ASG-005`** | Malicious Dependency | `requirements.txt` | **CRITICAL** | Known CVE vulnerability matched against OSV.dev open database. |
| **`ASG-006`** | Dependency Typosquatting | `requirements.txt` | **HIGH** | Near-match imitation of core AI libraries (e.g. `torchofficial`). |
| **`ASG-007`** | Unpinned Package Version | `requirements.txt` | **LOW** | Dependency without exact version pinning (`==`), risking breaking changes. |
| **`ASG-008`** | Missing Provenance Signature | All Models | **LOW** | Artifact lacks cryptographic Ed25519 signature verification. |

---

## 📁 Directory Structure

```
AISecGuard/
├── backend/
│   ├── app/
│   │   ├── admin/            # SQLAdmin database views & auth backend
│   │   ├── api/v1/           # REST endpoints (auth, scans, artifacts, reports)
│   │   ├── core/             # Application config, security & rate limiting
│   │   ├── db/               # SQLAlchemy session, base & database initialization
│   │   ├── models/           # ORM models (User, Artifact, Scan, Finding, etc.)
│   │   ├── scanners/         # Model, dataset, and dependency scanner engines
│   │   ├── services/         # Business logic (quarantine, provenance, auth)
│   │   └── utils/            # Hashing, crypto signing, and helpers
│   ├── static/logos/         # High-resolution web brand assets & favicon
│   ├── uploads/              # Isolated directory for uploaded artifacts
│   ├── main.py               # FastAPI application entrypoint
│   └── requirements.txt      # Backend Python dependencies
├── admin-portal/             # Standalone Admin Control Portal (React + Vite)
│   ├── src/
│   │   ├── api/adminClient.js
│   │   ├── components/AdminLayout.jsx
│   │   ├── context/AdminAuthContext.jsx
│   │   ├── pages/            # 13 Dedicated administrative management pages
│   │   ├── App.jsx           # Standalone admin routing
│   │   └── index.css         # Cybersecurity dark theme styling
│   ├── index.html
│   ├── package.json
│   └── vite.config.js        # Port 5174 proxying to port 8000
├── frontend/
│   ├── public/logos/         # Production logos, icons, and favicons
│   ├── src/
│   │   ├── admin/            # Integrated Admin Control Portal modules
│   │   │   ├── api/adminClient.js
│   │   │   ├── components/AdminLayout.jsx
│   │   │   ├── context/AdminAuthContext.jsx
│   │   │   └── pages/        # All 13 Admin pages (Dashboard, Users, Health, Backups, etc.)
│   │   ├── api/              # Axios API client & endpoints
│   │   ├── components/       # Layout, Navbar, Charts, Modals, CyberLogo
│   │   ├── context/          # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/            # User Dashboard, Upload, Scans, Settings, Login, Register
│   │   ├── App.jsx           # Main React component & unified route authorization
│   │   └── index.css         # SaaS design tokens, themes & typography
│   ├── index.html            # Application entrypoint & favicon links
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite bundler configuration
├── samples/                  # Benign and evaluation test models/datasets
├── tests/                    # Pytest test suite for security scanners & API
├── .gitignore                # Git exclusions (reports, uploads, venvs)
└── README.md                 # Project documentation
```

---

## 🧪 Testing & Verification

### Running Backend Unit & Security Tests
AISecGuard includes an extensive test suite verifying scanner accuracy and zero-execution boundaries:

```powershell
cd backend
pytest ../tests -v
```

### Building Frontend for Production
```powershell
cd frontend
npm run build
```
*(Produces an optimized build in `frontend/dist/` in under 1 second).*

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <b>Developed for MCA Final Year Project · AI Supply Chain Security</b><br>
  <i>Detect • Prevent • Mitigate AI Supply Chain Attacks</i>
</div>
