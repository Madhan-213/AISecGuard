"""
AISecGuard — Risk Assessment Engine Tests (Week 4)
Verifies:
  - No findings -> score 0, LOW severity
  - LOW findings -> 1 pt per finding
  - MEDIUM findings -> 3 pts per finding
  - HIGH findings -> 6 pts per finding
  - CRITICAL findings -> 10 pts per finding, critical override
  - Multiple scanner findings combined
  - Explainable breakdown and explanation text
"""

import pytest

from app.services.risk_engine import assess_risk, calculate_risk, SEVERITY_WEIGHTS
from app.models.enums import FindingSeverity, RiskLevel


def test_risk_engine_no_findings():
    """Verify that empty findings list gives 0 score and LOW severity."""
    result = assess_risk([])
    assert result.risk_score == 0
    assert result.severity == RiskLevel.LOW.value
    assert result.finding_count == 0
    assert result.severity_breakdown["critical"] == 0
    assert "No security findings detected" in result.explanation


def test_risk_engine_low_findings():
    """Verify that LOW findings score 1 point each."""
    findings = [
        {"severity": FindingSeverity.LOW.value, "title": "Low 1"},
        {"severity": FindingSeverity.LOW.value, "title": "Low 2"},
    ]
    result = assess_risk(findings)
    assert result.risk_score == 2
    assert result.severity == RiskLevel.LOW.value
    assert result.severity_breakdown["low"] == 2
    assert result.severity_breakdown["medium"] == 0


def test_risk_engine_medium_findings():
    """Verify that MEDIUM findings score 3 points each and elevate risk level."""
    findings = [
        {"severity": FindingSeverity.MEDIUM.value, "title": "Med 1"},
        {"severity": FindingSeverity.MEDIUM.value, "title": "Med 2"},
    ]
    result = assess_risk(findings)
    assert result.risk_score == 6
    assert result.severity == RiskLevel.MEDIUM.value
    assert result.severity_breakdown["medium"] == 2


def test_risk_engine_high_findings():
    """Verify that HIGH findings score 6 points each and elevate risk level to HIGH."""
    findings = [
        {"severity": FindingSeverity.HIGH.value, "title": "High 1"},
        {"severity": FindingSeverity.HIGH.value, "title": "High 2"},
        {"severity": FindingSeverity.HIGH.value, "title": "High 3"},
    ]
    result = assess_risk(findings)
    assert result.risk_score == 18
    assert result.severity == RiskLevel.HIGH.value
    assert result.severity_breakdown["high"] == 3


def test_risk_engine_critical_findings():
    """Verify that CRITICAL findings score 10 points and trigger critical risk."""
    findings = [
        {"severity": FindingSeverity.CRITICAL.value, "title": "Crit 1"},
        {"severity": FindingSeverity.CRITICAL.value, "title": "Crit 2"},
    ]
    result = assess_risk(findings)
    assert result.risk_score == 20
    assert result.severity == RiskLevel.CRITICAL.value
    assert result.severity_breakdown["critical"] == 2


def test_risk_engine_combined_multiple_scanners():
    """Verify combining findings from Model, Dataset, and Dependency scanners."""
    combined_findings = [
        # Model finding (HIGH = 6 pts)
        {"rule_id": "MODEL-001", "severity": FindingSeverity.HIGH.value, "title": "Pickle serialization"},
        # Dataset finding (MEDIUM = 3 pts)
        {"rule_id": "DATA-007", "severity": FindingSeverity.MEDIUM.value, "title": "High duplicate concentration"},
        # Dependency finding (MEDIUM = 3 pts)
        {"rule_id": "DEP-003", "severity": FindingSeverity.MEDIUM.value, "title": "Unpinned dependency"},
        # Informational finding (0 pts)
        {"rule_id": "PROV-001", "severity": FindingSeverity.INFORMATIONAL.value, "title": "Provenance recorded"},
    ]
    result = assess_risk(combined_findings)
    expected_score = 6 + 3 + 3 + 0
    assert result.risk_score == expected_score
    assert result.severity == RiskLevel.MEDIUM.value
    assert result.finding_count == 4
    assert result.severity_breakdown["high"] == 1
    assert result.severity_breakdown["medium"] == 2
    assert result.severity_breakdown["informational"] == 1
    assert "1 high" in result.explanation
    assert "2 medium" in result.explanation


def test_calculate_risk_tuple_convenience():
    """Verify calculate_risk returns (int, RiskLevel)."""
    findings = [
        {"severity": FindingSeverity.HIGH.value},
        {"severity": FindingSeverity.LOW.value},
    ]
    score, level = calculate_risk(findings)
    assert score == 7
    assert level == RiskLevel.MEDIUM
