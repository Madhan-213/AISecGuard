# 05 — End-to-End API Sequence Diagram
### AISecGuard: Client-Server Protocol & Communication Lifecycle

---

## API Sequence Diagram

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

## Technical Details

- **Protocol**: HTTP/1.1 and HTTP/2 over TLS with RESTful JSON payloads.
- **Authentication**: Bearer JWT tokens in `Authorization` header.
- **Payload Format**: Multipart/form-data for chunked file ingestion; application/json for metadata and scan telemetry; application/pdf for executive reports.
- **Database Transactions**: SQLAlchemy 2.0 with atomic commits and rollback on error.
