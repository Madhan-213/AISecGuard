"""
AISecGuard — Pickle Scanner Security Tests
Tests for Bug 1 (STACK_GLOBAL resolution, denylist matching, benign samples)
and Bug 2 (parsing failure reporting).

Rules:
  - Static byte inspection only; NEVER deserialize or execute untrusted data.
  - Loops protocols 0 to 5 and asserts every malicious sample is CRITICAL.
  - Asserts benign sklearn and torch samples raise no MODEL-002.
  - Asserts corrupted/truncated pickles report a MEDIUM finding.
"""

import os
import io
import sys
import types
import pickle
import tempfile
import pytest

from app.scanners.model_scanner import scan_model_file
from app.models.enums import FindingSeverity, FindingType


# ---------------------------------------------------------------------------
# Helper: Write temporary file safely
# ---------------------------------------------------------------------------

def write_temp_file(content: bytes, suffix: str = ".pkl") -> str:
    """Write content to a temp file and return its path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.write(fd, content)
    os.close(fd)
    return path


# ---------------------------------------------------------------------------
# Helper: Generate test pickle payloads without executing them
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


def make_malicious_pickle_bytes(mod: str, func: str, protocol: int) -> bytes:
    """Create a pickle stream referencing a denylisted callable for a given protocol."""
    return pickle.dumps(_CallablePayload(mod, func), protocol=protocol)


class LinearRegression:
    def __init__(self):
        self.coef_ = [0.25, -0.75, 1.5]
        self.intercept_ = 0.05
        self.n_features_in_ = 3

LinearRegression.__module__ = "sklearn.linear_model"
LinearRegression.__name__ = "LinearRegression"
LinearRegression.__qualname__ = "LinearRegression"


def make_benign_sklearn_pickle_bytes(protocol: int = 4) -> bytes:
    """Create a pickle stream mimicking an sklearn model artifact."""
    if "sklearn" not in sys.modules:
        sys.modules["sklearn"] = types.ModuleType("sklearn")
    if "sklearn.linear_model" not in sys.modules:
        sys.modules["sklearn.linear_model"] = types.ModuleType("sklearn.linear_model")

    sys.modules["sklearn.linear_model"].LinearRegression = LinearRegression
    return pickle.dumps(LinearRegression(), protocol=protocol)


def _rebuild_tensor_v2(*args):
    pass

def make_benign_torch_pickle_bytes(protocol: int = 4) -> bytes:
    """Create a pickle stream mimicking a PyTorch tensor/weights artifact."""
    if "torch" not in sys.modules:
        sys.modules["torch"] = types.ModuleType("torch")
    if "torch._utils" not in sys.modules:
        tu = types.ModuleType("torch._utils")
        tu._rebuild_tensor_v2 = _rebuild_tensor_v2
        sys.modules["torch._utils"] = tu
    else:
        tu = sys.modules["torch._utils"]
        tu._rebuild_tensor_v2 = _rebuild_tensor_v2

    _rebuild_tensor_v2.__module__ = "torch._utils"
    _rebuild_tensor_v2.__name__ = "_rebuild_tensor_v2"
    _rebuild_tensor_v2.__qualname__ = "_rebuild_tensor_v2"

    class DummyTorchWeights:
        def __reduce__(self):
            return (_rebuild_tensor_v2, (None, 0, (4,), (1,), False, None))

    data = {"state_dict": {"layer1.weight": DummyTorchWeights()}}
    return pickle.dumps(data, protocol=protocol)


# ---------------------------------------------------------------------------
# Test: Malicious samples across protocols 0 to 5 must all be CRITICAL
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("protocol", [0, 1, 2, 3, 4, 5])
@pytest.mark.parametrize("mod,func", [
    ("os", "system"),
    ("builtins", "eval"),
    ("subprocess", "Popen"),
    ("socket", "socket"),
])
def test_malicious_pickles_protocols_0_to_5_are_critical(protocol: int, mod: str, func: str):
    """
    Every malicious pickle across protocols 0 to 5 must produce a CRITICAL finding
    with rule_id 'MODEL-002'.
    """
    raw_bytes = make_malicious_pickle_bytes(mod, func, protocol)
    path = write_temp_file(raw_bytes, suffix=".pkl")
    try:
        result = scan_model_file(path)

        # Check for MODEL-002 finding
        model_002_findings = [f for f in result.findings if f.rule_id == "MODEL-002"]
        assert len(model_002_findings) > 0, (
            f"Expected MODEL-002 for {mod}.{func} under protocol {protocol}, "
            f"got findings: {result.findings}"
        )

        # Check CRITICAL severity
        critical_findings = [f for f in result.findings if f.severity == FindingSeverity.CRITICAL]
        assert len(critical_findings) > 0, (
            f"Expected CRITICAL finding for {mod}.{func} under protocol {protocol}"
        )

        # Check suspicious reference was detected
        assert len(result.suspicious_refs_found) > 0
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Test: Benign sklearn and torch samples must raise NO MODEL-002
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("protocol", [0, 1, 2, 3, 4, 5])
def test_benign_sklearn_samples_raise_no_model_002(protocol: int):
    """Benign sklearn pickle samples must NOT produce any MODEL-002 findings."""
    raw_bytes = make_benign_sklearn_pickle_bytes(protocol)
    path = write_temp_file(raw_bytes, suffix=".pkl")
    try:
        result = scan_model_file(path)
        model_002 = [f for f in result.findings if f.rule_id == "MODEL-002"]
        assert len(model_002) == 0, (
            f"Benign sklearn sample raised MODEL-002 under protocol {protocol}: {model_002}"
        )
        assert len(result.suspicious_refs_found) == 0
    finally:
        os.unlink(path)


@pytest.mark.parametrize("protocol", [0, 1, 2, 3, 4, 5])
def test_benign_torch_samples_raise_no_model_002(protocol: int):
    """Benign torch pickle samples must NOT produce any MODEL-002 findings."""
    raw_bytes = make_benign_torch_pickle_bytes(protocol)
    path = write_temp_file(raw_bytes, suffix=".pkl")
    try:
        result = scan_model_file(path)
        model_002 = [f for f in result.findings if f.rule_id == "MODEL-002"]
        assert len(model_002) == 0, (
            f"Benign torch sample raised MODEL-002 under protocol {protocol}: {model_002}"
        )
        assert len(result.suspicious_refs_found) == 0
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Test: Parsing errors must report a MEDIUM finding instead of except: pass
# ---------------------------------------------------------------------------

def test_corrupted_pickle_reports_medium_finding():
    """
    When pickle opcode parsing fails (e.g. truncated or corrupted stream),
    the scanner must report a MEDIUM severity finding (e.g. MODEL-011)
    instead of silently ignoring it with except: pass.
    """
    # Truncated pickle data: opcode without required argument / STOP
    truncated_data = b"\x80\x04\x95\x20\x00\x00\x00\x00\x00\x00\x00\x8c\x02os"
    path = write_temp_file(truncated_data, suffix=".pkl")
    try:
        result = scan_model_file(path)
        medium_findings = [
            f for f in result.findings
            if f.severity == FindingSeverity.MEDIUM
        ]
        assert len(medium_findings) > 0, (
            f"Expected at least one MEDIUM finding for corrupted pickle, got: {result.findings}"
        )
        rule_ids = [f.rule_id for f in medium_findings]
        assert "MODEL-011" in rule_ids, (
            f"Expected MODEL-011 in findings for parsing error, got rule_ids: {rule_ids}"
        )
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Test: Scan files directly from samples/models generated by generate_samples.py
# ---------------------------------------------------------------------------

def test_samples_directory_all_malicious_samples_are_critical():
    """Verify that every generated malicious sample in samples/models is CRITICAL."""
    from pathlib import Path
    samples_models_dir = Path(__file__).resolve().parent.parent / "samples" / "models"
    malicious_files = list(samples_models_dir.glob("malicious_*.pkl"))
    assert len(malicious_files) == 24, f"Expected 24 malicious sample files, found {len(malicious_files)}"

    for file_path in malicious_files:
        result = scan_model_file(file_path)
        critical_findings = [f for f in result.findings if f.severity == FindingSeverity.CRITICAL]
        assert len(critical_findings) > 0, (
            f"Sample {file_path.name} failed: expected at least one CRITICAL finding, got: {result.findings}"
        )
        model_002 = [f for f in result.findings if f.rule_id == "MODEL-002"]
        assert len(model_002) > 0, (
            f"Sample {file_path.name} failed: expected MODEL-002 finding, got: {result.findings}"
        )
        assert len(result.suspicious_refs_found) > 0


def test_samples_directory_all_benign_samples_raise_no_model_002():
    """Verify that every generated benign sample in samples/models raises NO MODEL-002."""
    from pathlib import Path
    samples_models_dir = Path(__file__).resolve().parent.parent / "samples" / "models"
    benign_files = list(samples_models_dir.glob("benign_*.pkl"))
    assert len(benign_files) == 6, f"Expected 6 benign sample files, found {len(benign_files)}"

    for file_path in benign_files:
        result = scan_model_file(file_path)
        model_002 = [f for f in result.findings if f.rule_id == "MODEL-002"]
        assert len(model_002) == 0, (
            f"Benign sample {file_path.name} raised MODEL-002: {model_002}"
        )
        assert len(result.suspicious_refs_found) == 0

