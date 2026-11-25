"""
AISecGuard — Scanner Registry
Maps each ArtifactType to the Scanner that handles it.
"""

from __future__ import annotations

from pathlib import Path

from app.models.enums import ArtifactType
from app.scanners.base import Finding, Scanner
from app.scanners.dataset_scanner import DatasetScanner
from app.scanners.dependency_scanner import DependencyScanner
from app.scanners.model_scanner import ModelScanner

SCANNER_REGISTRY: dict[ArtifactType, Scanner] = {
    scanner.artifact_type: scanner
    for scanner in (ModelScanner(), DatasetScanner(), DependencyScanner())
}


def get_scanner(artifact_type: ArtifactType | str) -> Scanner:
    """Return the scanner for an artifact type. Raises KeyError if none is registered."""
    try:
        key = ArtifactType(artifact_type)
    except ValueError:
        raise KeyError(f"No scanner registered for artifact type {artifact_type!r}") from None
    return SCANNER_REGISTRY[key]


def run_scanner(artifact_type: ArtifactType | str, path: str | Path) -> list[Finding]:
    """Run the registered scanner; an unexpected crash becomes a single error finding."""
    scanner = get_scanner(artifact_type)
    try:
        return scanner.scan(path)
    except Exception as exc:
        return [scanner.error_finding(f"{type(exc).__name__}: {exc}")]
