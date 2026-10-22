# AISecGuard — Model Security Scanner

**Module:** `backend.app.scanners.model_scanner` / `scanners.model_scanner`  
**Phase:** Week 3–4  
**Status:** Implemented & Verified

---

## 1. Overview & Objectives

The Model Security Scanner inspects AI/ML model artifacts using **strict static analysis** to identify serialization hazards, embedded command injection patterns, and format-specific vulnerabilities.

### Supported File Formats:
- `.pkl`, `.pickle`, `.joblib` — Pickle opcode analysis
- `.pt`, `.pth` — PyTorch archive inspection
- `.h5` — HDF5 / Keras signature verification
- `.onnx` — ONNX protobuf structure
- `.safetensors` — SafeTensors format verification
- `.bin` — Generic binary format static inspection

---

## 2. Safety & Security Guarantees

> [!CAUTION]
> **CRITICAL SECURITY REQUIREMENT:**
> - Untrusted model files are **NEVER deserialized or executed**.
> - Functions such as `pickle.load()`, `torch.load()`, or `joblib.load()` are **NEVER called** on uploaded artifacts.
> - Analysis is performed via `pickletools.genops()` opcode disassembly and raw byte scanning.

---

## 3. Analysis Categories & Checks

### 3.1 Unsafe Serialization Format (MODEL-001, MODEL-003, MODEL-004)
- Flags inherently risky formats that allow code execution during deserialization.
- Recommends migrating to safer formats like **SafeTensors** or **ONNX**.

### 3.2 Suspicious Opcode References (MODEL-002)
- Disassembles pickle opcodes without execution to inspect `GLOBAL`, `STACK_GLOBAL`, and `INST` targets.
- Identifies references to dangerous functions (`os.system`, `subprocess.Popen`, `eval`, `exec`, `socket`, `urllib.request`).
- Produces **CRITICAL** severity findings with exact evidence strings.

### 3.3 Static Byte Pattern Scanning (MODEL-009)
- Scans binary models for embedded strings such as `import os`, `cmd.exe`, `/bin/sh`, `base64.b64decode`.

### 3.4 Large File Detection (MODEL-010)
- Flags files exceeding 500 MB to warn administrators of potential resource exhaustion / DoS risks.

---

## 4. Rule Reference Table

| Rule ID | Finding Title | Severity | Finding Type |
|---|---|---|---|
| `MODEL-001` | Pickle-based serialization detected | HIGH | `UNSAFE_SERIALIZATION` |
| `MODEL-002` | Suspicious module/callable in opcodes | CRITICAL | `SUSPICIOUS_REFERENCE` |
| `MODEL-003` | PyTorch format detected | MEDIUM/HIGH | `UNSAFE_SERIALIZATION` |
| `MODEL-004` | HDF5 format detected | MEDIUM/LOW | `UNSAFE_SERIALIZATION` |
| `MODEL-005` | ONNX model format detected | INFORMATIONAL | `PROVENANCE_RECORDED` |
| `MODEL-006` | SafeTensors format detected | INFORMATIONAL | `PROVENANCE_RECORDED` |
| `MODEL-007` | Generic binary model format (.bin) | INFORMATIONAL | `PROVENANCE_RECORDED` |
| `MODEL-008` | Unsupported model file extension | MEDIUM | `UNKNOWN_FORMAT` |
| `MODEL-009` | Suspicious embedded string in binary | HIGH | `SUSPICIOUS_REFERENCE` |
| `MODEL-010` | Large model file warning (>500MB) | LOW | `LARGE_FILE_WARNING` |
| `MODEL-011` | Scanner error reading model file | MEDIUM | `OTHER` |

---

## 5. Academic Disclaimer

Static byte and opcode checks are heuristic risk indicators. A format warning does not prove that a model contains active malware, nor does the absence of findings guarantee that a complex binary model is completely risk-free.
