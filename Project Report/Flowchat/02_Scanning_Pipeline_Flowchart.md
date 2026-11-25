# 02 — Threat Detection & Scanning Pipeline Flowchart
### AISecGuard: Zero-Execution Static Analysis Heuristics

---

## Scanning Pipeline Flowchart

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

## Technical Details

### 1. Model Scanner (`app/services/model_scanner.py`)
- **Safe Pickle Opcode Disassembly**: Uses `pickletools.genops()` to parse the serialization byte stream without ever invoking Python's unpickler.
- **Dangerous Callables Flagged**: `posix.system`, `subprocess.Popen`, `builtins.eval`, `builtins.exec`, `socket.socket`, `os.system`.
- **Format Hardening**: Recommends modern unpicklable weight formats (`SafeTensors`, `ONNX`).

### 2. Dataset Scanner (`app/services/dataset_scanner.py`)
- **Multi-column Z-Score Anomaly**: Evaluates numeric distributions using $\mu$ and $\sigma$, flagging values with $|Z| > 3.0$.
- **Data Poisoning Heuristics**: Detects class imbalances, label skew, and backdoor trigger anomalies.

### 3. Dependency Scanner (`app/services/dependency_scanner.py`)
- **Typosquatting**: Calculates Levenshtein edit distance against verified AI packages (`torch`, `tensorflow`, `numpy`, `scikit-learn`, `transformers`).
- **CVE Correlation**: Queries the OSV.dev vulnerability database for known CVEs.
