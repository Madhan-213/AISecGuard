"""
AISecGuard — Scanner Interface
One Finding dataclass and one Scanner base class shared by every scanner.

SAFETY: Scanners perform static analysis only. They never deserialize,
import, install, or execute uploaded artifacts.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.models.enums import ArtifactType, FindingSeverity, FindingType


@dataclass
class Finding:
    """A single security finding produced by any scanner."""
    rule_id: str
    finding_type: FindingType
    severity: FindingSeverity
    title: str
    description: str
    evidence: str | None = None
    recommendation: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Plain dict with enum values, as consumed by the risk engine and DB layer."""
        return {
            "rule_id": self.rule_id,
            "finding_type": self.finding_type.value,
            "severity": self.severity.value,
            "title": self.title,
            "description": self.description,
            "evidence": self.evidence,
            "recommendation": self.recommendation,
        }


class Scanner(ABC):
    """
    Base class for artifact scanners.

    Subclasses set `artifact_type` and `error_rule_id`, and implement
    `scan(path) -> list[Finding]`.
    """

    artifact_type: ArtifactType
    error_rule_id: str
    name: str = "scanner"

    @abstractmethod
    def scan(self, path: str | Path) -> list[Finding]:
        """Statically analyse the file at `path` and return its findings."""

    def error_finding(self, error: str) -> Finding:
        """Finding reported when the scanner itself fails on a file."""
        return Finding(
            rule_id=self.error_rule_id,
            finding_type=FindingType.MALFORMED_FILE,
            severity=FindingSeverity.MEDIUM,
            title=f"{self.name.capitalize()} encountered an error",
            description=(
                f"The {self.name} could not fully analyse the file. "
                "It may be corrupted, truncated, or in an unexpected format."
            ),
            evidence=error[:500],
            recommendation="Verify the file is complete and in a supported format.",
        )
