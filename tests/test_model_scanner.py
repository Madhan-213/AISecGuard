"""
AISecGuard — Model Scanner Tests
Week 3: Static analysis tests for the model security scanner.

IMPORTANT: These tests use controlled byte-level fixtures.
No untrusted code is executed at any point.
"""

import os
import io
import pickle
import tempfile

import pytest

from app.scanners.model_scanner import scan_model_file
from app.models.enums import FindingSeverity, FindingType
from tests.conftest import make_safe_pickle_bytes, make_suspicious_pickle_bytes


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def write_temp_file(content: bytes, suffix: str) -> str:
    """Write content to a temp file and return its path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.write(fd, content)
    os.close(fd)
    return path


# ---------------------------------------------------------------------------
# Pickle format tests
# ---------------------------------------------------------------------------

def test_safe_pickle_detected_as_unsafe_serialization():
    """
    A benign pickle file is still flagged for UNSAFE_SERIALIZATION.
    Pickle format itself is inherently risky — even harmless pickles are flagged.
    This is correct scanner behavior.
    """
    path = write_temp_file(make_safe_pickle_bytes(), ".pkl")
    try:
        result = scan_model_file(path)
        types = [f.finding_type for f in result.findings]
        assert FindingType.UNSAFE_SERIALIZATION in types
        assert result.format_identified == "PICKLE"
    finally:
        os.unlink(path)


def test_suspicious_pickle_raises_critical_finding():
    """
    A pickle containing a GLOBAL reference to 'os' is flagged as
    SUSPICIOUS_REFERENCE with CRITICAL severity.
    """
    path = write_temp_file(make_suspicious_pickle_bytes(), ".pkl")
    try:
        result = scan_model_file(path)
        critical_findings = [
            f for f in result.findings
            if f.severity == FindingSeverity.CRITICAL
        ]
        assert len(critical_findings) > 0, (
            "Expected at least one CRITICAL finding for suspicious pickle"
        )
        suspicious_types = [
            f for f in result.findings
            if f.finding_type == FindingType.SUSPICIOUS_REFERENCE
        ]
        assert len(suspicious_types) > 0
    finally:
        os.unlink(path)


def test_suspicious_pickle_refs_reported_in_evidence():
    """Suspicious references appear in the finding evidence field."""
    path = write_temp_file(make_suspicious_pickle_bytes(), ".pkl")
    try:
        result = scan_model_file(path)
        ref_findings = [
            f for f in result.findings
            if f.finding_type == FindingType.SUSPICIOUS_REFERENCE
        ]
        if ref_findings:
            evidence = ref_findings[0].evidence or ""
            assert "os" in evidence.lower()
    finally:
        os.unlink(path)


def test_joblib_extension_detected():
    """A .joblib file is identified as JOBLIB format."""
    path = write_temp_file(make_safe_pickle_bytes(), ".joblib")
    try:
        result = scan_model_file(path)
        assert result.format_identified == "JOBLIB"
    finally:
        os.unlink(path)


def test_safetensors_informational_only():
    """A .safetensors file produces only INFORMATIONAL findings."""
    # SafeTensors files start with a JSON length header
    # For testing purposes we use minimal valid-looking bytes
    import struct as _struct
    header_json = b"{}"
    # little-endian uint64 length prefix (2 bytes)
    header_len_bytes = _struct.pack("<Q", len(header_json))
    content = header_len_bytes + header_json + b"\x00" * 8
    path = write_temp_file(content, ".safetensors")
    try:
        result = scan_model_file(path)
        assert result.format_identified == "SAFETENSORS"
        high_or_critical = [
            f for f in result.findings
            if f.severity in (FindingSeverity.HIGH, FindingSeverity.CRITICAL)
        ]
        assert len(high_or_critical) == 0, (
            f"Valid SafeTensors should have no HIGH/CRITICAL findings, got: {high_or_critical}"
        )
    finally:
        os.unlink(path)


def test_pytorch_zip_format_detected():
    """A PyTorch ZIP format file is identified by PK magic bytes."""
    # ZIP magic bytes: PK\x03\x04
    content = b"PK\x03\x04" + b"\x00" * 100
    path = write_temp_file(content, ".pt")
    try:
        result = scan_model_file(path)
        assert result.format_identified == "PYTORCH_ZIP"
    finally:
        os.unlink(path)


def test_hdf5_format_detected():
    """An HDF5 file is identified by its magic bytes."""
    HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"
    content = HDF5_MAGIC + b"\x00" * 100
    path = write_temp_file(content, ".h5")
    try:
        result = scan_model_file(path)
        assert result.format_identified == "HDF5_KERAS"
    finally:
        os.unlink(path)


def test_onnx_informational():
    """An ONNX file produces an INFORMATIONAL finding."""
    content = b"\x08\x01\x12\x04onnx" + b"\x00" * 50  # fake ONNX protobuf header
    path = write_temp_file(content, ".onnx")
    try:
        result = scan_model_file(path)
        assert result.format_identified == "ONNX"
        severities = {f.severity for f in result.findings}
        assert FindingSeverity.INFORMATIONAL in severities
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Week 4: Extended Model Scanner Tests
# ---------------------------------------------------------------------------

def test_model_scanner_computes_sha256():
    """Verify that model scanner computes SHA-256 accurately."""
    content = b"fixed content for sha256 verification"
    path = write_temp_file(content, ".bin")
    try:
        import hashlib
        expected_hash = hashlib.sha256(content).hexdigest()
        result = scan_model_file(path)
        assert result.sha256 == expected_hash
    finally:
        os.unlink(path)


def test_model_scanner_detects_suspicious_embedded_strings():
    """Verify static byte scan detects suspicious strings like os.system or /bin/sh."""
    content = b"\x00" * 32 + b"os.system" + b"\x00" * 32
    path = write_temp_file(content, ".bin")
    try:
        result = scan_model_file(path)
        assert len(result.suspicious_strings_found) > 0
        assert "os.system" in result.suspicious_strings_found
        rule_ids = {f.rule_id for f in result.findings}
        assert "MODEL-009" in rule_ids
    finally:
        os.unlink(path)


def test_model_scanner_generic_bin():
    """Verify generic .bin file identifies as GENERIC_BINARY and sets rule MODEL-007."""
    content = b"\x00\x01\x02\x03\x04\x05"
    path = write_temp_file(content, ".bin")
    try:
        result = scan_model_file(path)
        assert result.format_identified == "GENERIC_BINARY"
        rule_ids = {f.rule_id for f in result.findings}
        assert "MODEL-007" in rule_ids
    finally:
        os.unlink(path)


def test_model_scanner_unsupported_format():
    """Verify unsupported extension produces UNKNOWN format finding."""
    content = b"arbitrary bytes"
    path = write_temp_file(content, ".unknown_ext")
    try:
        result = scan_model_file(path)
        assert result.format_identified in ("UNSUPPORTED_EXTENSION", "UNKNOWN")
        rule_ids = {f.rule_id for f in result.findings}
        assert "MODEL-008" in rule_ids
    finally:
        os.unlink(path)



def test_model_scanner_zip_repository():
    """Verify scanning a Hugging Face model repository zip with weights, config, and dependencies."""
    import zipfile
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tf:
        zip_path = tf.name

    try:
        with zipfile.ZipFile(zip_path, "w") as zf:
            # 1. Config with auto_map
            zf.writestr("config.json", '{"model_type": "custom", "auto_map": {"AutoModel": "modeling_custom.CustomModel"}}')
            # 2. requirements.txt with pinned dependency
            zf.writestr("requirements.txt", "torch==2.1.0\nrequests==2.28.0\n")
            # 3. Model weights
            zf.writestr("pytorch_model.bin", b"fake model weight bytes for testing")
            # 4. Custom modeling script
            zf.writestr("modeling_custom.py", "import os\ndef run():\n    os.system('id')\n")

        result = scan_model_file(zip_path)
        assert result.format_identified == "HUGGINGFACE_ZIP_REPO"
        titles = [f.title for f in result.findings]
        
        # Verify findings from multiple components
        assert any("auto_map detected" in t for t in titles)
        assert any("modeling_custom.py" in t for t in titles)
        assert any("repository archive ingested" in t for t in titles)
    finally:
        if os.path.exists(zip_path):
            os.unlink(zip_path)


def test_model_scanner_zip_slip():
    """Verify detection of zip-slip path traversal sequence."""
    import zipfile
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tf:
        zip_path = tf.name

    try:
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("../../etc/passwd", "root:x:0:0::/root:/bin/bash")

        result = scan_model_file(zip_path)
        rule_ids = {f.rule_id for f in result.findings}
        assert "MODEL-ZIP-001" in rule_ids
    finally:
        if os.path.exists(zip_path):
            os.unlink(zip_path)
