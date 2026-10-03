"""
AISecGuard — Model Security Scanner (Static Analysis Only)
Week 4: Modular scanner implementation following section 10 architecture.

=============================================================================
CRITICAL SAFETY RULES:
  - This scanner NEVER loads, executes, or deserializes model files.
  - All analysis is performed via static byte inspection only.
  - pickle.load(), eval(), exec() are NEVER called on untrusted data.
=============================================================================
"""

from __future__ import annotations

import io
import hashlib
import pickletools
from dataclasses import dataclass, field
from pathlib import Path

from app.models.enums import FindingType, FindingSeverity
from .rules import (
    RULE_PICKLE_FORMAT,
    RULE_PICKLE_SUSPICIOUS_REF,
    RULE_PYTORCH_FORMAT,
    RULE_HDF5_FORMAT,
    RULE_ONNX_FORMAT,
    RULE_SAFETENSORS_FORMAT,
    RULE_BINARY_FORMAT,
    RULE_UNSUPPORTED_FORMAT,
    RULE_SUSPICIOUS_STRING,
    RULE_LARGE_FILE,
    RULE_SCAN_ERROR,
    SUSPICIOUS_REFERENCES,
    SUSPICIOUS_STRINGS,
)

_LARGE_FILE_THRESHOLD_BYTES = 500 * 1024 * 1024


@dataclass
class ModelFinding:
    """A single finding produced by the model scanner."""
    rule_id: str
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
    sha256: str
    format_identified: str
    findings: list[ModelFinding] = field(default_factory=list)
    suspicious_refs_found: list[str] = field(default_factory=list)
    suspicious_strings_found: list[str] = field(default_factory=list)
    pickle_opcodes_found: bool = False
    scan_error: str | None = None


def _inspect_pickle_bytes(data: bytes) -> tuple[list[str], list[str]]:
    """Static opcode walk with pickletools.genops — read only, never executes."""
    suspicious: list[str] = []
    opcodes: list[str] = []
    try:
        stream = io.BytesIO(data)
        for opcode, arg, pos in pickletools.genops(stream):
            opcodes.append(opcode.name)
            if opcode.name in ("GLOBAL", "STACK_GLOBAL", "INST"):
                arg_str = str(arg) if arg is not None else ""
                for ref in SUSPICIOUS_REFERENCES:
                    if ref in arg_str:
                        if arg_str not in suspicious:
                            suspicious.append(arg_str)
    except Exception:
        pass
    return suspicious, opcodes


def _extract_suspicious_strings(data: bytes) -> list[str]:
    """Scan byte patterns for suspicious function/command invocations."""
    return [
        p.decode("utf-8", errors="replace")
        for p in SUSPICIOUS_STRINGS
        if p in data
    ]


def scan_model_file(file_path: Path | str) -> ModelScanResult:
    """
    Perform safe, static analysis of a model artifact.
    NEVER deserializes or executes code.
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if not path.exists():
        return ModelScanResult(
            file_extension=ext,
            file_size=0,
            sha256="",
            format_identified="UNKNOWN",
            scan_error=f"File not found: {path}",
            findings=[
                ModelFinding(
                    rule_id=RULE_SCAN_ERROR.rule_id,
                    finding_type=RULE_SCAN_ERROR.finding_type,
                    severity=RULE_SCAN_ERROR.severity,
                    title="Model file not found",
                    description=f"File does not exist: {path}",
                    recommendation=RULE_SCAN_ERROR.recommendation,
                )
            ],
        )

    file_size = path.stat().st_size

    # Calculate SHA-256
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    sha256_hash = hasher.hexdigest()

    result = ModelScanResult(
        file_extension=ext,
        file_size=file_size,
        sha256=sha256_hash,
        format_identified="UNKNOWN",
    )

    if file_size > _LARGE_FILE_THRESHOLD_BYTES:
        result.findings.append(ModelFinding(
            rule_id=RULE_LARGE_FILE.rule_id,
            finding_type=RULE_LARGE_FILE.finding_type,
            severity=RULE_LARGE_FILE.severity,
            title=RULE_LARGE_FILE.title,
            description=f"File size {file_size / (1024*1024):.1f} MB exceeds 500 MB threshold.",
            evidence=f"File size: {file_size} bytes",
            recommendation=RULE_LARGE_FILE.recommendation,
        ))

    try:
        # Read header or sample for static analysis (up to 10MB)
        with open(path, "rb") as f:
            header_sample = f.read(min(file_size, 10 * 1024 * 1024))

        # Check for suspicious embedded strings
        susp_strings = _extract_suspicious_strings(header_sample)
        result.suspicious_strings_found = susp_strings
        if susp_strings:
            result.findings.append(ModelFinding(
                rule_id=RULE_SUSPICIOUS_STRING.rule_id,
                finding_type=RULE_SUSPICIOUS_STRING.finding_type,
                severity=RULE_SUSPICIOUS_STRING.severity,
                title=RULE_SUSPICIOUS_STRING.title,
                description=RULE_SUSPICIOUS_STRING.description,
                evidence=f"Patterns detected: {', '.join(susp_strings)}",
                recommendation=RULE_SUSPICIOUS_STRING.recommendation,
            ))

        if ext in (".pkl", ".pickle", ".joblib"):
            result.format_identified = "PICKLE" if ext != ".joblib" else "JOBLIB"
            result.findings.append(ModelFinding(
                rule_id=RULE_PICKLE_FORMAT.rule_id,
                finding_type=RULE_PICKLE_FORMAT.finding_type,
                severity=RULE_PICKLE_FORMAT.severity,
                title=RULE_PICKLE_FORMAT.title,
                description=RULE_PICKLE_FORMAT.description,
                evidence=f"Extension: {ext}",
                recommendation=RULE_PICKLE_FORMAT.recommendation,
            ))
            suspicious_refs, opcodes = _inspect_pickle_bytes(header_sample)
            result.pickle_opcodes_found = len(opcodes) > 0
            result.suspicious_refs_found = suspicious_refs
            if suspicious_refs:
                result.findings.append(ModelFinding(
                    rule_id=RULE_PICKLE_SUSPICIOUS_REF.rule_id,
                    finding_type=RULE_PICKLE_SUSPICIOUS_REF.finding_type,
                    severity=RULE_PICKLE_SUSPICIOUS_REF.severity,
                    title=RULE_PICKLE_SUSPICIOUS_REF.title,
                    description=RULE_PICKLE_SUSPICIOUS_REF.description,
                    evidence=f"Suspicious references: {', '.join(suspicious_refs)}",
                    recommendation=RULE_PICKLE_SUSPICIOUS_REF.recommendation,
                ))

        elif ext in (".pt", ".pth"):
            is_zip = header_sample[:4] == b"PK\x03\x04"
            result.format_identified = "PYTORCH_ZIP" if is_zip else "PYTORCH_LEGACY"
            result.findings.append(ModelFinding(
                rule_id=RULE_PYTORCH_FORMAT.rule_id,
                finding_type=RULE_PYTORCH_FORMAT.finding_type,
                severity=RULE_PYTORCH_FORMAT.severity,
                title=RULE_PYTORCH_FORMAT.title,
                description=RULE_PYTORCH_FORMAT.description,
                evidence=f"Format identified: {result.format_identified}",
                recommendation=RULE_PYTORCH_FORMAT.recommendation,
            ))

        elif ext == ".h5":
            HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"
            if header_sample[:8] == HDF5_MAGIC:
                result.format_identified = "HDF5_KERAS"
                result.findings.append(ModelFinding(
                    rule_id=RULE_HDF5_FORMAT.rule_id,
                    finding_type=RULE_HDF5_FORMAT.finding_type,
                    severity=RULE_HDF5_FORMAT.severity,
                    title=RULE_HDF5_FORMAT.title,
                    description=RULE_HDF5_FORMAT.description,
                    evidence="HDF5 magic bytes match.",
                    recommendation=RULE_HDF5_FORMAT.recommendation,
                ))
            else:
                result.format_identified = "HDF5_UNVERIFIED"
                result.findings.append(ModelFinding(
                    rule_id="MODEL-004",
                    finding_type=FindingType.UNKNOWN_FORMAT,
                    severity=FindingSeverity.LOW,
                    title=".h5 file does not match HDF5 magic signature",
                    description="File has .h5 extension but header does not match HDF5 signature.",
                    evidence=f"Header: {header_sample[:8].hex()}",
                    recommendation="Verify the file is a valid HDF5 container.",
                ))

        elif ext == ".onnx":
            result.format_identified = "ONNX"
            result.findings.append(ModelFinding(
                rule_id=RULE_ONNX_FORMAT.rule_id,
                finding_type=RULE_ONNX_FORMAT.finding_type,
                severity=RULE_ONNX_FORMAT.severity,
                title=RULE_ONNX_FORMAT.title,
                description=RULE_ONNX_FORMAT.description,
                evidence="ONNX format.",
                recommendation=RULE_ONNX_FORMAT.recommendation,
            ))

        elif ext == ".safetensors":
            result.format_identified = "SAFETENSORS"
            result.findings.append(ModelFinding(
                rule_id=RULE_SAFETENSORS_FORMAT.rule_id,
                finding_type=RULE_SAFETENSORS_FORMAT.finding_type,
                severity=RULE_SAFETENSORS_FORMAT.severity,
                title=RULE_SAFETENSORS_FORMAT.title,
                description=RULE_SAFETENSORS_FORMAT.description,
                evidence="SafeTensors format.",
                recommendation=RULE_SAFETENSORS_FORMAT.recommendation,
            ))

        elif ext == ".bin":
            result.format_identified = "GENERIC_BINARY"
            result.findings.append(ModelFinding(
                rule_id=RULE_BINARY_FORMAT.rule_id,
                finding_type=RULE_BINARY_FORMAT.finding_type,
                severity=RULE_BINARY_FORMAT.severity,
                title=RULE_BINARY_FORMAT.title,
                description=RULE_BINARY_FORMAT.description,
                evidence="Generic .bin binary file.",
                recommendation=RULE_BINARY_FORMAT.recommendation,
            ))

        else:
            result.format_identified = "UNKNOWN"
            result.findings.append(ModelFinding(
                rule_id=RULE_UNSUPPORTED_FORMAT.rule_id,
                finding_type=RULE_UNSUPPORTED_FORMAT.finding_type,
                severity=RULE_UNSUPPORTED_FORMAT.severity,
                title=RULE_UNSUPPORTED_FORMAT.title,
                description=RULE_UNSUPPORTED_FORMAT.description,
                evidence=f"Unrecognised extension: {ext}",
                recommendation=RULE_UNSUPPORTED_FORMAT.recommendation,
            ))

    except Exception as exc:
        result.scan_error = str(exc)
        result.findings.append(ModelFinding(
            rule_id=RULE_SCAN_ERROR.rule_id,
            finding_type=RULE_SCAN_ERROR.finding_type,
            severity=RULE_SCAN_ERROR.severity,
            title=RULE_SCAN_ERROR.title,
            description=f"Error inspecting file: {str(exc)}",
            evidence=str(exc),
            recommendation=RULE_SCAN_ERROR.recommendation,
        ))

    return result
