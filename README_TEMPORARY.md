# AISecGuard — Project File Structure

```
AISecGuard/
├── backend/                               # FastAPI Python 3.12 Backend Application
│   ├── main.py                            # Main FastAPI app entry point & lifespan handler
│   ├── hf_app.py                          # Hugging Face Spaces unified entry point (port 7860)
│   ├── Dockerfile                         # Backend container definition
│   ├── alembic.ini                        # Alembic database migration configuration
│   ├── alembic/                           # Database migration scripts
│   │   ├── env.py                         # Migration runtime environment
│   │   └── versions/                      # Migration revision files
│   └── app/                               # Backend application core package
│       ├── core/                          # Core configuration & dependencies
│       │   ├── config.py                  # Pydantic v2 application settings & environment
│       │   └── dependencies.py            # FastAPI dependencies (auth & local-analyst fallback)
│       ├── db/                            # Database abstraction layer
│       │   ├── base.py                    # SQLAlchemy DeclarativeBase
│       │   └── session.py                 # Engine factory (StaticPool in-memory / SQLite)
│       ├── models/                        # SQLAlchemy ORM database models
│       │   ├── enums.py                   # Enumerations (Severity, Status, ArtifactType)
│       │   ├── user.py                    # User account model
│       │   ├── artifact.py                # Uploaded AI/ML artifact metadata model
│       │   ├── scan.py                    # Scan execution record model
│       │   ├── finding.py                 # Security vulnerability finding model
│       │   ├── provenance.py              # SHA-256 provenance baseline model
│       │   └── quarantine.py              # Quarantine containment audit model
│       ├── schemas/                       # Pydantic v2 request/response schemas
│       │   ├── artifact.py                # Upload & artifact response schemas
│       │   ├── scan.py                    # Scan trigger & detail schemas
│       │   ├── auth.py                    # User registration, login, token schemas
│       │   ├── finding.py                 # Security finding schemas
│       │   └── quarantine.py              # Quarantine action schemas
│       ├── api/                           # REST API routing
│       │   └── v1/                        # API Version 1
│       │       ├── router.py              # Main router aggregator
│       │       └── endpoints/             # Endpoint route controllers
│       │           ├── auth.py            # Register, login, refresh, me
│       │           ├── artifacts.py       # Upload, list, retrieve artifacts
│       │           ├── scans.py           # Pipeline trigger, list, SSE status stream
│       │           ├── findings.py        # Query security findings
│       │           ├── reports.py         # JSON and ReportLab PDF report generation
│       │           └── quarantine.py      # Artifact quarantine and release actions
│       ├── scanners/                      # Core static security scanners
│       │   ├── model_scanner.py           # Static pickle opcode, PyTorch, ONNX, SafeTensors scanner
│       │   ├── dataset_scanner.py         # Statistical dataset anomaly & poisoning auditor
│       │   ├── dependency_scanner.py      # Manifest auditor (requirements.txt, pyproject.toml)
│       │   └── provenance_scanner.py      # Chunked SHA-256 integrity baseline checker
│       ├── services/                      # Business logic orchestrators
│       │   ├── scan_service.py            # Multi-scanner execution orchestrator
│       │   ├── risk_engine.py             # 0–10 MITRE ATLAS risk scoring engine
│       │   ├── quarantine_service.py      # Physical file quarantine containment service
│       │   └── auth_service.py            # JWT token creation, decoding, password hashing
│       └── utils/                         # Helper utilities
│           ├── hashing.py                 # SHA-256 stream and file hashing
│           └── storage.py                 # Safe UUID-based isolated file storage
│
├── frontend/                              # React 19 + Vite 6 + Tailwind CSS v4 Dashboard
│   ├── index.html                         # SPA HTML entry point
│   ├── vite.config.js                     # Vite build & proxy configuration
│   ├── package.json                       # Frontend dependencies & scripts
│   ├── scripts/                           # Automated testing scripts
│   │   └── test_homepage.js               # 34-check SSR component verification suite
│   └── src/                               # Application source code
│       ├── main.jsx                       # React DOM mount point
│       ├── App.jsx                        # Root router & layout configuration
│       ├── App.css                        # Application component styles
│       ├── index.css                      # Tailwind CSS v4 & custom theme tokens
│       ├── api/                           # Backend API communication
│       │   └── client.js                  # Axios client, auth interceptor, API helpers
│       ├── context/                       # Global state providers
│       │   └── AuthContext.jsx            # Authentication & local analyst session context
│       ├── utils/                         # Client-side helpers
│       │   └── deviceCache.js             # Client device memory store (localStorage cache)
│       ├── components/                    # Reusable UI components
│       │   ├── Layout.jsx                 # Dashboard sidebar & top navigation shell
│       │   ├── CyberLogo.jsx              # Brand cybersecurity logo SVG component
│       │   ├── HeroNetworkVisual.jsx      # Animated SVG security architecture visual
│       │   ├── SampleSecurityScanCard.jsx # Interactive scan telemetry demonstration card
│       │   └── ErrorBoundary.jsx          # React error boundary fallback component
│       └── pages/                         # Route page views
│           ├── HomePage.jsx               # Landing page with interactive sample scans
│           ├── DashboardPage.jsx          # Security overview, risk distribution, metric cards
│           ├── UploadPage.jsx             # File dropzone & live pipeline phase progress
│           ├── ScansPage.jsx              # Searchable scan history & audit inventory
│           ├── ScanDetailPage.jsx         # Findings deep-dive, risk gauge, PDF/JSON export
│           ├── QuarantinePage.jsx         # Containment vault & authorization release modal
│           ├── LoginPage.jsx              # Optional user sign-in page
│           └── RegisterPage.jsx           # Optional user registration page
│
├── samples/                               # Test artifacts for scanning demonstration
│   ├── generate_samples.py                # Generator script for test models and datasets
│   ├── integrity_test.bin                 # Test binary for SHA-256 verification
│   ├── integrity_test.sha256              # Baseline SHA-256 fingerprint
│   ├── models/                            # Machine learning model test files
│   │   ├── safe_model.pkl                 # Clean serialized model
│   │   ├── test_suspicious_opcode.pkl     # Embedded dangerous opcode test model
│   │   └── test_suspicious_opcode_README.md # Opcode inspection documentation
│   ├── datasets/                          # Training dataset test files
│   │   └── sample_dataset.csv             # Dataset with statistical outlier anomalies
│   └── dependencies/                      # Dependency manifest test files
│       └── sample_requirements.txt        # Manifest with unpinned & typosquatted packages
│
├── tests/                                 # PyTest Automated Backend Test Suite (97 tests)
│   ├── conftest.py                        # Shared test fixtures & DB isolation configuration
│   ├── test_health.py                     # Healthcheck & OpenAPI documentation tests
│   ├── test_integrity.py                  # SHA-256 hashing & byte tampering tests
│   ├── test_artifacts.py                  # File upload, size limit, extension validation tests
│   ├── test_model_scanner.py              # Opcode inspection, SafeTensors, PyTorch format tests
│   ├── test_dataset_scanner.py            # Missing values, outliers, duplicate row tests
│   ├── test_dependency_scanner.py         # Version pin & typosquatting detection tests
│   ├── test_risk_engine.py                # 0–10 numeric scoring calculation tests
│   ├── test_auth.py                       # User registration, bcrypt, JWT token tests
│   ├── test_quarantine.py                 # File quarantine & release workflow tests
│   ├── test_report_export.py              # JSON export & ReportLab PDF generation tests
│   ├── test_scans.py                      # Multi-scanner pipeline orchestration tests
│   ├── test_api_week4.py                  # Week 4 API integration tests
│   └── test_api_week5.py                  # Week 5 Full-stack integration tests
│
├── scripts/                               # Evaluation & live verification scripts
│   ├── verify_live_api.py                 # End-to-end live backend API verification
│   ├── live_demo.py                       # CLI interactive live scan demonstrator
│   └── benchmark_scanners.py              # Scanner execution performance benchmark
│
├── DOCS/                                  # Project design & academic documentation
│   ├── requirements.md                    # System requirements specification
│   ├── threat-model.md                    # AI supply chain threat vectors & attack surface
│   ├── system-architecture.md             # High-level architecture & dataflow diagrams
│   ├── module-design.md                   # Scanner component design contracts
│   ├── database-design.md                 # Entity relationship schema & design
│   ├── api-design.md                      # REST API endpoint documentation
│   ├── technology-stack.md                # Technology choices & rationale
│   ├── model-scanner.md                   # Static model disassembly specification
│   ├── dataset-scanner.md                 # Statistical anomaly detection methodology
│   ├── dependency-scanner.md              # Manifest auditing & heuristics
│   ├── risk-assessment.md                 # Scoring formulas & MITRE ATLAS alignment
│   └── weekly-reports/                    # Academic progress reports
│       ├── week-02.md                     # Week 2 progress report
│       ├── week-03.md                     # Week 3 progress report
│       ├── week-04.md                     # Week 4 progress report
│       └── week-05.md                     # Week 5 progress report
│
├── .env                                   # Active environment configuration
├── .env.example                           # Environment template (in-memory defaults)
├── .gitignore                             # Git ignore rules
├── docker-compose.yml                     # Docker Compose multi-service specification
├── Dockerfile.hf                          # Hugging Face Spaces multi-stage build container
├── DEPLOY_HUGGINGFACE.md                  # Hugging Face Spaces deployment guide
├── pytest.ini                             # PyTest path and runner configuration
├── requirements.txt                       # Python backend dependencies
├── setup_linux.sh                         # Automated environment setup script for Linux/WSL2
├── run_linux.sh                           # Concurrent service runner script for Linux
├── LICENSE                                # MIT Open Source License
├── README.md                              # Main comprehensive project documentation
└── README_TEMPORARY.md                    # Project file structure reference
```
