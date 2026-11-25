# AISecGuard Evaluation Sample Set — Person B Handoff

**Prepared by:** Person A (Backend and Security)
**Target:** Model Security Scanner Static Evaluation (Protocols 0 to 5)

## Overview
This directory contains a complete sample benchmark for evaluating the
pickle scanner fix for Bug 1 (STACK_GLOBAL tracking & denylist matching)
and Bug 2 (parsing error reporting).

### Malicious Samples (Protocols 0 to 5)
Every file matching `malicious_<payload>_proto<0-5>.pkl` embeds a denylisted
callable reference (`os.system`, `builtins.eval`, `subprocess.Popen`, `socket.socket`).
- **Expected Scanner Outcome:** `CRITICAL` risk level with rule `MODEL-002`.
- **Expected References:** The specific callable must be listed under finding evidence.

### Benign Samples (scikit-learn and PyTorch)
Files matching `benign_sklearn_model_proto<N>.pkl` and `benign_torch_model_proto<N>.pkl`
contain authentic ML weights and structures without dangerous callables.
- **Expected Scanner Outcome:** Flagged with `MODEL-001` (Pickle format warning, `HIGH`),
  but must **NOT** raise `MODEL-002` (CRITICAL).

### Automated Validation
Run the test suite from project root:
```bash
pytest tests/test_pickle_scanner.py
```
All 37 test cases will pass automatically.
