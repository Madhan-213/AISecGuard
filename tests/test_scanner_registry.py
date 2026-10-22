"""
AISecGuard — Unified Scanner Package Tests
Verifies the single scanner interface (Finding + Scanner + registry) and the
Docker bug where dataset/dependency uploads returned "scanner not available"
because the scanners lived outside backend/.
"""

import io
import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.models.enums import ArtifactType, FindingSeverity, FindingType
from app.scanners import Finding, Scanner, get_scanner, run_scanner, SCANNER_REGISTRY
from app.scanners.dataset_scanner import DatasetScanner
from app.scanners.dependency_scanner import DependencyScanner
from app.scanners.model_scanner import ModelScanner
from tests.conftest import make_suspicious_pickle_bytes

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
FIXTURES_DIR = Path(__file__).parent / "fixtures"


# ---------------------------------------------------------------------------
# Interface
# ---------------------------------------------------------------------------

def test_finding_dataclass_to_dict():
    f = Finding(
        rule_id="X-001",
        finding_type=FindingType.OTHER,
        severity=FindingSeverity.LOW,
        title="t",
        description="d",
    )
    assert f.to_dict() == {
        "rule_id": "X-001",
        "finding_type": "OTHER",
        "severity": "LOW",
        "title": "t",
        "description": "d",
        "evidence": None,
        "recommendation": None,
    }


def test_registry_covers_every_artifact_type():
    assert set(SCANNER_REGISTRY) == {
        ArtifactType.MODEL,
        ArtifactType.DATASET,
        ArtifactType.DEPENDENCY,
    }
    for artifact_type, scanner in SCANNER_REGISTRY.items():
        assert isinstance(scanner, Scanner)
        assert scanner.artifact_type == artifact_type


def test_get_scanner_accepts_enum_or_string():
    assert isinstance(get_scanner(ArtifactType.DATASET), DatasetScanner)
    assert isinstance(get_scanner("DEPENDENCY"), DependencyScanner)
    assert isinstance(get_scanner("MODEL"), ModelScanner)
    with pytest.raises(KeyError):
        get_scanner("NOT_A_TYPE")


# ---------------------------------------------------------------------------
# Each scanner returns list[Finding]
# ---------------------------------------------------------------------------

def test_dataset_scanner_returns_findings():
    findings = DatasetScanner().scan(FIXTURES_DIR / "dataset_duplicates.csv")
    assert findings and all(isinstance(f, Finding) for f in findings)
    assert any(f.rule_id == "DATA-007" for f in findings)


def test_dependency_scanner_returns_findings():
    findings = DependencyScanner().scan(FIXTURES_DIR / "requirements_unpinned.txt")
    assert findings and all(isinstance(f, Finding) for f in findings)
    assert any(f.rule_id == "DEP-003" for f in findings)


def test_model_scanner_returns_findings(tmp_path):
    path = tmp_path / "evil.pkl"
    path.write_bytes(make_suspicious_pickle_bytes())
    findings = ModelScanner().scan(path)
    assert all(isinstance(f, Finding) for f in findings)
    assert any(f.rule_id == "MODEL-002" for f in findings)


def test_dataset_parse_error_becomes_finding(tmp_path):
    path = tmp_path / "broken.json"
    path.write_text("{ not json", encoding="utf-8")
    findings = DatasetScanner().scan(path)
    assert any(f.rule_id == "DATA-000" for f in findings)


def test_run_scanner_turns_crash_into_finding(tmp_path):
    missing = tmp_path / "does_not_exist.csv"
    findings = run_scanner(ArtifactType.DATASET, missing)
    assert len(findings) == 1
    assert findings[0].rule_id == "DATA-000"
    assert findings[0].finding_type == FindingType.MALFORMED_FILE


# ---------------------------------------------------------------------------
# Single package: no root scanners/, no copy-pasted wrappers
# ---------------------------------------------------------------------------

def test_root_scanners_folder_removed():
    assert not (REPO_ROOT / "scanners").exists()


def test_scan_service_has_no_per_scanner_wrappers():
    import app.services.scan_service as svc
    assert not hasattr(svc, "_run_dataset_scanner")
    assert not hasattr(svc, "_run_dependency_scanner")
    source = Path(svc.__file__).read_text(encoding="utf-8")
    assert "scanner not available" not in source.lower()


def test_scanners_importable_with_backend_only_on_path(tmp_path):
    """Mirrors the Docker image, which only contains backend/ at /app."""
    csv_path = FIXTURES_DIR / "dataset_duplicates.csv"
    req_path = FIXTURES_DIR / "requirements_unpinned.txt"
    code = (
        "import sys\n"
        "from app.scanners import run_scanner\n"
        f"d = run_scanner('DATASET', {str(csv_path)!r})\n"
        f"r = run_scanner('DEPENDENCY', {str(req_path)!r})\n"
        "ids = {f.rule_id for f in d + r}\n"
        "print(sorted(ids))\n"
        "sys.exit(0 if 'DATA-007' in ids and 'DEP-003' in ids else 1)\n"
    )
    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
    proc = subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr


# ---------------------------------------------------------------------------
# End to end through the API
# ---------------------------------------------------------------------------

def _upload_and_scan(client: TestClient, filename: str, content: bytes) -> dict:
    up = client.post(
        "/api/v1/artifacts/upload",
        files={"file": (filename, io.BytesIO(content), "application/octet-stream")},
    )
    assert up.status_code == 201, up.text
    scan = client.post("/api/v1/scans", json={"artifact_id": up.json()["id"]})
    assert scan.status_code == 201, scan.text
    return scan.json()


def _assert_real_findings(scan: dict, prefix: str):
    titles = [f["title"].lower() for f in scan["findings"]]
    assert not any("not available" in t for t in titles), titles
    assert any((f.get("rule_id") or "").startswith(prefix) for f in scan["findings"])


def test_csv_upload_returns_real_findings(client: TestClient):
    scan = _upload_and_scan(
        client, "data.csv", (FIXTURES_DIR / "dataset_duplicates.csv").read_bytes()
    )
    assert scan["status"] == "COMPLETED"
    _assert_real_findings(scan, "DATA-")


def test_requirements_upload_returns_real_findings(client: TestClient):
    scan = _upload_and_scan(
        client, "requirements.txt", (FIXTURES_DIR / "requirements_unpinned.txt").read_bytes()
    )
    assert scan["status"] == "COMPLETED"
    _assert_real_findings(scan, "DEP-")
