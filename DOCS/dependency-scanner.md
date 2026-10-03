# AISecGuard — Dependency Security Scanner

**Module:** `scanners.dependency_scanner`  
**Phase:** Week 4  
**Status:** Implemented & Verified

---

## 1. Overview & Objectives

The Dependency Security Scanner performs **static analysis** of project dependency manifests to uncover supply chain vulnerabilities, typosquatting candidates, and uncontrolled versioning risks.

### Supported File Formats:
- `requirements.txt` (and variants with `-r`, comments, markers)
- `pyproject.toml` (PEP 517 / PEP 621 dependencies table)

---

## 2. Safety & Security Guarantees

> [!CAUTION]
> **CRITICAL SECURITY REQUIREMENT:**
> - The scanner **never installs** packages (`pip install` is NEVER run).
> - The scanner **never executes** dependency scripts or setup code.
> - Analysis is purely lexical and pattern-driven.

---

## 3. Analysis Categories & Checks

### 3.1 Unpinned Dependencies (DEP-003)
Packages declared without explicit version constraints (e.g. `requests`, `numpy`) always resolve to the newest release on build. This introduces severe supply chain risks:
- Malicious package takeovers or compromised maintainer accounts.
- Breaking backwards-incompatible API changes.

### 3.2 Broad Version Ranges (DEP-004)
Broad range constraints (e.g. `>=1.0`, `<99.0`) allow major updates that have not been tested or vetted for vulnerabilities.

### 3.3 Suspicious Package Names & Typosquatting (DEP-005, DEP-006)
- **Typosquatting Heuristic:** Levenshtein distance matching against popular AI/ML and web packages (e.g., `reqeusts` vs `requests`, `tourch` vs `torch`).
- **Suspicious Keywords:** Heuristics checking for keywords commonly associated with rogue internal packages or credential harvesters.

---

## 4. Rule Reference Table

| Rule ID | Finding Title | Severity | Finding Type |
|---|---|---|---|
| `DEP-001` | Empty dependency file | LOW | `MALFORMED_FILE` |
| `DEP-002` | Dependency file could not be parsed | MEDIUM | `MALFORMED_FILE` |
| `DEP-003` | Unpinned dependency — supply chain risk | MEDIUM | `UNPINNED_DEPENDENCY` |
| `DEP-004` | Overly broad version constraint | LOW | `BROAD_VERSION_RANGE` |
| `DEP-005` | Suspicious package name detected | MEDIUM | `SUSPICIOUS_PACKAGE_NAME` |
| `DEP-006` | Potential typosquatting candidate | HIGH | `SUSPICIOUS_PACKAGE_NAME` |
| `DEP-007` | Non-standard package installation source | MEDIUM | `OTHER` |

---

## 5. Academic Disclaimer

All findings produced by the dependency scanner are heuristic supply-chain indicators. A typosquatting alert highlights name similarity to a well-known package and does not guarantee that the package is malicious.
