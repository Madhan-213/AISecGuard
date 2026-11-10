"""
AISecGuard — Known-vulnerability (CVE) matching tests (DEP-007)
Offline list always; OSV lookups only when enabled, and never fatal.
"""

from app.core.config import settings
from app.models.enums import FindingSeverity, FindingType
from app.scanners.dependency_scanner import DependencyScanner, vulnerabilities


def _scan_text(tmp_path, text: str):
    path = tmp_path / "requirements.txt"
    path.write_text(text, encoding="utf-8")
    return DependencyScanner().scan(path)


def test_pinned_vulnerable_version_is_flagged(tmp_path):
    findings = _scan_text(tmp_path, "torch==1.12.0\n")
    vuln = [f for f in findings if f.rule_id == "DEP-007"]
    assert vuln, findings
    assert vuln[0].finding_type == FindingType.KNOWN_VULNERABILITY
    assert vuln[0].severity == FindingSeverity.CRITICAL
    assert "CVE-" in vuln[0].evidence


def test_fixed_version_is_not_flagged(tmp_path):
    findings = _scan_text(tmp_path, "fastapi==0.115.0\npydantic==2.9.2\n")
    assert not [f for f in findings if f.rule_id == "DEP-007"]


def test_unpinned_package_is_not_matched(tmp_path):
    findings = _scan_text(tmp_path, "torch\n")
    assert not [f for f in findings if f.rule_id == "DEP-007"]


def test_package_names_are_normalised(tmp_path):
    findings = _scan_text(tmp_path, "Scikit_Learn==0.23.2\n")
    assert [f for f in findings if f.rule_id == "DEP-007"]


def test_osv_results_are_added_when_enabled(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "OSV_LOOKUP_ENABLED", True)
    monkeypatch.setattr(
        vulnerabilities,
        "query_osv",
        lambda packages: {("leftpad", "1.0.0"): [{"id": "GHSA-test-0001", "summary": "Test advisory", "severity": "HIGH"}]},
    )
    findings = _scan_text(tmp_path, "leftpad==1.0.0\n")
    vuln = [f for f in findings if f.rule_id == "DEP-007"]
    assert vuln and "GHSA-test-0001" in vuln[0].evidence


def test_osv_failure_does_not_break_the_scan(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "OSV_LOOKUP_ENABLED", True)

    def boom(packages):
        raise OSError("network down")

    monkeypatch.setattr(vulnerabilities, "query_osv", boom)
    findings = _scan_text(tmp_path, "torch==1.12.0\n")
    assert [f for f in findings if f.rule_id == "DEP-007"], "offline list must still apply"


def test_osv_disabled_by_default(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "OSV_LOOKUP_ENABLED", False)

    def must_not_run(packages):
        raise AssertionError("OSV must not be called when disabled")

    monkeypatch.setattr(vulnerabilities, "query_osv", must_not_run)
    _scan_text(tmp_path, "torch==1.12.0\n")
