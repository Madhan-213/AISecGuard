"""
AISecGuard — Risk Assessment Engine (Week 4)
Central risk scoring and evaluation mechanism.

Scoring methodology:
  - Each finding contributes points based on its severity:
      INFORMATIONAL : 0 points
      LOW           : 1 point
      MEDIUM        : 3 points
      HIGH          : 6 points
      CRITICAL      : 10 points
  - The total score is the sum of finding scores.
  - Overall severity / RiskLevel mapping:
      Score = 0      -> LOW (Safe / Clean)
      Score 1 - 4    -> LOW
      Score 5 - 14   -> MEDIUM
      Score 15 - 29  -> HIGH
      Score >= 30    -> CRITICAL
    * Override rule: Any single CRITICAL finding elevates minimum severity to HIGH;
      2 or more CRITICAL findings guarantee CRITICAL risk level.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.enums import FindingSeverity, RiskLevel


SEVERITY_WEIGHTS: dict[str, int] = {
    FindingSeverity.INFORMATIONAL.value: 0,
    FindingSeverity.LOW.value: 1,
    FindingSeverity.MEDIUM.value: 3,
    FindingSeverity.HIGH.value: 6,
    FindingSeverity.CRITICAL.value: 10,
}


@dataclass
class RiskAssessmentResult:
    """Detailed risk assessment output with explainability breakdown."""
    risk_score: int
    severity: str  # RiskLevel value: LOW, MEDIUM, HIGH, CRITICAL
    finding_count: int
    severity_breakdown: dict[str, int] = field(default_factory=dict)
    explanation: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "risk_score": self.risk_score,
            "severity": self.severity,
            "finding_count": self.finding_count,
            "severity_breakdown": self.severity_breakdown,
            "explanation": self.explanation,
        }


def assess_risk(findings: list[dict | Any]) -> RiskAssessmentResult:
    """
    Perform a complete, explainable risk assessment over a list of findings.

    Args:
        findings: List of finding dicts or objects containing a severity field.

    Returns:
        RiskAssessmentResult with score, severity, breakdown, and explanation.
    """
    breakdown = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "informational": 0,
    }

    if not findings:
        return RiskAssessmentResult(
            risk_score=0,
            severity=RiskLevel.LOW.value,
            finding_count=0,
            severity_breakdown=breakdown,
            explanation="No security findings detected. Risk score is 0 (LOW).",
        )

    total_score = 0
    for f in findings:
        sev = getattr(f, "severity", None)
        if sev is None and isinstance(f, dict):
            sev = f.get("severity")
        if hasattr(sev, "value"):
            sev = sev.value

        sev_str = str(sev).upper() if sev else FindingSeverity.INFORMATIONAL.value

        points = SEVERITY_WEIGHTS.get(sev_str, 0)
        total_score += points

        if sev_str == FindingSeverity.CRITICAL.value:
            breakdown["critical"] += 1
        elif sev_str == FindingSeverity.HIGH.value:
            breakdown["high"] += 1
        elif sev_str == FindingSeverity.MEDIUM.value:
            breakdown["medium"] += 1
        elif sev_str == FindingSeverity.LOW.value:
            breakdown["low"] += 1
        else:
            breakdown["informational"] += 1

    # Determine risk level based on score & critical count overrides
    if total_score >= 30 or breakdown["critical"] >= 2:
        level = RiskLevel.CRITICAL
    elif total_score >= 15 or breakdown["critical"] >= 1:
        level = RiskLevel.HIGH
    elif total_score >= 5 or breakdown["high"] >= 1:
        level = RiskLevel.MEDIUM
    else:
        level = RiskLevel.LOW

    # Build human-readable explanation
    parts = []
    if breakdown["critical"]:
        parts.append(f"{breakdown['critical']} critical (+{breakdown['critical'] * 10} pts)")
    if breakdown["high"]:
        parts.append(f"{breakdown['high']} high (+{breakdown['high'] * 6} pts)")
    if breakdown["medium"]:
        parts.append(f"{breakdown['medium']} medium (+{breakdown['medium'] * 3} pts)")
    if breakdown["low"]:
        parts.append(f"{breakdown['low']} low (+{breakdown['low'] * 1} pts)")
    if breakdown["informational"]:
        parts.append(f"{breakdown['informational']} informational (0 pts)")

    details = ", ".join(parts) if parts else "none"
    explanation = (
        f"Score {total_score} computed from {len(findings)} finding(s) [{details}]. "
        f"Overall risk assessment: {level.value}."
    )

    return RiskAssessmentResult(
        risk_score=total_score,
        severity=level.value,
        finding_count=len(findings),
        severity_breakdown=breakdown,
        explanation=explanation,
    )


def calculate_risk(findings_data: list[dict | Any]) -> tuple[int, RiskLevel]:
    """Convenience helper returning (risk_score, RiskLevel)."""
    result = assess_risk(findings_data)
    return result.risk_score, RiskLevel(result.severity)
