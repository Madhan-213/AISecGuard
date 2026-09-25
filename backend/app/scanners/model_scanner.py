"""
AISecGuard — Model Security Scanner (Static Analysis Only)
Week 3: Inspects AI model files for unsafe serialization and suspicious patterns.

=============================================================================
CRITICAL SAFETY RULES:
  - This scanner NEVER loads, executes, or deserializes model files.
  - All analysis is performed via static byte inspection only.
  - pickle.load(), eval(), exec() are NEVER called on untrusted data.
=============================================================================

Supported formats:
  .pkl / .pickle / .joblib — Pickle opcode inspection
  .pt / .pth              — PyTorch format (magic number check)
  .h5                     — HDF5 format (magic number check)
  .onnx                   — ONNX protobuf (magic bytes check)
  .safetensors            — Considered safer; flagged as informational
  .bin                    — Generic binary; flagged as informational
"""

from __future__ import annotations

import pickletools
import io
import struct
from dataclasses import dataclass, field
from pathlib import Path

from app.models.enums import FindingType, FindingSeverity


# ---------------------------------------------------------------------------
# Suspicious module/callable references found in pickle opcodes
# These indicate the pickle file references OS-level or code-execution modules
# ---------------------------------------------------------------------------
SUSPICIOUS_REFERENCES = {
    # Code execution
    "os", "subprocess", "sys", "shutil", "ctypes", "pty",
    # Eval/exec patterns
    "eval", "exec", "__import__", "compile",
    # Network
    "socket", "urllib", "requests", "http",
    # Builtins that can run code
    "builtins.eval", "builtins.exec",
    # Common exploit patterns
    "Popen", "system", "call", "check_output", "spawn",
}


@dataclass
class ModelFinding:
    """A single finding produced by the model scanner."""
    finding_type: FindingType
    severity: FindingSeverity
    title: str
    description: str
    evidence: str | None = None
    recommendation: str | None = None


@dataclass
class ModelScanResult:
    """Result returned by the model scanner."""
    file_extension: str
    file_size: int
    format_identified: str
    findings: list[ModelFinding] = field(default_factory=list)
    suspicious_refs_found: list[str] = field(default_factory=list)
    pickle_opcodes_found: bool = False
    scan_error: str | None = None


# ---------------------------------------------------------------------------
# Pickle inspection (static byte/opcode analysis only — NO deserialization)
# ---------------------------------------------------------------------------

def _inspect_pickle_bytes(data: bytes) -> tuple[list[str], list[str]]:
    """
    Inspect raw pickle bytes using pickletools.genops (read-only opcode walk).

    Returns:
        (suspicious_refs, opcode_names)
          - suspicious_refs: module/callable names that match SUSPICIOUS_REFERENCES
          - opcode_names: all opcode names encountered
    """
    suspicious: list[str] = []
    opcodes: list[str] = []

    try:
        stream = io.BytesIO(data)
        for opcode, arg, pos in pickletools.genops(stream):
            opcodes.append(opcode.name)
            # GLOBAL opcodes carry "module name" as argument
            if opcode.name in ("GLOBAL", "STACK_GLOBAL", "INST"):
                arg_str = str(arg) if arg is not None else ""
                for ref in SUSPICIOUS_REFERENCES:
                    if ref in arg_str:
                        if arg_str not in suspicious:
                            suspicious.append(arg_str)
    except Exception:
        # Malformed pickle — still report pickle opcodes found
        pass

    return suspicious, opcodes


def _check_magic_bytes(data: bytes, magic: bytes) -> bool:
    return data[:len(magic)] == magic


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_model_file(storage_path: str | Path) -> ModelScanResult:
    """
    Perform static analysis on an AI model file.

    This function reads the file bytes and performs byte-level inspection.
    It does NOT load, execute, or deserialize any content.

    Args:
        storage_path: Path to the stored artifact file.

    Returns:
        ModelScanResult with all findings.
    """
    storage_path = Path(storage_path)
    ext = storage_path.suffix.lower()
    file_size = storage_path.stat().st_size

    try:
        # Read a limited prefix for magic byte checks (first 64 KiB)
        # Full file only needed for pickle opcode walk
        with open(storage_path, "rb") as f:
            header = f.read(65536)
            f.seek(0)
            full_data = f.read()
    except OSError as e:
        return ModelScanResult(
            file_extension=ext,
            file_size=file_size,
            format_identified="UNREADABLE",
            scan_error=str(e),
        )

    result = ModelScanResult(
        file_extension=ext,
        file_size=file_size,
        format_identified="UNKNOWN",
    )

    # ------------------------------------------------------------------
    # Route to format-specific inspector
    # ------------------------------------------------------------------

    if ext in (".pkl", ".pickle", ".joblib"):
        _scan_pickle_format(result, full_data, ext)

    elif ext in (".pt", ".pth"):
        _scan_pytorch_format(result, header)

    elif ext == ".h5":
        _scan_hdf5_format(result, header)

    elif ext == ".onnx":
        _scan_onnx_format(result, header)

    elif ext == ".safetensors":
        result.format_identified = "SAFETENSORS"
        result.findings.append(ModelFinding(
            finding_type=FindingType.OTHER,
            severity=FindingSeverity.INFORMATIONAL,
            title="SafeTensors format detected",
            description=(
                "The artifact uses the SafeTensors serialization format, which is "
                "designed to be safe and does not support arbitrary code execution "
                "during deserialization."
            ),
            recommendation="SafeTensors is a recommended format. No action required.",
        ))

    elif ext == ".bin":
        result.format_identified = "GENERIC_BINARY"
        result.findings.append(ModelFinding(
            finding_type=FindingType.UNKNOWN_FORMAT,
            severity=FindingSeverity.INFORMATIONAL,
            title="Generic binary format",
            description=(
                "The file uses a .bin extension with no recognised format signature. "
                "This may be a Hugging Face model shard or another binary format."
            ),
            recommendation=(
                "Verify the artifact source and format. Consider converting to a "
                "well-defined format such as SafeTensors or ONNX."
            ),
        ))

    else:
        result.format_identified = "UNSUPPORTED_EXTENSION"
        result.findings.append(ModelFinding(
            finding_type=FindingType.UNKNOWN_FORMAT,
            severity=FindingSeverity.INFORMATIONAL,
            title=f"File extension {ext!r} is not a recognised model format",
            description=(
                "The submitted file does not have a recognised AI model file extension. "
                "It may still be a valid model in an unsupported format."
            ),
        ))

    return result


def _scan_pickle_format(
    result: ModelScanResult, data: bytes, ext: str
) -> None:
    """Inspect a pickle/joblib file for unsafe serialization patterns."""
    result.format_identified = "PICKLE" if ext in (".pkl", ".pickle") else "JOBLIB"

    # Unsafe serialization finding — always present for pickle/joblib
    result.findings.append(ModelFinding(
        finding_type=FindingType.UNSAFE_SERIALIZATION,
        severity=FindingSeverity.HIGH,
        title="Pickle-based serialization detected",
        description=(
            "The uploaded model uses a pickle-based serialization format (.pkl/.pickle/.joblib). "
            "Pickle can execute arbitrary Python code during deserialization. "
            "A malicious actor could craft a pickle file that runs OS commands "
            "or downloads malware when loaded."
        ),
        evidence=f"File extension: {ext}",
        recommendation=(
            "Prefer safer serialization formats such as SafeTensors or ONNX where possible. "
            "Only load pickle files from fully trusted sources in isolated environments."
        ),
    ))

    # Opcode walk — static only, no deserialization
    suspicious_refs, opcodes = _inspect_pickle_bytes(data)
    result.pickle_opcodes_found = len(opcodes) > 0
    result.suspicious_refs_found = suspicious_refs

    if suspicious_refs:
        evidence_text = "\n".join(f"  - {ref}" for ref in suspicious_refs)
        result.findings.append(ModelFinding(
            finding_type=FindingType.SUSPICIOUS_REFERENCE,
            severity=FindingSeverity.CRITICAL,
            title="Suspicious module/callable references found in pickle opcodes",
            description=(
                "Static inspection of the pickle opcodes found references to modules "
                "or callables that are commonly used in malicious pickle payloads. "
                "These references could execute system commands or network operations "
                "when the pickle is deserialized."
            ),
            evidence=f"Suspicious GLOBAL references found:\n{evidence_text}",
            recommendation=(
                "DO NOT deserialize this artifact in a production or privileged environment. "
                "Investigate the artifact origin. Reject or quarantine this file."
            ),
        ))


def _scan_pytorch_format(result: ModelScanResult, header: bytes) -> None:
    """Check PyTorch file magic bytes and note serialization type."""
    # PyTorch .pt/.pth can be either pickle (legacy) or zip-based (new format)
    # ZIP magic bytes: PK\x03\x04
    is_zip = header[:4] == b"PK\x03\x04"

    if is_zip:
        result.format_identified = "PYTORCH_ZIP"
        result.findings.append(ModelFinding(
            finding_type=FindingType.UNSAFE_SERIALIZATION,
            severity=FindingSeverity.MEDIUM,
            title="PyTorch ZIP archive format detected",
            description=(
                "The file appears to be in PyTorch's zip-based format. "
                "PyTorch ZIP archives typically contain pickle data internally. "
                "While the outer format is a ZIP, the inner data.pkl can still "
                "contain arbitrary Python code."
            ),
            recommendation=(
                "Only load from trusted sources. Consider using torch.load() with "
                "weights_only=True (PyTorch 2.0+) or preferring SafeTensors format."
            ),
        ))
    else:
        result.format_identified = "PYTORCH_LEGACY"
        result.findings.append(ModelFinding(
            finding_type=FindingType.UNSAFE_SERIALIZATION,
            severity=FindingSeverity.HIGH,
            title="PyTorch legacy pickle format detected",
            description=(
                "The file appears to be in legacy PyTorch format (direct pickle serialization). "
                "This format can execute arbitrary code during loading."
            ),
            recommendation=(
                "Re-save the model using torch.save() with the default ZIP format "
                "or migrate to SafeTensors for safer distribution."
            ),
        ))


def _scan_hdf5_format(result: ModelScanResult, header: bytes) -> None:
    """Check HDF5 magic signature."""
    # HDF5 signature: \x89HDF\r\n\x1a\n
    HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"
    if _check_magic_bytes(header, HDF5_MAGIC):
        result.format_identified = "HDF5_KERAS"
        result.findings.append(ModelFinding(
            finding_type=FindingType.UNSAFE_SERIALIZATION,
            severity=FindingSeverity.MEDIUM,
            title="HDF5/Keras model format detected",
            description=(
                "The file uses HDF5 format (commonly used by Keras/TensorFlow). "
                "HDF5 model files can include lambda layers and custom objects "
                "that execute Python code during loading."
            ),
            recommendation=(
                "Ensure custom layers are verified before loading. "
                "Consider using TensorFlow SavedModel format or ONNX for safer sharing."
            ),
        ))
    else:
        result.format_identified = "HDF5_UNVERIFIED"
        result.findings.append(ModelFinding(
            finding_type=FindingType.UNKNOWN_FORMAT,
            severity=FindingSeverity.LOW,
            title=".h5 file does not match HDF5 magic signature",
            description=(
                "The file has a .h5 extension but does not start with the expected "
                "HDF5 magic bytes. It may be corrupted or mislabelled."
            ),
        ))


def _scan_onnx_format(result: ModelScanResult, header: bytes) -> None:
    """Check ONNX protobuf header."""
    result.format_identified = "ONNX"
    result.findings.append(ModelFinding(
        finding_type=FindingType.OTHER,
        severity=FindingSeverity.INFORMATIONAL,
        title="ONNX format detected",
        description=(
            "The artifact appears to be in ONNX format. ONNX is a standardised, "
            "open format that does not support arbitrary code execution during loading "
            "when using a compliant ONNX runtime."
        ),
        recommendation="ONNX is a recommended format. Verify using a compliant ONNX runtime.",
    ))
