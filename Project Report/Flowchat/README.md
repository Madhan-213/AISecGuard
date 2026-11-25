# 🛡️ AISecGuard — Complete Project Architecture & Flowcharts
### Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks

---

## 📌 Document Overview

This document provides the complete system architecture, operational workflows, and security verification pipelines for the **AISecGuard** platform. It contains **5 comprehensive flowchart diagrams** formatted with Mermaid, alongside technical explanations suitable for inclusion in the MCA Final Year Project Report and technical documentation.

---

## 📑 Table of Contents

1. [Master End-to-End System Flowchart](#1-master-end-to-end-system-flowchart)
2. [Deep-Dive Threat Detection & Scanning Pipeline](#2-deep-dive-threat-detection--scanning-pipeline)
3. [Policy Enforcement & Quarantine Isolation Workflow](#3-policy-enforcement--quarantine-isolation-workflow)
4. [Cryptographic Provenance & Ed25519 Signing Workflow](#4-cryptographic-provenance--ed25519-signing-workflow)
5. [End-to-End API Sequence Diagram](#5-end-to-end-api-sequence-diagram)
6. [Summary of Architectural Phases & Guarantees](#6-summary-of-architectural-phases--guarantees)

---

## 1. Master End-to-End System Flowchart

This diagram illustrates the complete end-to-end lifecycle of an AI asset within AISecGuard, from initial user upload through multi-stage static analysis, policy evaluation, automated isolation, cryptographic signing, and enterprise reporting.

```mermaid
flowchart TD
    %% Styling & Theme Setup
    classDef client fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#ffffff;
    classDef gateway fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#ffffff;
    classDef engine fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#ffffff;
    classDef decision fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff;
    classDef quarantine fill:#ef4444,stroke:#b91c1c,stroke-width:2px,color:#ffffff;
    classDef safe fill:#10b981,stroke:#047857,stroke-width:2px,color:#ffffff;
    classDef storage fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#ffffff;

    subgraph CLIENT_LAYER ["1. Presentation & Client Layer (React 19 + Vite 6)"]
        A["User (SecOps / MLOps / Auditor)"]:::client
        B["React Dashboard UI"]:::client
        C["Upload Gateway (/upload)"]:::client
    end

    subgraph API_GATEWAY ["2. API & Control Gateway (FastAPI Backend)"]
        D["OAuth2 & JWT Bearer Authentication"]:::gateway
        E["Role-Based Access Control: ADMIN, ANALYST, AUDITOR"]:::gateway
        F["Upload Ingestion & Chunked File Buffer"]:::gateway
        G["Cryptographic SHA-256 Ingestion Baseline"]:::gateway
    end

    subgraph SCAN_ENGINE ["3. Zero-Execution Static Analysis Engine"]
        H{"Artifact Type Classification"}:::decision
        I["Model Scanner: Zero-Execution Pickle Opcode Disassembly"]:::engine
        J["Dataset Scanner: Statistical Z-Score & Poisoning Detection"]:::engine
        K["Dependency Scanner: OSV.dev CVE & Typosquat Analysis"]:::engine
        L["Aggregation & Heuristic Rule Engine"]:::engine
    end

    subgraph EVAL_ENGINE ["4. Risk Scoring & Policy Decision Engine"]
        M["Risk Score Calculator: 0-100 & Severity Matrix"]:::engine
        N{"Policy Evaluation Gate: Score <= Threshold?"}:::decision
    end

    subgraph QUARANTINE_LAYER ["5. Isolation & Remediation Layer"]
        O["Physical Isolation: Move to uploads/quarantine/"]:::quarantine
        P["Lock Artifact Status: QUARANTINED"]:::quarantine
        Q["Block Pipeline Loading & Serving Access"]:::quarantine
        R["Auditor Review & Manual Release with Justification"]:::quarantine
    end

    subgraph PROVENANCE_LAYER ["6. Provenance & Supply Chain Signing Layer"]
        S["Generate / Retrieve Ed25519 Private Key"]:::safe
        T["Cryptographically Sign Artifact SHA-256 Digest"]:::safe
        U["Generate ML-BOM & CycloneDX Manifest"]:::safe
        V["Link Provenance Lineage: Dataset -> Model -> Child"]:::safe
    end

    subgraph STORAGE_AUDIT ["7. Persistence & Audit Reporting Layer"]
        W[("Relational Database: SQLite WAL / PostgreSQL")]:::storage
        X["Activity Audit Trail & Security Alerts"]:::storage
        Y["ReportLab PDF Engine & JSON Compliance Exporters"]:::storage
    end

    %% Flows & Connections
    A -->|"1. Authenticates"| B
    B -->|"2. Selects artifact"| C
    C -->|"3. Multipart POST payload"| D
    D -->|"4. Token validated"| E
    E -->|"5. Dispatches request"| F
    F -->|"6. Computes digest"| G
    G -->|"7. Ingests raw bytes"| H

    H -->|"AI Model (.pkl, .pt, .onnx)"| I
    H -->|"Tabular Dataset (.csv, .parquet, .json)"| J
    H -->|"Dependency Manifest (requirements.txt)"| K

    I -->|"Opcodes & Callables"| L
    J -->|"Anomalies & Poison score"| L
    K -->|"CVEs & Typosquats"| L

    L -->|"Synthesized findings"| M
    M -->|"Calculates overall risk"| N

    N -->|"High / Critical Risk (Violates Policy)"| O
    O --> P --> Q --> R
    R -.->|"If released by Admin"| S

    N -->|"Clean / Low Risk (Passed Policy)"| S
    S --> T --> U --> V

    P -->|"Logs incident"| X
    T -->|"Stores signature"| W
    V -->|"Persists lineage graph"| W
    M -->|"Generates report"| Y
    Y -->|"Download PDF / JSON"| B
    X -->|"Real-time notification"| B
```

---

## 2. Deep-Dive Threat Detection & Scanning Pipeline

This diagram shows the specialized, zero-execution static inspection logic executed inside each security analyzer.

```mermaid
flowchart LR
    classDef input fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#ffffff;
    classDef step fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#ffffff;
    classDef check fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff;
    classDef alert fill:#ef4444,stroke:#b91c1c,stroke-width:2px,color:#ffffff;
    classDef ok fill:#10b981,stroke:#047857,stroke-width:2px,color:#ffffff;

    subgraph MODEL_PIPELINE ["Model Security Pipeline (Zero-Execution)"]
        M1["Model File (.pkl, .pt, .joblib)"]:::input --> M2["Safe Disassembly via pickletools.genops"]:::step
        M2 --> M3{"Inspect GLOBAL & REDUCE Opcodes"}:::check
        M3 -->|"Found: eval, exec, os.system, subprocess, socket"| M4["Rule MODEL-001/002: Critical Arbitrary Code Execution"]:::alert
        M3 -->|"Found: SafeTensors / Weights Only"| M5["Rule MODEL-000: Clean Neural Weights"]:::ok
        M2 --> M6{"Format Security"}:::check
        M6 -->|"Unsafe PyTorch weights_only=False"| M7["Rule MODEL-003: Insecure Format Warning"]:::alert
    end

    subgraph DATASET_PIPELINE ["Dataset Integrity & Poisoning Pipeline"]
        D1["Dataset (.csv, .parquet, .jsonl)"]:::input --> D2["Schema & Missing Ratio Validator"]:::step
        D2 --> D3["Statistical Multi-Column Profiling"]:::step
        D3 --> D4{"Evaluate Z-Scores"}:::check
        D4 -->|"Points exceeding 3-Sigma (|z| > 3.0)"| D5["Rule DATA-001: Extreme Outlier Anomaly"]:::alert
        D4 -->|"Label Skew / Distribution Anomaly"| D6["Rule DATA-002: Targeted Poisoning Backdoor"]:::alert
        D4 -->|"Normal Gaussian distribution"| D7["Rule DATA-000: Clean Data Baseline"]:::ok
    end

    subgraph DEPENDENCY_PIPELINE ["Dependency & Supply Chain Pipeline"]
        P1["Manifest (requirements.txt)"]:::input --> P2["AST Package & Version Parser"]:::step
        P2 --> P3["Levenshtein Distance Calculation"]:::step
        P3 --> P4{"Typosquatting Check vs PyPI Top 100 AI"}:::check
        P4 -->|"Matches typosquat: e.g. torchofficial"| P5["Rule DEP-002: Typosquatted Package Detected"]:::alert
        P2 --> P6["Query OSV.dev Database"]:::step
        P6 --> P7{"Known Vulnerabilities (CVE)"}:::check
        P7 -->|"Unpatched CVE match"| P8["Rule DEP-001: Known CVE Vulnerability"]:::alert
        P7 -->|"All packages pinned & clean"| P9["Rule DEP-000: Clean Dependency Tree"]:::ok
    end
```

---

## 3. Policy Enforcement & Quarantine Isolation Workflow

This flowchart details how threat findings are mapped into a standardized risk score and evaluated against security thresholds for physical containment.

```mermaid
flowchart TD
    classDef calc fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#ffffff;
    classDef decision fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff;
    classDef isolate fill:#ef4444,stroke:#b91c1c,stroke-width:2px,color:#ffffff;
    classDef safe fill:#10b981,stroke:#047857,stroke-width:2px,color:#ffffff;

    A["All Scanner Findings Aggregated"]:::calc
    B["Weight Findings by Severity: Critical=10, High=7, Medium=4, Low=1"]:::calc
    C["Compute Normalized Threat Score: 0 to 100"]:::calc

    A --> B --> C

    C --> D{"Evaluate Active Security Policy"}:::decision

    D -->|"Score >= 70 or Critical Finding Detected"| E["Verdict: VIOLATION_QUARANTINE"]:::isolate
    D -->|"Score < 70 and No Critical Findings"| F["Verdict: COMPLIANT_APPROVED"]:::safe

    subgraph CONTAINMENT ["Automated Isolation Protocol"]
        E --> G["Atomic OS File Move: uploads/ -> uploads/quarantine/"]:::isolate
        G --> H["Set Artifact Status = QUARANTINED in Database"]:::isolate
        H --> I["Revoke Public & Lineage Access Tokens"]:::isolate
        I --> J["Emit High-Priority System Notification & Activity Log"]:::isolate
        J --> K["Display Warning Banner on Quarantine Dashboard"]:::isolate
    end

    subgraph REMEDIATION ["Analyst Remediation Protocol"]
        K --> L{"Security Analyst Inspection"}:::decision
        L -->|"Option A: Permanent Purge"| M["Delete File & Associated Scan Data"]:::isolate
        L -->|"Option B: Authorized Override"| N["Record Mandatory Audit Justification Reason"]:::safe
        N --> O["Atomic File Move: uploads/quarantine/ -> uploads/"]:::safe
        O --> P["Restore Status = ACTIVE & Log Audit Release"]:::safe
    end
```

---

## 4. Cryptographic Provenance & Ed25519 Signing Workflow

Once an artifact passes evaluation, AISecGuard guarantees software supply chain integrity through public-key cryptography and lineage tracking.

```mermaid
flowchart TD
    classDef input fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#ffffff;
    classDef crypto fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#ffffff;
    classDef lineage fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#ffffff;
    classDef output fill:#10b981,stroke:#047857,stroke-width:2px,color:#ffffff;

    A["Verified Safe Artifact"]:::input --> B["Compute Chunked SHA-256 Digest"]:::crypto
    B --> C["Compare with Ingestion Hash Baseline"]:::crypto

    C --> D{"Disk Integrity Match?"}:::crypto
    D -->|"Hash Mismatch (Tampered)"| E["Raise Anti-Tamper Alert & Revoke Approval"]:::crypto
    D -->|"Hash Verified (Intact)"| F["Retrieve Platform Ed25519 Signing Keypair"]:::crypto

    F --> G["Sign SHA-256 Digest with Ed25519 Private Key"]:::crypto
    G --> H["Store Base64 Signature & Public Key in DB"]:::crypto

    H --> I["Generate ML-BOM (CycloneDX 1.5 Spec)"]:::lineage
    I --> J["Record Lineage Graph Nodes & Edges"]:::lineage

    subgraph LINEAGE_GRAPH ["Directed Acyclic Graph (DAG) Tracking"]
        K["Parent Node: Raw Training Dataset (SHA-256)"]:::lineage
        L["Edge: trained_on relationship"]:::lineage
        M["Child Node: Pre-trained Model Checkpoint"]:::lineage
        N["Edge: fine_tuned_into relationship"]:::lineage
        O["Target Node: Deployed Production Model (Signed)"]:::lineage
        K --> L --> M --> N --> O
    end

    J --> LINEAGE_GRAPH
    LINEAGE_GRAPH --> P["Publish Verifiable Digital Certificate & Model Card"]:::output
```

---

## 5. End-to-End API Sequence Diagram

This sequence diagram illustrates client-server interactions across the UI, backend endpoints, scanners, storage, and quarantine vault.

```mermaid
sequenceDiagram
    autonumber
    actor User as Security Analyst / CI
    participant Web as React Web App
    participant API as FastAPI Gateway
    participant Engine as Static Analysis Engine
    participant DB as SQLite / PostgreSQL
    participant Vault as Quarantine Vault

    User->>Web: Uploads Model (.pkl) & triggers scan
    Web->>API: POST /api/v1/artifacts/upload (multipart, JWT)
    API->>API: Calculate SHA-256 & store file
    API->>DB: INSERT into artifacts (status='UPLOADED')
    API-->>Web: 201 Created (artifact_id)

    Web->>API: POST /api/v1/scans/ (artifact_id)
    API->>DB: INSERT into scans (status='RUNNING')
    API->>Engine: Run safe static analysis (zero execution)

    Engine->>Engine: Disassemble opcodes via pickletools
    alt Dangerous opcode detected (eval, exec, os.system)
        Engine->>Engine: Flag CRITICAL finding MODEL-002
        Engine->>API: Scan results: Threat Score = 90 (CRITICAL)
        API->>Vault: Atomic move file to uploads/quarantine/
        API->>DB: UPDATE artifacts SET status='QUARANTINED'
        API->>DB: INSERT into findings (Rule: MODEL-002)
        API->>DB: INSERT into activity_logs (Action: QUARANTINE)
        API-->>Web: Scan completed (Quarantined)
        Web->>User: Renders Red Critical Isolation View
    else Clean artifact (no suspicious opcodes)
        Engine->>API: Scan results: Threat Score = 0 (CLEAN)
        API->>API: Sign SHA-256 with Ed25519 key
        API->>DB: INSERT into signatures
        API->>DB: UPDATE artifacts SET status='VERIFIED'
        API-->>Web: Scan completed (Approved & Signed)
        Web->>User: Renders Green Clean & Signed View
    end

    User->>Web: Clicks "Download PDF Report"
    Web->>API: GET /api/v1/reports/{scan_id}?format=pdf
    API->>API: Generate 3-page executive cybersecurity report
    API-->>Web: Binary PDF stream (application/pdf)
    Web-->>User: Downloads aisecguard_report_{scan_id}.pdf
```

---

## 6. Summary of Architectural Phases & Guarantees

| Phase | Core Mechanism | Security Guarantee |
| :--- | :--- | :--- |
| **1. Ingestion** | Chunked SHA-256 baseline hashing & MIME type verification | Detects byte tampering post-ingestion. |
| **2. Model Inspection** | Python `pickletools.genops` disassembly & AST validation | **Zero code execution guarantee**; hazardous deserialization payloads detected without executing. |
| **3. Dataset Inspection** | Multi-column distribution analysis ($3\sigma$ Z-score outliers) | Identifies data poisoning backdoors and skewed label corruption. |
| **4. Dependency Inspection** | OSV.dev CVE database matching & Levenshtein typosquat checks | Flags compromised packages, typosquats, and unpinned AI frameworks. |
| **5. Policy & Scoring** | Weighted severity scoring ($0 \text{ to } 100$) against security thresholds | Enforces automated containment for high-risk assets. |
| **6. Quarantine Vault** | Physical OS-level file isolation to `uploads/quarantine/` | Prevents unauthorized execution, training ingestion, or serving. |
| **7. Provenance** | Ed25519 digital signatures & DAG lineage tracking | Cryptographic proof of origin and supply chain traceability. |
| **8. Reporting** | ReportLab enterprise PDF generation & structured JSON exports | Produces audit-ready documentation for DevSecOps and compliance teams. |
