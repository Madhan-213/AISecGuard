# AISecGuard — Dataset Security Scanner

**Module:** `scanners.dataset_scanner`  
**Phase:** Week 4  
**Status:** Implemented & Verified

---

## 1. Overview & Objectives

The Dataset Security Scanner provides **static analysis** of datasets used for training and fine-tuning AI/ML models. It detects potential supply chain risks, data poisoning indicators, and structural anomalies before datasets are fed into ML training pipelines.

### Supported File Formats:
- `.csv` — Comma-separated values
- `.json` — JSON array / records
- `.jsonl` — JSON Lines
- `.parquet` — Columnar Parquet format

---

## 2. Safety & Security Guarantees

> [!CAUTION]
> **CRITICAL SECURITY REQUIREMENT:**
> - The scanner **never executes dataset content**.
> - The scanner **never evaluates Python expressions** from dataset cells.
> - The scanner **never loads unsafe serialized objects**.
> - All parsing is performed statically using secure tabular readers.

---

## 3. Analysis Categories & Heuristics

### 3.1 File Validation Checks
- **Empty file detection (DATA-001):** Flags 0-byte or completely empty dataset files.
- **Malformed parsing (DATA-002):** Catches corrupted formats or syntax errors without crashing the pipeline.

### 3.2 Dataset Structure Checks
- **No data rows (DATA-003):** Schema or header is present but no data rows exist.
- **Single column (DATA-004):** Flags potential delimiter errors or incomplete exports.
- **Constant columns (DATA-005):** Zero-variance columns that are uninformative or indicate label manipulation.
- **Suspicious column headers (DATA-006):** Detects characters associated with CSV formula injection (`=`, `+`, `-`, `@`, `|`).
- **High missing values (DATA-010) & All-missing columns (DATA-011):** Detects corrupted or stripped feature fields.

### 3.3 Potential Data Poisoning Indicators
- **High duplicate concentration (DATA-007):** Flags datasets where >30% of rows are exact duplicates (indicative of label-repetition or stuffing attacks).
- **Extreme numerical outliers (DATA-008):** Detects numerical values beyond 5 standard deviations from the mean (potential destabilization/gradient explosion attacks).
- **Abnormal class distribution (DATA-009):** Detects extreme imbalance (>90% single class) in candidate label columns.

---

## 4. Rule Reference Table

| Rule ID | Finding Title | Severity | Finding Type |
|---|---|---|---|
| `DATA-001` | Empty dataset file | MEDIUM | `MALFORMED_FILE` |
| `DATA-002` | Malformed or unparseable dataset | MEDIUM | `MALFORMED_FILE` |
| `DATA-003` | Dataset contains no data rows | LOW | `STRUCTURAL_ANOMALY` |
| `DATA-004` | Dataset has only one column | INFORMATIONAL | `STRUCTURAL_ANOMALY` |
| `DATA-005` | Constant-value column detected | LOW | `STRUCTURAL_ANOMALY` |
| `DATA-006` | Suspicious column names detected | LOW | `STRUCTURAL_ANOMALY` |
| `DATA-007` | Potential Anomaly: High duplicate concentration | MEDIUM | `DATA_POISONING_INDICATOR` |
| `DATA-008` | Potential Anomaly: Extreme numerical values | MEDIUM | `DATA_POISONING_INDICATOR` |
| `DATA-009` | Potential Anomaly: Highly imbalanced class distribution | LOW | `DATA_POISONING_INDICATOR` |
| `DATA-010` | Potential Anomaly: High missing value rate | LOW | `STRUCTURAL_ANOMALY` |
| `DATA-011` | Potential Anomaly: Column is entirely missing/null | MEDIUM | `STRUCTURAL_ANOMALY` |

---

## 5. Academic Disclaimer

AISecGuard is an academic cybersecurity prototype. Dataset checks use heuristic indicators and statistical flags. A finding indicates a **potential anomaly** and **does not guarantee** intentional data poisoning or malicious intent.
