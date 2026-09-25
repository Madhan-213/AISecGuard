"""
AISecGuard — Sample Artifacts Generator
Week 3: Creates safe, documented test artifacts for manual testing.

Run from project root:
  python samples/generate_samples.py

IMPORTANT:
  - All artifacts are benign test fixtures.
  - No malicious payloads are created.
  - The 'suspicious' sample demonstrates opcode patterns for scanner
    testing using static byte inspection only — it is never executed.
"""

import os
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


def main():
    print("\nAISecGuard — Generating safe test artifacts\n")

    # ------------------------------------------------------------------
    # 1. Harmless model artifact (benign pickle)
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

    # ------------------------------------------------------------------
    # 2. Suspicious model (static test fixture — NEVER executed)
    # ------------------------------------------------------------------
    # Raw pickle bytes with a GLOBAL reference to os.system
    # These bytes are constructed manually to avoid any actual execution.
    suspicious_bytes = (
        b"\x80\x02"        # PROTO 2
        b"\x63"             # GLOBAL opcode
        b"os\nsystem\n"    # module=os name=system
        b"q\x00"            # BINPUT 0
        b"."                # STOP — incomplete, cannot be fully deserialized
    )
    suspicious_path = MODELS_DIR / "test_suspicious_opcode.pkl"
    write_sample(
        suspicious_path,
        suspicious_bytes,
        "SECURITY TEST FIXTURE: static bytes with GLOBAL os.system reference.\n"
        "     Used to verify scanner detection. NEVER executed.",
    )
    # Write a README alongside
    readme = (
        "# test_suspicious_opcode.pkl\n\n"
        "**Security Test Fixture — Academic Use Only**\n\n"
        "This file contains raw pickle bytes with a GLOBAL opcode referencing `os.system`.\n"
        "It is used by the AISecGuard model scanner test suite to verify that the scanner\n"
        "detects suspicious module references.\n\n"
        "**This file is intentionally incomplete and cannot be deserialized.**\n"
        "It exists purely for static byte-level analysis testing.\n"
    )
    (MODELS_DIR / "test_suspicious_opcode_README.md").write_text(readme)

    # ------------------------------------------------------------------
    # 3. Harmless dataset
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

    # ------------------------------------------------------------------
    # 4. Safe dependency file
    # ------------------------------------------------------------------
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

    # ------------------------------------------------------------------
    # 5. Integrity test file (hash stored for comparison tests)
    # ------------------------------------------------------------------
    integrity_content = b"AISecGuard integrity test file v1 - content must not change"
    integrity_hash = sha256_of(integrity_content)
    write_sample(
        SAMPLES_DIR / "integrity_test.bin",
        integrity_content,
        f"Integrity baseline test file. Expected SHA256={integrity_hash}",
    )
    # Write expected hash to a companion file
    (SAMPLES_DIR / "integrity_test.sha256").write_text(integrity_hash)

    print("\nAll sample artifacts generated successfully.\n")
    print(f"   Location: {SAMPLES_DIR.resolve()}")


if __name__ == "__main__":
    main()
