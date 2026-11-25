# 04 — Cryptographic Provenance & Ed25519 Signing Flowchart
### AISecGuard: Supply Chain Integrity & Lineage DAG

---

## Provenance & Signing Flowchart

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

## Technical Details

### 1. SHA-256 Cryptographic Baselines
- Chunked 64KB hashing upon initial ingestion.
- Background anti-tamper verifier re-computes hashes to detect silent on-disk corruption or unauthorized modifications.

### 2. Ed25519 Digital Signatures
- Uses Curve25519 high-speed elliptic curve digital signatures (`cryptography.hazmat.primitives.asymmetric.ed25519`).
- Signatures cannot be forged without the private platform key.
- Public key is distributed via `/api/v1/signing/public-key` for offline verification in MLOps CI/CD pipelines.

### 3. ML-BOM (Machine Learning Bill of Materials)
- Formatted according to CycloneDX 1.5 standards.
- Documents training dataset hashes, model architecture, hyperparameters, and framework dependencies.
