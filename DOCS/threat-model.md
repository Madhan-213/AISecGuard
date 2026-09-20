# AISecGuard — Threat Model

**Project:** AISecGuard: Automated Framework for Detecting, Preventing, and Mitigating AI Supply Chain Attacks  
**Week:** 2  
**Document Type:** Threat Model  
**Author:** MCA 3rd Semester Student  
**Date:** September 2026  
**Framework reference:** MITRE ATLAS, OWASP LLM Top 10 (2026), STRIDE  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [AI Supply Chain Stages](#2-ai-supply-chain-stages)
3. [Threat Analysis by Stage](#3-threat-analysis-by-stage)
4. [Attack Category Summary](#4-attack-category-summary)
5. [AISecGuard Coverage Matrix](#5-aisecguard-coverage-matrix)
6. [Out-of-Scope Threats](#6-out-of-scope-threats)

---

## 1. Introduction

This document describes the threat model for the AISecGuard project. It identifies threats at each stage of the AI supply chain, maps them to known attack frameworks (MITRE ATLAS, OWASP LLM Top 10 2026), and clearly states which threats AISecGuard will detect, which will be simulated for demonstration, and which are outside the project scope.

### Threat Modeling Approach

This threat model is based on analysing the AI supply chain pipeline stage by stage, identifying the assets present at each stage, and applying threat thinking based on:

- **MITRE ATLAS** — Adversarial Threat Landscape for Artificial-Intelligence Systems
- **OWASP LLM Top 10 (2026)** — Particularly LLM04: Supply Chain Vulnerabilities
- **STRIDE** — Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
- **Week 1 Literature Review** — Papers on data poisoning, model integrity, dependency vulnerabilities, and AI-BOM standards

### Important Disclaimer

AISecGuard is an academic project. **It does not implement offensive capabilities.** All detection is based on static analysis, heuristic checks, and pattern matching. The system uses controlled sample artifacts for security evaluation. It does not replicate real attacks.

---

## 2. AI Supply Chain Stages

The following stages are considered:

```
Stage 1: Data Collection
Stage 2: Data Storage
Stage 3: Data Preprocessing
Stage 4: Model Training
Stage 5: Model Packaging
Stage 6: Model Storage / Distribution
Stage 7: Model Deployment
Stage 8: Model Maintenance
```

---

## 3. Threat Analysis by Stage

### Stage 1: Data Collection

| Field | Details |
|---|---|
| **Asset** | Raw training data (web-scraped data, public datasets, labelled samples) |
| **Threat** | Data poisoning at the source |
| **Attack Scenario** | An attacker contributes malicious labelled samples to a public dataset or web-scraping source. These poisoned samples are later used in model training, influencing model behaviour in a targeted or untargeted way. |
| **MITRE ATLAS Reference** | AML.T0020 — Poison Training Data |
| **OWASP LLM Reference** | LLM04 — Supply Chain Vulnerabilities |
| **Vulnerability** | No validation of data origin or label integrity during collection |
| **Impact** | Model learns from poisoned data → degraded or backdoored model behaviour |
| **Detection Approach** | Statistical anomaly checks on label distribution; outlier detection in feature space; provenance metadata recording |
| **Mitigation Approach** | Flag anomalous label distributions; record data source; alert on suspicious datasets |
| **AISecGuard Status** | ✅ Partially implemented — statistical checks on uploaded datasets, provenance recording |

---

### Stage 2: Data Storage

| Field | Details |
|---|---|
| **Asset** | Dataset files stored in cloud/on-premise storage |
| **Threat** | Dataset tampering after collection |
| **Attack Scenario** | An insider or external attacker with storage access modifies stored dataset files. Modified files may not be detected if no integrity baseline exists. |
| **MITRE ATLAS Reference** | AML.T0019 — Backdoor ML Model (data-level variant) |
| **Vulnerability** | Datasets stored without integrity hashes or access controls |
| **Impact** | Tampered data enters the training pipeline without detection |
| **Detection Approach** | SHA-256 hash verification against a recorded baseline |
| **Mitigation Approach** | Quarantine dataset if hash mismatch detected; alert user |
| **AISecGuard Status** | ✅ Implemented — hash-based integrity verification on upload |

---

### Stage 3: Data Preprocessing

| Field | Details |
|---|---|
| **Asset** | Preprocessing scripts, cleaned data outputs |
| **Threat** | Label flipping, targeted class imbalance, silent data manipulation via compromised preprocessing code |
| **Attack Scenario** | Attacker modifies a preprocessing pipeline to systematically flip labels for a specific class. The cleaned output dataset appears structurally valid but contains poisoned labels. |
| **MITRE ATLAS Reference** | AML.T0020 — Poison Training Data |
| **Vulnerability** | Preprocessing code is not verified; output dataset is not validated against expected distributions |
| **Impact** | The trained model misclassifies specific inputs aligned with the attacker's goal |
| **Detection Approach** | Heuristic checks on class distribution (e.g., flag if any class has < 5% or > 80% of samples in a balanced classification dataset); duplicate row detection; outlier row proportion check |
| **Mitigation Approach** | Flag dataset for review; generate warning finding with evidence |
| **AISecGuard Status** | ✅ Partially implemented — label distribution and anomaly checks on uploaded CSV/JSON datasets |

---

### Stage 4: Model Training

| Field | Details |
|---|---|
| **Asset** | Training environment, training scripts, model weights produced |
| **Threat** | Backdoor injection during training; compromised training infrastructure |
| **Attack Scenario** | An attacker inserts a backdoor trigger into the training process. The model behaves normally on clean inputs but produces attacker-controlled outputs when a specific trigger pattern is present. |
| **MITRE ATLAS Reference** | AML.T0018 — Backdoor ML Model |
| **Vulnerability** | No independent inspection of model weights or training procedure integrity |
| **Impact** | Backdoored model is packaged and distributed; backdoor activates in production |
| **Detection Approach** | **Note:** Detecting training-time backdoors with certainty requires access to the training process and/or activation analysis, which is outside AISecGuard's static-analysis scope. AISecGuard records model provenance and flags missing provenance as a risk indicator. |
| **Mitigation Approach** | Provenance warning; recommend model re-training from verified sources |
| **AISecGuard Status** | ⚠️ Partial — provenance recording only; no training-time backdoor detection |

---

### Stage 5: Model Packaging

| Field | Details |
|---|---|
| **Asset** | Serialized model files (`.pkl`, `.h5`, `.pt`, `.onnx`, `.joblib`, `.bin`, `.safetensors`) |
| **Threat A** | Unsafe serialization (pickle-based arbitrary code execution) |
| **Threat B** | Model tampering after packaging |
| **Attack Scenario A** | An attacker distributes a `.pkl` model file containing a malicious pickle payload. When the victim loads the model using `pickle.load()`, arbitrary code is executed on the victim's machine. |
| **Attack Scenario B** | An attacker modifies a legitimate model file (changing weights or adding embedded data) before distribution, without updating the published hash. |
| **MITRE ATLAS Reference** | AML.T0010 — ML Supply Chain Compromise |
| **OWASP LLM Reference** | LLM04 — Supply Chain Vulnerabilities |
| **Vulnerability A** | Python pickle deserialisation executes arbitrary code by design |
| **Vulnerability B** | Models distributed without signed hash verification |
| **Impact A** | Remote code execution on any machine loading the model |
| **Impact B** | Compromised model behaviour; potential data exfiltration on load |
| **Detection Approach A** | Static inspection of model files for pickle protocol markers (opcode `REDUCE`, `GLOBAL`, `BUILD`) and unexpected callable references |
| **Detection Approach B** | SHA-256 hash comparison against known-good value |
| **Mitigation A** | Flag model as Critical; recommend using safe serialization (safetensors, ONNX); quarantine artifact |
| **Mitigation B** | Flag integrity violation; quarantine artifact |
| **AISecGuard Status** | ✅ Implemented — pickle opcode scanning + hash integrity checking |

---

### Stage 6: Model Storage / Distribution

| Field | Details |
|---|---|
| **Asset** | Model repository (Hugging Face Hub, GitHub, private S3 bucket, model registry) |
| **Threat** | Compromised model registry; typosquatting model names; model substitution |
| **Attack Scenario** | An attacker uploads a malicious model to Hugging Face using a name similar to a popular model. Developers accidentally download the malicious version. Alternatively, a private model registry is compromised and a legitimate model is replaced. |
| **MITRE ATLAS Reference** | AML.T0010 — ML Supply Chain Compromise |
| **Vulnerability** | No hash pinning or signature verification when downloading models |
| **Impact** | Malicious model deployed in production; data exfiltration, model failure |
| **Detection Approach** | Provenance check (source URL, download hash); integrity verification on upload to AISecGuard |
| **Mitigation Approach** | Record provenance source; flag unknown/unverified sources; recommend hash pinning |
| **AISecGuard Status** | ✅ Partially implemented — provenance source recording; hash verification |

---

### Stage 7: Model Deployment

| Field | Details |
|---|---|
| **Asset** | Deployed model serving infrastructure, model inference API |
| **Threat** | Model extraction (stealing model via API); adversarial inputs; evasion attacks |
| **Attack Scenario** | An attacker queries the model API with carefully crafted inputs to infer the model's decision boundary and reconstruct a local copy. |
| **MITRE ATLAS Reference** | AML.T0005 — Model Inversion Attack; AML.T0006 — Craft Adversarial Data |
| **Vulnerability** | No rate limiting on inference API; no adversarial input detection |
| **Impact** | Model intellectual property theft; evasion of security classifiers |
| **Detection Approach** | **Note:** Runtime inference monitoring is outside AISecGuard's current scope. |
| **Mitigation Approach** | Recommend API rate limiting, output perturbation, and monitoring |
| **AISecGuard Status** | ❌ Out of scope (runtime monitoring not implemented) |

---

### Stage 8: Model Maintenance

| Field | Details |
|---|---|
| **Asset** | Model update pipelines, fine-tuning datasets, updated model artifacts |
| **Threat** | Compromise of fine-tuning data; supply chain attack via model update |
| **Attack Scenario** | An attacker poisons a fine-tuning dataset used in a model update cycle. The updated model version introduces a backdoor that was not present in the original. |
| **MITRE ATLAS Reference** | AML.T0019 — Backdoor ML Model (update-time variant) |
| **Vulnerability** | Model update datasets not re-validated; new model artifact not re-scanned |
| **Impact** | Security regression introduced via model update |
| **Detection Approach** | Re-scanning updated model artifacts and datasets through AISecGuard before deployment |
| **Mitigation Approach** | Recommend mandatory re-scan before deploying updated models |
| **AISecGuard Status** | ✅ Supported — any updated artifact can be uploaded and re-scanned |

---

## 4. Attack Category Summary

| # | Attack Category | MITRE ATLAS ID | OWASP LLM | AISecGuard Coverage |
|---|---|---|---|---|
| 1 | Data poisoning (untargeted) | AML.T0020 | LLM04 | ✅ Heuristic detection |
| 2 | Data poisoning (label flipping) | AML.T0020 | LLM04 | ✅ Label distribution analysis |
| 3 | Dataset tampering (post-collection) | AML.T0019 | LLM04 | ✅ Hash verification |
| 4 | Provenance manipulation | AML.T0010 | LLM04 | ✅ Provenance recording |
| 5 | Unsafe model serialization (pickle RCE) | AML.T0010 | LLM04 | ✅ Static opcode scan |
| 6 | Model tampering / integrity failure | AML.T0019 | LLM04 | ✅ Hash verification |
| 7 | Backdoored pre-trained model | AML.T0018 | LLM04 | ⚠️ Provenance + metadata flags only |
| 8 | Typosquatting / model substitution | AML.T0010 | LLM04 | ✅ Provenance source recording |
| 9 | Malicious AI/ML package dependency | — | LLM04 | ✅ Dependency vulnerability check |
| 10 | Vulnerable AI/ML dependency (CVE) | — | LLM04 | ✅ CVE matching |
| 11 | Adversarial inference attacks | AML.T0005 | LLM01 | ❌ Out of scope |
| 12 | Model extraction / inversion | AML.T0005 | — | ❌ Out of scope |
| 13 | Prompt injection (LLM) | — | LLM01 | ❌ Out of scope |
| 14 | Runtime evasion attacks | AML.T0006 | — | ❌ Out of scope |

---

## 5. AISecGuard Coverage Matrix

| Feature | Detection Method | Implemented? |
|---|---|---|
| Dataset integrity verification | SHA-256 hash | Week 3 (planned) |
| Model integrity verification | SHA-256 hash | Week 3 (planned) |
| Dataset provenance recording | Metadata storage | Week 3 (planned) |
| Model provenance recording | Metadata storage | Week 3 (planned) |
| Pickle/unsafe serialization detection | Static opcode scan | Week 3 (planned) |
| Label distribution anomaly detection | Statistical analysis | Week 3 (planned) |
| Dataset outlier detection | Statistical thresholds | Week 3 (planned) |
| Dependency CVE matching | Package list comparison | Week 3–4 (planned) |
| Risk scoring | Severity aggregation | Week 4 (planned) |
| Quarantine flagging | Database flag | Week 4 (planned) |
| Report generation | JSON + text | Week 5 (planned) |
| Dashboard | React web UI | Week 6–7 (planned) |

> **Note:** As of Week 2, all detection is **designed but not yet implemented**. The system design and architecture are complete. Implementation begins in Week 3.

---

## 6. Out-of-Scope Threats

The following threats are **not** addressed by AISecGuard in the current 12-week project:

| Threat | Reason Out of Scope |
|---|---|
| Runtime adversarial attacks | Requires live inference monitoring; not implementable in a static-analysis framework |
| LLM prompt injection | Separate domain; not relevant to the supply chain artifacts AISecGuard scans |
| Hardware/firmware attacks | Physical layer; outside software-only project scope |
| Memory corruption / side-channel | Requires native code analysis beyond Python |
| Full MITRE ATLAS simulation | Would require a controlled attack lab environment |
| Differential privacy analysis | Requires model internals and training data simultaneously |
| Distributed supply chain monitoring | Requires integration with multiple external systems |

These threats are noted as **future enhancements** in the requirements document.
