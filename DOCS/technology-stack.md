# AISecGuard — Technology Stack

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Week:** 2  
**Document Type:** Technology Stack Decision  
**Author:** MCA 3rd Semester Student  
**Date:** September 2026  

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Backend](#2-backend)
3. [Frontend](#3-frontend)
4. [Database](#4-database)
5. [Development & Infrastructure](#5-development--infrastructure)
6. [Security & Analysis Libraries](#6-security--analysis-libraries)
7. [Testing](#7-testing)
8. [Version Control](#8-version-control)
9. [Rejected Alternatives](#9-rejected-alternatives)
10. [Dependencies Summary](#10-dependencies-summary)

---

## 1. Stack Overview

```
┌─────────────────────────────────────────────┐
│  Frontend: React 18 + Vite + Tailwind CSS   │
├─────────────────────────────────────────────┤
│  Backend: Python 3.12 + FastAPI + Uvicorn   │
├─────────────────────────────────────────────┤
│  ORM: SQLAlchemy 2.0 + Alembic              │
├─────────────────────────────────────────────┤
│  Database: PostgreSQL 15                    │
├─────────────────────────────────────────────┤
│  Containerisation: Docker + Docker Compose  │
├─────────────────────────────────────────────┤
│  Version Control: Git + GitHub              │
└─────────────────────────────────────────────┘
```

---

## 2. Backend

### Python 3.12

**Why Python?**
- The dominant language for AI/ML development; the same ecosystem that produces the artifacts AISecGuard scans.
- Rich library support for file analysis (`hashlib`, `struct`, `io`), data analysis (`pandas`, `numpy`), and web APIs (`FastAPI`).
- Student already has Python experience from MCA coursework.
- Existing project environment is Python 3.12 (confirmed from environment check).

**Version:** 3.12.10 (confirmed installed)

---

### FastAPI

**Why FastAPI?**
- Modern, high-performance Python web framework.
- Automatic OpenAPI/Swagger documentation generation — excellent for academic project demonstration and viva.
- Built-in Pydantic validation for request/response data.
- Async support for future scalability.
- Widely used in production AI/ML services (e.g., Hugging Face inference API uses FastAPI).

**Version:** `fastapi>=0.110.0`

---

### Uvicorn

**Why Uvicorn?**
- ASGI server required to run FastAPI.
- Lightweight and fast.
- Standard pairing with FastAPI.

**Version:** `uvicorn[standard]>=0.27.0`

---

### SQLAlchemy 2.0

**Why SQLAlchemy?**
- Industry-standard Python ORM for relational databases.
- Prevents SQL injection via parameterised queries.
- Works with PostgreSQL and SQLite (allowing simpler local testing without Docker).
- Version 2.0 introduces a cleaner, more Pythonic API.

**Version:** `sqlalchemy>=2.0.0`

---

### Alembic

**Why Alembic?**
- Database migration tool for SQLAlchemy.
- Allows controlled schema evolution as the project develops week by week.
- Standard tool for FastAPI + SQLAlchemy projects.

**Version:** `alembic>=1.13.0` (to be used from Week 3 onwards)

---

### Pydantic

**Why Pydantic?**
- FastAPI uses Pydantic for all data validation.
- Provides runtime type checking and clear error messages.
- Ensures API inputs are validated before reaching business logic.

**Version:** `pydantic>=2.0.0`

---

### python-jose + passlib

**Why?**
- `python-jose[cryptography]` — JWT token creation and verification for API authentication.
- `passlib[bcrypt]` — Secure password hashing using bcrypt algorithm.
- Standard authentication stack for FastAPI applications.

---

### python-multipart

**Why?**
- Required for handling multipart file uploads in FastAPI.
- Enables the artifact upload endpoint.

---

### python-dotenv

**Why?**
- Loads environment variables from a `.env` file.
- Keeps database passwords, JWT secrets, and API keys out of source code.

---

## 3. Frontend

### React 18

**Why React?**
- Most widely used frontend framework; extensive documentation and community support.
- Component-based architecture suits the dashboard layout (upload form, scan list, finding cards, report view).
- Student-friendly learning curve for MCA level.

---

### Vite

**Why Vite?**
- Fast development server with hot module replacement.
- Modern build tool that replaces Create React App (which is deprecated).
- Simple setup with `npm create vite@latest`.

---

### Tailwind CSS

**Why Tailwind CSS?**
- Utility-first CSS framework; fast to prototype complex UIs.
- No need to maintain a separate CSS file for every component.
- Produces professional-looking dashboards with minimal effort — important for an academic project viva demonstration.
- Well-supported with React and Vite.

---

### React Router

**Why?**
- Client-side routing for a multi-page dashboard (Upload, Scans, Reports, Findings).
- Industry-standard React routing library.

---

### Axios

**Why?**
- HTTP client for making API calls from the React frontend to the FastAPI backend.
- Simpler API than native `fetch`; supports interceptors for attaching JWT tokens to every request.

---

### Recharts

**Why?**
- Charting library for React.
- Used for: risk score gauge, finding severity bar chart, scan history timeline.
- Simpler API than D3.js; suitable for academic project scope.

---

## 4. Database

### PostgreSQL 15

**Why PostgreSQL?**
- Robust, open-source relational database.
- Industry standard for production applications.
- JSONB support allows storing structured report JSON alongside relational data.
- Works well with SQLAlchemy ORM.
- Available via Docker for easy setup.

**Development alternative:** SQLite (via SQLAlchemy) can be used for local development without Docker; the ORM layer abstracts the difference.

---

## 5. Development & Infrastructure

### Docker + Docker Compose

**Why Docker?**
- Ensures the project runs consistently regardless of the host OS.
- PostgreSQL is most easily set up via Docker on Windows (avoids native installation complexity).
- `docker-compose.yml` orchestrates PostgreSQL + FastAPI backend together.

**Docker Compose services:**
- `db` — PostgreSQL 15
- `backend` — FastAPI + Uvicorn
- `frontend` — Vite dev server (optional; can run separately with `npm run dev`)

---

## 6. Security & Analysis Libraries

### hashlib (Python standard library)

**Purpose:** SHA-256 hash computation for artifact integrity verification.  
**Why:** Built into Python; no external dependency needed.

---

### pandas

**Purpose:** Dataset loading and statistical analysis in the Dataset Security Scanner.  
**Why:** The standard Python library for tabular data analysis; supports CSV, JSON, Parquet.

---

### numpy

**Purpose:** Numerical computation (z-score outlier detection) in the Dataset Security Scanner.  
**Why:** Required by pandas; provides fast array operations.

---

### scipy

**Purpose:** Statistical functions (`scipy.stats.zscore`) for outlier detection.  
**Why:** Provides efficient statistical computations complementing numpy.

---

### packaging

**Purpose:** Version comparison in the Dependency Scanner.  
**Why:** Correctly implements PEP 440 version comparison for Python packages.

---

### tomllib (Python 3.11+ standard library)

**Purpose:** Parsing `pyproject.toml` dependency files.  
**Why:** Built into Python 3.11+; no external dependency needed.

---

### onnx (optional, Week 4+)

**Purpose:** ONNX model format inspection for the Model Security Scanner.  
**Why:** Safe read-only inspection of ONNX graph structure without executing the model.  
**Status:** Optional; added when ONNX scanning is implemented.

---

## 7. Testing

### pytest

**Purpose:** Unit and integration testing for backend modules.  
**Why:** The standard Python testing framework; excellent FastAPI integration via `TestClient`.

---

### httpx

**Purpose:** Async HTTP client used for FastAPI `TestClient` in pytest.  
**Why:** Required by FastAPI's test utilities.

---

## 8. Version Control

### Git + GitHub

**Why Git?**
- Industry-standard version control.
- Already initialised in the project (confirmed from git log inspection).

**Why GitHub?**
- Remote repository hosting.
- Standard for academic project submission and demonstration.

---

## 9. Rejected Alternatives

| Alternative | Category | Why Rejected |
|---|---|---|
| **Flask** | Backend | FastAPI is more modern; offers automatic docs and async support; better for API-first design |
| **Django** | Backend | Too heavyweight for a focused API project; ORM is less flexible than SQLAlchemy for this use case |
| **Node.js/Express** | Backend | Python is more natural for AI/ML file analysis; student's primary language |
| **MySQL** | Database | PostgreSQL is more feature-rich (JSONB); both are suitable but PostgreSQL preferred |
| **MongoDB** | Database | Structured security data with clear relationships fits relational model better than document store |
| **Angular / Vue** | Frontend | React has the largest ecosystem and is most commonly expected in academic projects |
| **Create React App** | Frontend build | Deprecated; Vite is the current standard |
| **styled-components** | CSS | Tailwind is faster for prototyping a dashboard; no runtime style injection |
| **Kubernetes** | Orchestration | Over-engineering for a single-machine academic prototype |

---

## 10. Dependencies Summary

### Backend (`requirements.txt`)

```
# Web Framework
fastapi>=0.110.0
uvicorn[standard]>=0.27.0

# Database
sqlalchemy>=2.0.0
alembic>=1.13.0
psycopg2-binary>=2.9.9

# Validation
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Authentication
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.9

# Configuration
python-dotenv>=1.0.0

# Analysis libraries
pandas>=2.2.0
numpy>=1.26.0
scipy>=1.12.0
packaging>=24.0

# Testing
pytest>=8.0.0
httpx>=0.26.0
```

### Frontend (`frontend/package.json` — planned)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "axios": "^1.6.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```
