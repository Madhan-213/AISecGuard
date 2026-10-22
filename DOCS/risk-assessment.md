# AISecGuard — Risk Assessment Engine

**Module:** `backend.app.services.risk_engine`  
**Phase:** Week 4  
**Status:** Implemented & Verified

---

## 1. Overview & Architecture

The Central Risk Assessment Engine aggregates findings from all active scanners (**Model Scanner**, **Dataset Scanner**, **Dependency Scanner**, and **Provenance Scanner**) into an **explainable, transparent, and reproducible** numeric risk score and qualitative risk tier.

---

## 2. Transparent Scoring System

Each finding generated during analysis contributes points based on its severity level:

| Severity Level | Score Weight | Description |
|---|---|---|
| `INFORMATIONAL` | **0 points** | Informative observation (e.g. SafeTensors or ONNX format detected) |
| `LOW` | **1 point** | Minor anomaly or advisory warning (e.g. constant column, broad range) |
| `MEDIUM` | **3 points** | Significant security indicator (e.g. unpinned dependency, high duplicates) |
| `HIGH` | **6 points** | Severe supply chain risk (e.g. pickle format, typosquatting candidate) |
| `CRITICAL` | **10 points** | Immediate risk indicator (e.g. `os.system` detected in pickle opcodes) |

$$\text{Risk Score} = \sum_{f \in \text{Findings}} \text{Weight}(\text{Severity}(f))$$

---

## 3. Risk Level Classification & Override Logic

The aggregate score is mapped to a standardized `RiskLevel`:

| Aggregate Score Range | Risk Level | Operational Meaning |
|---|---|---|
| `0 - 4` | **LOW** | Low risk / safe for review |
| `5 - 14` | **MEDIUM** | Moderate risk — manual review recommended |
| `15 - 29` | **HIGH** | High risk — significant security warnings |
| `30+` | **CRITICAL** | Severe risk — quarantine artifact immediately |

### Security Override Rules:
1. **Single Critical Finding:** Any single finding with `CRITICAL` severity immediately elevates the minimum classification to **HIGH**, regardless of total score.
2. **Multiple Critical Findings:** Two or more `CRITICAL` findings guarantee a **CRITICAL** risk level.

---

## 4. Explainability & Output Format

The engine provides a structured, explainable breakdown:

```json
{
  "risk_score": 19,
  "severity": "HIGH",
  "finding_count": 4,
  "severity_breakdown": {
    "critical": 1,
    "high": 1,
    "medium": 1,
    "low": 0,
    "informational": 1
  },
  "explanation": "Score 19 computed from 4 finding(s) [1 critical (+10 pts), 1 high (+6 pts), 1 medium (+3 pts), 1 informational (0 pts)]. Overall risk assessment: HIGH."
}
```

The numeric `risk_score` is persisted in the database table `scans.risk_score` and returned in all API responses.
