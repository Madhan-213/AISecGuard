# 03 — Policy Enforcement & Quarantine Isolation Flowchart
### AISecGuard: Automated Threat Containment & Isolation Protocol

---

## Quarantine Isolation Flowchart

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

## Technical Details

### Scoring Formulation
- **Critical Severity**: Weight = 10 (Direct RCE, arbitrary bytecode execution)
- **High Severity**: Weight = 7 (Unpinned dependencies, severe label distribution skew)
- **Medium Severity**: Weight = 4 (Deprecated formats, unpinned packages)
- **Low Severity**: Weight = 1 (Informational notices)
- **Quarantine Threshold**: Any artifact with a normalized risk score $\ge 70$ or containing any `CRITICAL` finding is automatically isolated.

### File Isolation Mechanism
- Physical storage move to `uploads/quarantine/`.
- File permissions locked.
- Serving endpoints reject download requests with HTTP 403 Forbidden.
- Requires administrator override with logged justification to release.
