"""
AISecGuard — Model Security Scanner (Static Analysis Only)
Week 5: Enhanced — adds SafeTensors header struct inspection, ONNX graph node analysis,
         improved metadata checking, and explicit unsupported-format reporting.

=============================================================================
CRITICAL SAFETY RULES:
  - This scanner NEVER loads, executes, or deserializes model files.
  - All analysis is performed via static byte inspection only.
  - pickle.load(), eval(), exec() are NEVER called on untrusted data.
  - torch.load() is NEVER called on untrusted uploads.
  - No objects from uploaded files are ever instantiated.
=============================================================================

Supported formats (static inspection):
  .pkl / .pickle / .joblib — Pickle opcode inspection (read-only)
  .pt / .pth              — PyTorch format (magic number + ZIP check)
  .h5                     — HDF5 format (magic signature check)
  .onnx                   — ONNX protobuf (graph node count from raw bytes)
  .safetensors            — SafeTensors header struct inspection (no deserialization)
  .bin                    — Generic binary; flagged as informational

ANALYSIS LIMITATIONS:
  - Static byte inspection cannot guarantee detection of all malicious payloads.
  - A clean scan does not certify an artifact is safe.
  - Findings are indicators; all results must be reviewed by a qualified analyst.
"""

from __future__ import annotations

import pickletools
import io
import struct
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

from app.models.enums import ArtifactType, FindingType, FindingSeverity
from app.scanners.base import Finding, Scanner


# ---------------------------------------------------------------------------
# Suspicious module/callable references found in pickle opcodes (Denylist)
# ---------------------------------------------------------------------------
DANGEROUS_CALLABLES: set[tuple[str, str]] = {
    # os.system and OS-level platform equivalents
    ("os", "system"),
    ("nt", "system"),
    ("posix", "system"),
    # builtins.eval and builtins.exec (including Python 2 names)
    ("builtins", "eval"),
    ("__builtin__", "eval"),
    ("builtins", "exec"),
    ("__builtin__", "exec"),
    # subprocess.Popen (including Python 2 commands)
    ("subprocess", "Popen"),
    ("commands", "Popen"),
    ("subprocess", "call"),
    ("subprocess", "check_output"),
    ("subprocess", "run"),
    # socket.socket
    ("socket", "socket"),
    # Additional critical command execution callables
    ("os", "popen"),
    ("nt", "popen"),
    ("posix", "popen"),
    ("os", "spawn"),
    ("pty", "spawn"),
    ("builtins", "__import__"),
    ("__builtin__", "__import__"),
}

SUSPICIOUS_REFERENCES = {f"{m}.{n}" for m, n in DANGEROUS_CALLABLES} | {m for m, _ in DANGEROUS_CALLABLES}

# Suspicious byte strings to scan for in binary model files
_SUSPICIOUS_STRINGS = [
    b"import os", b"import subprocess", b"import sys",
    b"exec(", b"eval(", b"__import__(",
    b"os.system", b"subprocess.Popen", b"socket.connect",
    b"urllib.request", b"requests.get", b"/bin/sh", b"cmd.exe",
    b"base64.b64decode",
]

# Large file threshold: 500 MB
_LARGE_FILE_THRESHOLD_BYTES = 500 * 1024 * 1024

# HDF5 magic signature
_HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"

# ONNX protobuf field numbers (from ONNX spec)
_ONNX_IR_VERSION_FIELD = 1
_ONNX_OPSET_IMPORT_FIELD = 8
_ONNX_GRAPH_FIELD = 7

# SafeTensors: max header size to read (8 bytes length prefix + up to 100MB header)
_SAFETENSORS_MAX_HEADER_READ = 100 * 1024 * 1024 + 8


# Kept as an alias so existing callers keep working.
ModelFinding = Finding


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
    metadata: dict = field(default_factory=dict)
    scan_error: str | None = None


# ---------------------------------------------------------------------------
# Pickle inspection (static byte/opcode analysis only — NO deserialization)
# ---------------------------------------------------------------------------

def _inspect_pickle_bytes(data: bytes) -> tuple[list[str], list[str], str | None]:
    """
    Inspect raw pickle bytes using pickletools.genops (read-only opcode walk).
    Tracks pushed strings (SHORT_BINUNICODE, etc.) and memoization (MEMOIZE, etc.)
    to resolve STACK_GLOBAL, and matches exact (module, name) pairs against the denylist.

    Returns:
        (suspicious_refs, opcode_names, parse_error)
    """
    suspicious: list[str] = []
    opcodes: list[str] = []
    parse_error: str | None = None
    stack: list[str] = []
    memo: dict[int, str] = {}

    try:
        stream = io.BytesIO(data)
        for opcode, arg, pos in pickletools.genops(stream):
            opcodes.append(opcode.name)

            if opcode.name in ("SHORT_BINUNICODE", "BINUNICODE", "UNICODE", "STRING", "BINUNICODE8"):
                stack.append(str(arg) if arg is not None else "")
            elif opcode.name in ("SHORT_BINBYTES", "BINBYTES", "BINBYTES8"):
                val = arg.decode("utf-8", errors="replace") if isinstance(arg, bytes) else str(arg)
                stack.append(val)
            elif opcode.name == "MEMOIZE":
                if stack:
                    memo[len(memo)] = stack[-1]
            elif opcode.name in ("PUT", "BINPUT", "LONG_BINPUT"):
                if stack and arg is not None:
                    memo[arg] = stack[-1]
            elif opcode.name in ("GET", "BINGET", "LONG_BINGET"):
                if arg in memo:
                    stack.append(memo[arg])
            elif opcode.name == "POP":
                if stack:
                    stack.pop()
            elif opcode.name == "DUP":
                if stack:
                    stack.append(stack[-1])
            elif opcode.name == "STACK_GLOBAL":
                if len(stack) >= 2:
                    name = str(stack.pop())
                    module = str(stack.pop())
                    if (module, name) in DANGEROUS_CALLABLES:
                        ref = f"{module}.{name}"
                        if ref not in suspicious:
                            suspicious.append(ref)
                    stack.append(f"{module}.{name}")
            elif opcode.name in ("GLOBAL", "INST"):
                arg_str = str(arg) if arg is not None else ""
                parts = arg_str.split()
                if len(parts) == 2:
                    module, name = parts[0], parts[1]
                    if (module, name) in DANGEROUS_CALLABLES:
                        ref = f"{module}.{name}"
                        if ref not in suspicious:
                            suspicious.append(ref)
                    stack.append(f"{module}.{name}")
    except Exception as exc:
        parse_error = str(exc)

    return suspicious, opcodes, parse_error


def _check_magic_bytes(data: bytes, magic: bytes) -> bool:
    return data[:len(magic)] == magic


def _extract_suspicious_strings(data: bytes) -> list[str]:
    """Static byte scan for suspicious string patterns — no code execution."""
    return [
        p.decode("utf-8", errors="replace")
        for p in _SUSPICIOUS_STRINGS
        if p in data
    ]


# ---------------------------------------------------------------------------
# Format-specific scanners
# ---------------------------------------------------------------------------

def _scan_pickle_format(
    result: ModelScanResult, data: bytes, ext: str
) -> None:
    """Inspect a pickle/joblib file for unsafe serialization patterns."""
    result.format_identified = "PICKLE" if ext in (".pkl", ".pickle") else "JOBLIB"

    result.findings.append(ModelFinding(
        rule_id="MODEL-001",
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

    suspicious_refs, opcodes, parse_error = _inspect_pickle_bytes(data)
    result.pickle_opcodes_found = len(opcodes) > 0
    result.suspicious_refs_found = suspicious_refs

    if parse_error:
        result.scan_error = parse_error
        result.findings.append(ModelFinding(
            rule_id="MODEL-011",
            finding_type=FindingType.OTHER,
            severity=FindingSeverity.MEDIUM,
            title="Scanner error inspecting model file",
            description=f"Static inspection of pickle opcodes failed: {parse_error}",
            evidence=f"Parsing error: {parse_error}",
            recommendation="Verify the file is not corrupted, truncated, or obfuscated.",
        ))

    if suspicious_refs:
        evidence_text = "\n".join(f"  - {ref}" for ref in suspicious_refs)
        result.findings.append(ModelFinding(
            rule_id="MODEL-002",
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
    is_zip = header[:4] == b"PK\x03\x04"

    if is_zip:
        result.format_identified = "PYTORCH_ZIP"
        result.findings.append(ModelFinding(
            rule_id="MODEL-003",
            finding_type=FindingType.UNSAFE_SERIALIZATION,
            severity=FindingSeverity.MEDIUM,
            title="PyTorch ZIP archive format detected",
            description=(
                "The file appears to be in PyTorch's zip-based format. "
                "PyTorch ZIP archives typically contain pickle data internally. "
                "While the outer format is a ZIP, the inner data.pkl can still "
                "contain arbitrary Python code."
            ),
            evidence="File starts with ZIP magic bytes (PK\\x03\\x04)",
            recommendation=(
                "Only load from trusted sources. Consider using torch.load() with "
                "weights_only=True (PyTorch 2.0+) or preferring SafeTensors format."
            ),
        ))
    else:
        result.format_identified = "PYTORCH_LEGACY"
        result.findings.append(ModelFinding(
            rule_id="MODEL-003",
            finding_type=FindingType.UNSAFE_SERIALIZATION,
            severity=FindingSeverity.HIGH,
            title="PyTorch legacy pickle format detected",
            description=(
                "The file appears to be in legacy PyTorch format (direct pickle serialization). "
                "This format can execute arbitrary code during loading."
            ),
            evidence=f"File header (hex): {header[:16].hex()}",
            recommendation=(
                "Re-save the model using torch.save() with the default ZIP format "
                "or migrate to SafeTensors for safer distribution."
            ),
        ))


def _scan_hdf5_format(result: ModelScanResult, header: bytes) -> None:
    """Check HDF5 magic signature."""
    if _check_magic_bytes(header, _HDF5_MAGIC):
        result.format_identified = "HDF5_KERAS"
        result.findings.append(ModelFinding(
            rule_id="MODEL-004",
            finding_type=FindingType.UNSAFE_SERIALIZATION,
            severity=FindingSeverity.MEDIUM,
            title="HDF5/Keras model format detected",
            description=(
                "The file uses HDF5 format (commonly used by Keras/TensorFlow). "
                "HDF5 model files can include lambda layers and custom objects "
                "that execute Python code during loading."
            ),
            evidence=f"HDF5 magic signature confirmed: {_HDF5_MAGIC.hex()}",
            recommendation=(
                "Ensure custom layers are verified before loading. "
                "Consider using TensorFlow SavedModel format or ONNX for safer sharing."
            ),
        ))
    else:
        result.format_identified = "HDF5_UNVERIFIED"
        result.findings.append(ModelFinding(
            rule_id="MODEL-004",
            finding_type=FindingType.UNKNOWN_FORMAT,
            severity=FindingSeverity.LOW,
            title=".h5 file does not match HDF5 magic signature",
            description=(
                "The file has a .h5 extension but does not start with the expected "
                "HDF5 magic bytes. It may be corrupted or mislabelled."
            ),
            evidence=f"Expected: {_HDF5_MAGIC.hex()}, Found: {header[:8].hex()}",
            recommendation="Verify the file is a valid HDF5/Keras model and is not corrupted.",
        ))


def _scan_onnx_format(result: ModelScanResult, data: bytes) -> None:
    """
    Inspect ONNX protobuf structure statically.

    ONNX files are protocol buffers. We read raw protobuf bytes to extract
    node count and opset information WITHOUT executing any model inference.
    This is purely byte-level field counting — no protobuf library required.
    """
    result.format_identified = "ONNX"

    # Count protobuf field tags as a rough heuristic for graph complexity
    # Field 7 (graph) in ModelProto, Field 1 (node) in GraphProto
    # This is approximate — we count bytes matching common ONNX protobuf patterns
    node_count_estimate = 0
    opset_info = []

    try:
        # Simple protobuf varint parser to count node-like fields
        # Field tag: field_number << 3 | wire_type
        # graph field in ModelProto: field 7, wire type 2 (LEN) → tag 0x3A
        # node field in GraphProto: field 1, wire type 2 (LEN) → tag 0x0A
        i = 0
        while i < min(len(data), 1_000_000):  # Scan first 1MB only
            if data[i] == 0x0A:  # field 1, wire_type 2 (could be node)
                node_count_estimate += 1
            i += 1
        # Divide by expected node overhead to get rough count
        # This is a rough heuristic, not exact node count
        node_count_estimate = max(0, node_count_estimate // 10)
    except Exception:
        node_count_estimate = -1

    # Build informational finding
    evidence_parts = [f"File size: {len(data):,} bytes"]
    if node_count_estimate >= 0:
        evidence_parts.append(f"Estimated graph complexity indicator: {node_count_estimate}")

    result.metadata["onnx_estimated_complexity"] = node_count_estimate

    result.findings.append(ModelFinding(
        rule_id="MODEL-010",
        finding_type=FindingType.OTHER,
        severity=FindingSeverity.INFORMATIONAL,
        title="ONNX format detected — static inspection completed",
        description=(
            "The artifact appears to be in ONNX format. ONNX is a standardised, "
            "open format that does not support arbitrary code execution during loading "
            "when using a compliant ONNX runtime. "
            "Static byte inspection was performed; no model inference was executed."
        ),
        evidence="\n".join(evidence_parts),
        recommendation=(
            "ONNX is a recommended format. Verify using a compliant ONNX runtime. "
            "Ensure the model source is trusted before deployment."
        ),
    ))

    # Warn if file is extremely large (potential obfuscation or bloating)
    if len(data) > 200 * 1024 * 1024:  # 200MB
        result.findings.append(ModelFinding(
            rule_id="MODEL-010b",
            finding_type=FindingType.LARGE_FILE_WARNING,
            severity=FindingSeverity.LOW,
            title="Unusually large ONNX file",
            description=(
                f"The ONNX file is {len(data) / (1024*1024):.1f} MB. "
                "Very large ONNX files may indicate an unusually complex model "
                "or potential data obfuscation."
            ),
            evidence=f"File size: {len(data):,} bytes",
            recommendation="Verify the file size is expected for this model architecture.",
        ))


def _scan_safetensors_format(result: ModelScanResult, data: bytes) -> None:
    """
    Inspect SafeTensors file header.

    SafeTensors format:
    - First 8 bytes: little-endian uint64 header length N
    - Next N bytes: JSON header with tensor metadata
    - Remaining bytes: raw tensor data

    SAFETY: We only read the header JSON. We do NOT load tensors.
    We do NOT deserialize Python objects. This is purely structural inspection.
    """
    result.format_identified = "SAFETENSORS"

    if len(data) < 8:
        result.findings.append(ModelFinding(
            rule_id="MODEL-006",
            finding_type=FindingType.UNKNOWN_FORMAT,
            severity=FindingSeverity.MEDIUM,
            title="SafeTensors file too small to parse header",
            description=(
                "The file has a .safetensors extension but is too small "
                "to contain a valid header. The file may be truncated or corrupted."
            ),
            evidence=f"File size: {len(data)} bytes (minimum required: 8)",
            recommendation="Verify the file is a complete, valid SafeTensors artifact.",
        ))
        return

    try:
        # Read the 8-byte little-endian header length prefix
        header_len = struct.unpack_from("<Q", data, 0)[0]

        if header_len == 0:
            result.findings.append(ModelFinding(
                rule_id="MODEL-006",
                finding_type=FindingType.STRUCTURAL_ANOMALY,
                severity=FindingSeverity.MEDIUM,
                title="SafeTensors header length is zero",
                description=(
                    "The SafeTensors header length field is 0, which indicates "
                    "a malformed or empty file."
                ),
                evidence="Header length prefix: 0",
                recommendation="Verify the file is a valid SafeTensors artifact.",
            ))
            return

        # Guard against excessively large header claims
        if header_len > 100 * 1024 * 1024:  # 100MB max header
            result.findings.append(ModelFinding(
                rule_id="MODEL-006",
                finding_type=FindingType.STRUCTURAL_ANOMALY,
                severity=FindingSeverity.HIGH,
                title="SafeTensors header length claim is suspiciously large",
                description=(
                    f"The SafeTensors header length field claims {header_len:,} bytes, "
                    "which far exceeds a reasonable metadata size. "
                    "This may indicate file corruption or a crafted file."
                ),
                evidence=f"Claimed header length: {header_len:,} bytes",
                recommendation=(
                    "Reject this file. Verify its provenance before any use."
                ),
            ))
            return

        if 8 + header_len > len(data):
            result.findings.append(ModelFinding(
                rule_id="MODEL-006",
                finding_type=FindingType.STRUCTURAL_ANOMALY,
                severity=FindingSeverity.MEDIUM,
                title="SafeTensors file truncated — header extends beyond file",
                description=(
                    f"The SafeTensors header claims {header_len:,} bytes, "
                    f"but the file is only {len(data):,} bytes total. "
                    "The file appears to be truncated."
                ),
                evidence=f"Claimed header: {header_len:,} bytes, File size: {len(data):,} bytes",
                recommendation="Obtain a complete copy of the file from the original source.",
            ))
            return

        # Parse the JSON header safely
        header_bytes = data[8:8 + header_len]
        try:
            header_json = json.loads(header_bytes.decode("utf-8", errors="replace"))
        except (json.JSONDecodeError, ValueError) as e:
            result.findings.append(ModelFinding(
                rule_id="MODEL-006",
                finding_type=FindingType.STRUCTURAL_ANOMALY,
                severity=FindingSeverity.MEDIUM,
                title="SafeTensors header JSON is invalid",
                description=(
                    "The SafeTensors header could not be parsed as valid JSON. "
                    "This may indicate file corruption."
                ),
                evidence=f"JSON parse error: {str(e)[:200]}",
                recommendation="Verify the file is not corrupted.",
            ))
            return

        # Extract tensor metadata
        tensor_names = [k for k in header_json.keys() if k != "__metadata__"]
        meta = header_json.get("__metadata__", {})

        result.metadata["safetensors_tensor_count"] = len(tensor_names)
        result.metadata["safetensors_has_metadata"] = bool(meta)
        result.metadata["safetensors_header_size"] = header_len

        # Build evidence summary (do NOT expose tensor names or values — privacy)
        evidence_lines = [
            f"Header size: {header_len:,} bytes",
            f"Tensor count: {len(tensor_names)}",
            f"Has __metadata__ section: {bool(meta)}",
        ]

        # Report informational finding with header summary
        result.findings.append(ModelFinding(
            rule_id="MODEL-006",
            finding_type=FindingType.OTHER,
            severity=FindingSeverity.INFORMATIONAL,
            title="SafeTensors format — header inspection completed",
            description=(
                "SafeTensors serialization is designed to be safe and does not "
                "support arbitrary code execution during deserialization. "
                f"The header was successfully parsed. {len(tensor_names)} tensor(s) declared."
            ),
            evidence="\n".join(evidence_lines),
            recommendation=(
                "SafeTensors is a recommended format. "
                "Verify the model source and tensor count are expected."
            ),
        ))

        # Warn if metadata contains suspicious key patterns
        if isinstance(meta, dict):
            suspicious_meta_keys = [
                k for k in meta.keys()
                if any(s in str(k).lower() for s in ["exec", "eval", "import", "cmd", "shell"])
            ]
            if suspicious_meta_keys:
                result.findings.append(ModelFinding(
                    rule_id="MODEL-006b",
                    finding_type=FindingType.SUSPICIOUS_REFERENCE,
                    severity=FindingSeverity.MEDIUM,
                    title="Suspicious key names in SafeTensors __metadata__",
                    description=(
                        "The SafeTensors __metadata__ section contains key names "
                        "that resemble code-execution patterns. "
                        "While SafeTensors cannot execute code natively, "
                        "suspicious metadata may indicate a crafted file."
                    ),
                    evidence=f"Suspicious metadata keys: {suspicious_meta_keys[:5]}",
                    recommendation=(
                        "Investigate the metadata content and verify the file provenance."
                    ),
                ))

    except (struct.error, OverflowError) as e:
        result.findings.append(ModelFinding(
            rule_id="MODEL-006",
            finding_type=FindingType.STRUCTURAL_ANOMALY,
            severity=FindingSeverity.MEDIUM,
            title="SafeTensors header could not be read",
            description=(
                "An error occurred while reading the SafeTensors header structure."
            ),
            evidence=f"Error: {str(e)[:200]}",
            recommendation="Verify the file is a valid SafeTensors artifact.",
        ))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_model_file(storage_path: str | Path) -> ModelScanResult:
    """
    Perform static analysis on an AI model file.

    SAFETY: Does NOT load, execute, or deserialize any content.

    Args:
        storage_path: Path to the stored artifact file.

    Returns:
        ModelScanResult with all findings.
    """
    storage_path = Path(storage_path)
    ext = storage_path.suffix.lower()
    file_size = storage_path.stat().st_size

    # Compute SHA-256 (chunked, memory-safe for large files)
    sha256 = "unreadable"
    try:
        h = hashlib.sha256()
        with open(storage_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        sha256 = h.hexdigest()
    except OSError:
        pass

    try:
        with open(storage_path, "rb") as f:
            header = f.read(65536)
            f.seek(0)
            full_data = f.read()
    except OSError as e:
        return ModelScanResult(
            file_extension=ext, file_size=file_size, sha256=sha256,
            format_identified="UNREADABLE", scan_error=str(e),
        )

    result = ModelScanResult(
        file_extension=ext, file_size=file_size, sha256=sha256,
        format_identified="UNKNOWN",
    )

    # Large file warning (applies to all formats)
    if file_size > _LARGE_FILE_THRESHOLD_BYTES:
        result.findings.append(ModelFinding(
            rule_id="MODEL-005",
            finding_type=FindingType.LARGE_FILE_WARNING,
            severity=FindingSeverity.LOW,
            title="Unusually large model file",
            description=(
                f"The model file is {file_size / (1024*1024):.1f} MB, "
                f"exceeding the {_LARGE_FILE_THRESHOLD_BYTES // (1024*1024)} MB threshold."
            ),
            evidence=f"File size: {file_size:,} bytes",
            recommendation="Verify the file size is expected for this model architecture.",
        ))

    # Route to format-specific inspector
    if ext in (".pkl", ".pickle", ".joblib"):
        _scan_pickle_format(result, full_data, ext)
    elif ext in (".pt", ".pth"):
        _scan_pytorch_format(result, header)
    elif ext == ".h5":
        _scan_hdf5_format(result, header)
    elif ext == ".onnx":
        _scan_onnx_format(result, full_data)
    elif ext == ".safetensors":
        _scan_safetensors_format(result, full_data)
    elif ext == ".bin":
        result.format_identified = "GENERIC_BINARY"
        result.findings.append(ModelFinding(
            rule_id="MODEL-007",
            finding_type=FindingType.UNKNOWN_FORMAT,
            severity=FindingSeverity.INFORMATIONAL,
            title="Generic binary format",
            description=(
                "The file uses a .bin extension with no recognised format signature. "
                "This may be a Hugging Face model shard or another binary format."
            ),
            evidence=f"File header (first 16 bytes hex): {full_data[:16].hex()}",
            recommendation=(
                "Verify the artifact source and format. Consider converting to a "
                "well-defined format such as SafeTensors or ONNX."
            ),
        ))
    else:
        result.format_identified = "UNSUPPORTED_EXTENSION"
        result.findings.append(ModelFinding(
            rule_id="MODEL-008",
            finding_type=FindingType.UNKNOWN_FORMAT,
            severity=FindingSeverity.INFORMATIONAL,
            title=f"File extension {ext!r} is not a recognised model format",
            description=(
                "The submitted file does not have a recognised AI model file extension. "
                "Supported extensions: .pkl, .pickle, .joblib, .pt, .pth, .h5, .onnx, "
                ".safetensors, .bin"
            ),
            evidence=f"Submitted extension: {ext!r}",
            recommendation=(
                "Submit a file in a supported format. "
                "Unsupported formats cannot be analysed for security risks."
            ),
        ))

    # Suspicious string scan for non-pickle formats
    if ext not in (".pkl", ".pickle", ".joblib"):
        suspicious_strings = _extract_suspicious_strings(full_data)
        if suspicious_strings:
            result.suspicious_strings_found = suspicious_strings
            result.findings.append(ModelFinding(
                rule_id="MODEL-009",
                finding_type=FindingType.SUSPICIOUS_REFERENCE,
                severity=FindingSeverity.HIGH,
                title="Suspicious string patterns in binary file",
                description=(
                    "Static byte inspection found patterns associated with code execution "
                    "or network access embedded in the model binary. "
                    "This is a suspicious pattern indicator — does NOT confirm malice."
                ),
                evidence="Found:\n" + "\n".join(f"  - {s!r}" for s in suspicious_strings[:10]),
                recommendation=(
                    "Investigate the file origin. A legitimate model should not "
                    "contain OS/subprocess/network string patterns."
                ),
            ))

    return result


class ModelScanner(Scanner):
    """Scanner for MODEL artifacts (.pkl, .pt, .h5, .onnx, .safetensors, .bin)."""

    artifact_type = ArtifactType.MODEL
    error_rule_id = "MODEL-000"
    name = "model scanner"

    def scan(self, path: str | Path) -> list[Finding]:
        result = scan_model_file(path)
        findings = list(result.findings)
        if result.scan_error:
            findings.append(Finding(
                rule_id=self.error_rule_id,
                finding_type=FindingType.OTHER,
                severity=FindingSeverity.MEDIUM,
                title="Scanner encountered an error reading the model file",
                description=(
                    "The model scanner could not fully read the file. "
                    "It may be corrupted, truncated, or in an unsupported format."
                ),
                evidence=result.scan_error,
                recommendation="Verify the file is complete and not corrupted.",
            ))
        return findings
