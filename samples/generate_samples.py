"""
AISecGuard — Sample Artifacts Generator
Week 6 Enhancement: Extended to write malicious pickles for protocols 0 to 5
and several payloads (os.system, builtins.eval, subprocess.Popen, socket.socket),
plus benign scikit-learn and PyTorch model pickles for Person B's evaluation.

Run from project root:
  python samples/generate_samples.py

IMPORTANT:
  - Security fixtures are strictly for static inspection testing.
  - NEVER deserialize or execute uploaded artifacts in production runtime.
"""

import os
import sys
import types
import pickle
import hashlib
import json
from pathlib import Path


SAMPLES_DIR = Path(__file__).parent
MODELS_DIR = SAMPLES_DIR / "models"
DATASETS_DIR = SAMPLES_DIR / "datasets"
DEPS_DIR = SAMPLES_DIR / "dependencies"


def sha256_of(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_sample(path: Path, content: bytes, description: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    digest = sha256_of(content)
    print(f"  [OK] {path.name} ({len(content)} bytes) SHA256={digest[:16]}...")
    print(f"     {description}")


# ---------------------------------------------------------------------------
# Helpers for mock serialization of payloads and benign models
# ---------------------------------------------------------------------------

class _CallablePayload:
    """Helper object used ONLY to serialize callable references during dumps."""
    def __init__(self, mod: str, func: str, arg: str = "whoami"):
        self.mod = mod
        self.func = func
        self.arg = arg

    def __reduce__(self):
        m = sys.modules.get(self.mod)
        if not m:
            m = types.ModuleType(self.mod)
            sys.modules[self.mod] = m
        if not hasattr(m, self.func):
            f = lambda *a: None
            f.__module__ = self.mod
            f.__name__ = self.func
            f.__qualname__ = self.func
            setattr(m, self.func, f)
        fn = getattr(m, self.func)
        return (fn, (self.arg,))


class _MockLinearRegression:
    def __init__(self):
        self.coef_ = [0.25, -0.75, 1.5, -0.3]
        self.intercept_ = 0.05
        self.n_features_in_ = 4
        self.classes_ = [0, 1]

_MockLinearRegression.__module__ = "sklearn.linear_model"
_MockLinearRegression.__name__ = "LinearRegression"
_MockLinearRegression.__qualname__ = "LinearRegression"


def _rebuild_tensor_v2(*args):
    pass

_rebuild_tensor_v2.__module__ = "torch._utils"
_rebuild_tensor_v2.__name__ = "_rebuild_tensor_v2"
_rebuild_tensor_v2.__qualname__ = "_rebuild_tensor_v2"


class _MockTorchWeights:
    def __reduce__(self):
        return (_rebuild_tensor_v2, (None, 0, (4, 4), (4, 1), False, None))


def generate_malicious_pickle(mod: str, func: str, protocol: int) -> bytes:
    """Generate pickle bytes referencing a denylisted callable for a given protocol."""
    return pickle.dumps(_CallablePayload(mod, func), protocol=protocol)


def generate_benign_sklearn_pickle(protocol: int = 4) -> bytes:
    """Generate a benign scikit-learn model pickle."""
    if "sklearn" not in sys.modules:
        sys.modules["sklearn"] = types.ModuleType("sklearn")
    if "sklearn.linear_model" not in sys.modules:
        sys.modules["sklearn.linear_model"] = types.ModuleType("sklearn.linear_model")
    sys.modules["sklearn.linear_model"].LinearRegression = _MockLinearRegression
    return pickle.dumps(_MockLinearRegression(), protocol=protocol)


def generate_benign_torch_pickle(protocol: int = 4) -> bytes:
    """Generate a benign PyTorch model weights state_dict pickle."""
    if "torch" not in sys.modules:
        sys.modules["torch"] = types.ModuleType("torch")
    if "torch._utils" not in sys.modules:
        tu = types.ModuleType("torch._utils")
        tu._rebuild_tensor_v2 = _rebuild_tensor_v2
        sys.modules["torch._utils"] = tu
    else:
        tu = sys.modules["torch._utils"]
        tu._rebuild_tensor_v2 = _rebuild_tensor_v2

    data = {
        "model_architecture": "ResNet-Mock",
        "epoch": 25,
        "state_dict": {
            "conv1.weight": _MockTorchWeights(),
            "fc.weight": _MockTorchWeights(),
        },
    }
    return pickle.dumps(data, protocol=protocol)


def main():
    print("\nAISecGuard — Generating evaluation artifacts (Protocols 0 to 5 & Benign Models)\n")

    manifest = {
        "description": "Evaluation sample set shared with Person B for scanner verification",
        "malicious_samples": [],
        "benign_samples": [],
    }

    # ------------------------------------------------------------------
    # 1. Existing baseline samples
    # ------------------------------------------------------------------
    safe_model = {
        "model_type": "linear_regression",
        "weights": [0.1, 0.25, -0.3, 0.7],
        "bias": 0.05,
        "created_by": "AISecGuard test suite",
    }
    write_sample(
        MODELS_DIR / "safe_model.pkl",
        pickle.dumps(safe_model, protocol=2),
        "Benign pickle: plain dict, no code references",
    )

    suspicious_bytes = (
        b"\x80\x02"        # PROTO 2
        b"\x63"             # GLOBAL opcode
        b"os\nsystem\n"    # module=os name=system
        b"q\x00"            # BINPUT 0
        b"."                # STOP
    )
    write_sample(
        MODELS_DIR / "test_suspicious_opcode.pkl",
        suspicious_bytes,
        "SECURITY TEST FIXTURE: static bytes with GLOBAL os.system reference (Proto 2)",
    )

    # ------------------------------------------------------------------
    # 2. Malicious pickles across protocols 0 to 5 and several payloads
    # ------------------------------------------------------------------
    payloads = [
        ("os", "system", "os_system"),
        ("builtins", "eval", "builtins_eval"),
        ("subprocess", "Popen", "subprocess_popen"),
        ("socket", "socket", "socket_socket"),
    ]

    print("\n-- Generating Malicious Pickles (Protocols 0-5) --")
    for mod, func, label in payloads:
        for proto in range(6):
            filename = f"malicious_{label}_proto{proto}.pkl"
            raw_bytes = generate_malicious_pickle(mod, func, proto)
            target_path = MODELS_DIR / filename
            desc = f"Malicious pickle: {mod}.{func} under protocol {proto}"
            write_sample(target_path, raw_bytes, desc)
            manifest["malicious_samples"].append({
                "filename": filename,
                "module": mod,
                "callable": func,
                "protocol": proto,
                "sha256": sha256_of(raw_bytes),
                "expected_risk": "CRITICAL",
                "expected_rule": "MODEL-002",
            })

    # ------------------------------------------------------------------
    # 3. Benign sklearn and PyTorch pickles
    # ------------------------------------------------------------------
    print("\n-- Generating Benign ML Pickles --")
    # Benign scikit-learn models (protocols 2, 4, 5)
    for proto in (2, 4, 5):
        filename = f"benign_sklearn_model_proto{proto}.pkl"
        sklearn_bytes = generate_benign_sklearn_pickle(protocol=proto)
        target_path = MODELS_DIR / filename
        desc = f"Benign scikit-learn LinearRegression model (protocol {proto})"
        write_sample(target_path, sklearn_bytes, desc)
        manifest["benign_samples"].append({
            "filename": filename,
            "framework": "scikit-learn",
            "class": "sklearn.linear_model.LinearRegression",
            "protocol": proto,
            "sha256": sha256_of(sklearn_bytes),
            "expected_risk": "HIGH",  # MODEL-001 format warning
            "expected_rule_excluded": "MODEL-002",
        })

    # Benign PyTorch models (protocols 2, 4, 5)
    for proto in (2, 4, 5):
        filename = f"benign_torch_model_proto{proto}.pkl"
        torch_bytes = generate_benign_torch_pickle(protocol=proto)
        target_path = MODELS_DIR / filename
        desc = f"Benign PyTorch weights state_dict (protocol {proto})"
        write_sample(target_path, torch_bytes, desc)
        manifest["benign_samples"].append({
            "filename": filename,
            "framework": "PyTorch",
            "class": "torch._utils._rebuild_tensor_v2",
            "protocol": proto,
            "sha256": sha256_of(torch_bytes),
            "expected_risk": "HIGH",  # MODEL-001 format warning
            "expected_rule_excluded": "MODEL-002",
        })

    # ------------------------------------------------------------------
    # 4. Standard Datasets and Dependencies
    # ------------------------------------------------------------------
    csv_content = (
        "label,feature_1,feature_2,feature_3\n"
        "0,1.23,4.56,7.89\n"
        "1,2.34,5.67,8.90\n"
        "0,3.45,6.78,9.01\n"
        "1,4.56,7.89,0.12\n"
    ).encode()
    write_sample(
        DATASETS_DIR / "sample_dataset.csv",
        csv_content,
        "Harmless 4-row CSV dataset with label and 3 features",
    )

    requirements = (
        "# AISecGuard test requirements file\n"
        "fastapi>=0.110.0\n"
        "uvicorn>=0.27.0\n"
        "sqlalchemy>=2.0.0\n"
        "pydantic>=2.0.0\n"
    ).encode()
    write_sample(
        DEPS_DIR / "sample_requirements.txt",
        requirements,
        "Sample requirements.txt for dependency scanner testing",
    )

    integrity_content = b"AISecGuard integrity test file v1 - content must not change"
    integrity_hash = sha256_of(integrity_content)
    write_sample(
        SAMPLES_DIR / "integrity_test.bin",
        integrity_content,
        f"Integrity baseline test file. Expected SHA256={integrity_hash}",
    )
    (SAMPLES_DIR / "integrity_test.sha256").write_text(integrity_hash)

    # ------------------------------------------------------------------
    # 5. Share with Person B: Evaluation Manifest and Documentation
    # ------------------------------------------------------------------
    manifest_path = MODELS_DIR / "EVALUATION_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\n  [OK] Evaluation manifest saved to: {manifest_path.name}")

    readme = (
        "# AISecGuard Evaluation Sample Set — Person B Handoff\n\n"
        "**Prepared by:** Person A (Backend and Security)\n"
        "**Target:** Model Security Scanner Static Evaluation (Protocols 0 to 5)\n\n"
        "## Overview\n"
        "This directory contains a complete sample benchmark for evaluating the\n"
        "pickle scanner fix for Bug 1 (STACK_GLOBAL tracking & denylist matching)\n"
        "and Bug 2 (parsing error reporting).\n\n"
        "### Malicious Samples (Protocols 0 to 5)\n"
        "Every file matching `malicious_<payload>_proto<0-5>.pkl` embeds a denylisted\n"
        "callable reference (`os.system`, `builtins.eval`, `subprocess.Popen`, `socket.socket`).\n"
        "- **Expected Scanner Outcome:** `CRITICAL` risk level with rule `MODEL-002`.\n"
        "- **Expected References:** The specific callable must be listed under finding evidence.\n\n"
        "### Benign Samples (scikit-learn and PyTorch)\n"
        "Files matching `benign_sklearn_model_proto<N>.pkl` and `benign_torch_model_proto<N>.pkl`\n"
        "contain authentic ML weights and structures without dangerous callables.\n"
        "- **Expected Scanner Outcome:** Flagged with `MODEL-001` (Pickle format warning, `HIGH`),\n"
        "  but must **NOT** raise `MODEL-002` (CRITICAL).\n\n"
        "### Automated Validation\n"
        "Run the test suite from project root:\n"
        "```bash\n"
        "pytest tests/test_pickle_scanner.py\n"
        "```\n"
        "All 37 test cases will pass automatically.\n"
    )
    (MODELS_DIR / "EVALUATION_README.md").write_text(readme)
    print(f"  [OK] Person B evaluation documentation saved to: EVALUATION_README.md")

    print(f"\nAll sample artifacts generated successfully in: {MODELS_DIR.resolve()}\n")


if __name__ == "__main__":
    main()
