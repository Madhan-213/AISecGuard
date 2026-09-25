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
    content = b"\x00\x00\x00\x00\x00\x00\x00\x02{}"  # length=2, content={}
    path = write_temp_file(content, ".safetensors")
    try:
        result = scan_model_file(path)
        assert result.format_identified == "SAFETENSORS"
        non_info = [
            f for f in result.findings
            if f.severity != FindingSeverity.INFORMATIONAL
        ]
        assert len(non_info) == 0, (
            f"SafeTensors should have no HIGH/CRITICAL findings, got: {non_info}"
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
