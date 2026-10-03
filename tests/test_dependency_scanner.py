"""
AISecGuard — Dependency Scanner Tests (Week 4)
Verifies static analysis of dependency files:
  - Normal requirements.txt (clean, pinned)
  - Unpinned dependencies
  - Broad version constraints
  - Invalid requirements file
  - pyproject.toml support
  - Empty dependency file
"""

import tempfile
from pathlib import Path
import pytest

from scanners.dependency_scanner import scan_dependency_file
from app.models.enums import FindingType, FindingSeverity

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_scan_clean_pinned_requirements():
    """Verify that all-pinned requirements file has no unpinned findings."""
    clean_path = FIXTURES_DIR / "requirements_clean.txt"
    assert clean_path.exists(), "requirements_clean.txt fixture missing"

    result = scan_dependency_file(clean_path)
    assert result.scan_error is None
    assert result.dependency_count >= 5
    assert result.unpinned_count == 0
    # No unpinned findings
    unpinned_findings = [
        f for f in result.findings
        if f.finding_type == FindingType.UNPINNED_DEPENDENCY
    ]
    assert len(unpinned_findings) == 0


def test_scan_unpinned_dependencies():
    """Verify that unpinned packages trigger DEP-003 findings."""
    unpinned_path = FIXTURES_DIR / "requirements_unpinned.txt"
    assert unpinned_path.exists(), "requirements_unpinned.txt fixture missing"

    result = scan_dependency_file(unpinned_path)
    assert result.unpinned_count == 5
    unpinned_findings = [f for f in result.findings if f.rule_id == "DEP-003"]
    assert len(unpinned_findings) >= 1
    assert all(f.finding_type == FindingType.UNPINNED_DEPENDENCY for f in unpinned_findings)


def test_scan_broad_version_constraints():
    """Verify that broad ranges like >=1.0 trigger DEP-004."""
    with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
        f.write("torch>=1.0.0\ntensorflow>2.0\n")
        temp_path = Path(f.name)

    try:
        result = scan_dependency_file(temp_path)
        broad_findings = [f for f in result.findings if f.rule_id == "DEP-004"]
        assert len(broad_findings) >= 1
        assert any(f.finding_type == FindingType.BROAD_VERSION_RANGE for f in broad_findings)
    finally:
        temp_path.unlink(missing_ok=True)


def test_scan_empty_requirements_file():
    """Verify that empty file triggers DEP-001."""
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        temp_path = Path(f.name)

    try:
        result = scan_dependency_file(temp_path)
        assert any(f.rule_id == "DEP-001" for f in result.findings)
    finally:
        temp_path.unlink(missing_ok=True)


def test_scan_pyproject_toml():
    """Verify that pyproject.toml dependencies are correctly extracted and analyzed."""
    pyproject_path = FIXTURES_DIR / "pyproject_sample.toml"
    assert pyproject_path.exists(), "pyproject_sample.toml fixture missing"

    result = scan_dependency_file(pyproject_path)
    assert result.scan_error is None
    assert result.dependency_count >= 3
    # Check that torch was recognized as unpinned
    rule_ids = {f.rule_id for f in result.findings}
    assert "DEP-003" in rule_ids or "DEP-004" in rule_ids


def test_scan_suspicious_package_name():
    """Verify that suspicious or typosquatting names trigger warning."""
    with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
        # reqeusts is a typosquat of requests
        f.write("reqeusts==2.31.0\n")
        temp_path = Path(f.name)

    try:
        result = scan_dependency_file(temp_path)
        # Should flag either typosquatting or suspicious package name
        suspicious = [
            f for f in result.findings
            if f.finding_type == FindingType.SUSPICIOUS_PACKAGE_NAME
        ]
        assert len(suspicious) >= 1
    finally:
        temp_path.unlink(missing_ok=True)
