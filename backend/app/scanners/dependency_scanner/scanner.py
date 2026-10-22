"""
AISecGuard — Dependency Security Scanner (Static Analysis Only) — Week 4

=============================================================================
CRITICAL SAFETY RULES:
  - This scanner NEVER installs, imports, or executes dependency code.
  - NEVER runs pip, pip-audit, or any package manager commands.
  - All analysis is purely lexical/textual on the dependency file.
  - No network requests are made (no PyPI lookups).
=============================================================================

Supported formats:
  requirements.txt  — pip requirements format
  pyproject.toml    — PEP 517/518 project configuration (poetry/flit/setuptools)

ACADEMIC DISCLAIMER:
  All findings are heuristic indicators only.
  A finding does NOT guarantee that any package is malicious.
  The typosquatting check is a name-similarity heuristic, not a malware scan.
  Results must be interpreted by a qualified security analyst.
"""

from __future__ import annotations

import re
import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.models.enums import FindingType, FindingSeverity

from .rules import (
    DependencyRule,
    RULE_EMPTY_FILE,
    RULE_PARSE_ERROR,
    RULE_UNPINNED_DEPENDENCY,
    RULE_BROAD_VERSION_RANGE,
    RULE_SUSPICIOUS_PACKAGE_NAME,
    RULE_UNUSUAL_PACKAGE_NAME,
    POPULAR_PACKAGES,
    SUSPICIOUS_NAME_KEYWORDS,
    MIN_LEGITIMATE_NAME_LENGTH,
)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ParsedDependency:
    """Represents a single parsed dependency entry."""
    raw_line: str
    package_name: str
    version_constraint: str | None
    is_pinned: bool
    is_broad: bool


@dataclass
class DependencyFinding:
    """A single finding produced by the dependency scanner."""
    rule_id: str
    finding_type: FindingType
    severity: FindingSeverity
    title: str
    description: str
    evidence: str | None = None
    recommendation: str | None = None


@dataclass
class DependencyScanResult:
    """Result returned by the dependency scanner."""
    file_extension: str
    file_size: int
    sha256: str
    format_identified: str
    dependency_count: int = 0
    unpinned_count: int = 0
    broad_constraint_count: int = 0
    dependencies: list[ParsedDependency] = field(default_factory=list)
    findings: list[DependencyFinding] = field(default_factory=list)
    statistics: dict[str, Any] = field(default_factory=dict)
    scan_error: str | None = None


# ---------------------------------------------------------------------------
# Helper: add finding
# ---------------------------------------------------------------------------

def _add_finding(
    result: DependencyScanResult,
    rule: DependencyRule,
    description_override: str | None = None,
    evidence: str | None = None,
) -> None:
    result.findings.append(DependencyFinding(
        rule_id=rule.rule_id,
        finding_type=rule.finding_type,
        severity=rule.severity,
        title=rule.title,
        description=description_override or rule.description_template,
        evidence=evidence,
        recommendation=rule.recommendation,
    ))


# ---------------------------------------------------------------------------
# Requirements.txt parser
# ---------------------------------------------------------------------------

# PEP 508 version operators
_VERSION_OPS = ("==", "~=", "!=", ">=", "<=", ">", "<")

# Broad constraint: only >= or > with no upper bound (no == or <=/<)
_BROAD_RE = re.compile(r"^[a-zA-Z0-9_\-\.]+\s*(?:>=|>)[^,;]+$")

def _is_pinned(constraint: str | None) -> bool:
    """Return True if the constraint pins to an exact version."""
    if not constraint:
        return False
    return "==" in constraint or "~=" in constraint

def _is_broad(constraint: str | None) -> bool:
    """Return True if the constraint is overly broad (only lower bound)."""
    if not constraint:
        return False
    # Has >= or > but no == or <= or <
    has_lower = ">=" in constraint or (">=" not in constraint and ">" in constraint)
    has_upper = "<=" in constraint or "<" in constraint or "==" in constraint
    return has_lower and not has_upper


def _parse_requirements_txt(content: str) -> list[ParsedDependency]:
    """
    Parse a requirements.txt file.
    Does NOT install or execute anything.
    """
    deps: list[ParsedDependency] = []

    for raw_line in content.splitlines():
        line = raw_line.strip()

        # Skip comments and empty lines
        if not line or line.startswith("#"):
            continue

        # Skip options like -r, -c, --index-url, etc.
        if line.startswith("-"):
            continue

        # Skip URL-based requirements (e.g., git+https://...)
        if "://" in line or line.startswith("."):
            continue

        # Strip inline comments
        if " #" in line:
            line = line[: line.index(" #")].strip()

        # Strip environment markers (e.g., ; python_version >= "3.6")
        if ";" in line:
            line = line[: line.index(";")].strip()

        # Extract package name and constraint
        # e.g., "requests>=2.0,<3.0" → name="requests", constraint=">=2.0,<3.0"
        match = re.match(
            r"^([A-Za-z0-9_\-\.]+)\s*([><=!~][^#\s;]*)?",
            line,
        )
        if not match:
            continue

        pkg_name = match.group(1).strip()
        constraint = match.group(2).strip() if match.group(2) else None

        if not pkg_name:
            continue

        deps.append(ParsedDependency(
            raw_line=raw_line,
            package_name=pkg_name,
            version_constraint=constraint,
            is_pinned=_is_pinned(constraint),
            is_broad=_is_broad(constraint),
        ))

    return deps


def _parse_pyproject_toml(content: str) -> list[ParsedDependency]:
    """
    Parse a pyproject.toml file to extract dependencies.
    Supports [tool.poetry.dependencies] and [project] tables.
    Does NOT execute any code.
    """
    deps: list[ParsedDependency] = []

    try:
        import tomllib  # Python 3.11+
    except ImportError:
        try:
            import tomli as tomllib  # fallback
        except ImportError:
            # If tomllib is not available, do basic line-based parsing
            return _parse_pyproject_basic(content)

    try:
        data = tomllib.loads(content)
    except Exception:
        return _parse_pyproject_basic(content)

    # [project] dependencies (PEP 621)
    project_deps = data.get("project", {}).get("dependencies", [])
    for dep_str in project_deps:
        if isinstance(dep_str, str):
            parsed = _parse_pep508(dep_str)
            if parsed:
                deps.append(parsed)

    # [tool.poetry.dependencies]
    poetry_deps = data.get("tool", {}).get("poetry", {}).get("dependencies", {})
    for pkg, spec in poetry_deps.items():
        if pkg.lower() == "python":
            continue
        if isinstance(spec, str):
            constraint = spec if spec != "*" else None
            deps.append(ParsedDependency(
                raw_line=f"{pkg} = \"{spec}\"",
                package_name=pkg,
                version_constraint=constraint,
                is_pinned=_is_pinned(constraint),
                is_broad=_is_broad(constraint) or spec == "*",
            ))
        elif isinstance(spec, dict):
            version = spec.get("version", None)
            constraint = version if version and version != "*" else None
            deps.append(ParsedDependency(
                raw_line=f"{pkg} = {spec}",
                package_name=pkg,
                version_constraint=constraint,
                is_pinned=_is_pinned(constraint),
                is_broad=version == "*" or not version,
            ))

    return deps


def _parse_pep508(dep_str: str) -> ParsedDependency | None:
    """Parse a PEP 508 dependency string."""
    dep_str = dep_str.strip()
    if not dep_str:
        return None
    # Strip markers
    if ";" in dep_str:
        dep_str = dep_str[: dep_str.index(";")].strip()
    match = re.match(r"^([A-Za-z0-9_\-\.]+)\s*([><=!~][^#\s;]*)?", dep_str)
    if not match:
        return None
    pkg_name = match.group(1).strip()
    constraint = match.group(2).strip() if match.group(2) else None
    return ParsedDependency(
        raw_line=dep_str,
        package_name=pkg_name,
        version_constraint=constraint,
        is_pinned=_is_pinned(constraint),
        is_broad=_is_broad(constraint),
    )


def _parse_pyproject_basic(content: str) -> list[ParsedDependency]:
    """Fallback basic line parser for pyproject.toml without tomllib."""
    deps: list[ParsedDependency] = []
    in_deps = False
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("["):
            in_deps = "dependencies" in stripped.lower()
            continue
        if in_deps and stripped and not stripped.startswith("#"):
            # Try to extract quoted dependency strings
            quoted = re.findall(r'"([^"]+)"', stripped)
            for q in quoted:
                parsed = _parse_pep508(q)
                if parsed:
                    deps.append(parsed)
    return deps


# ---------------------------------------------------------------------------
# Security checks
# ---------------------------------------------------------------------------

def _check_version_pinning(result: DependencyScanResult) -> None:
    """Flag unpinned and broadly-constrained dependencies."""
    unpinned: list[str] = []
    broad: list[str] = []

    for dep in result.dependencies:
        if not dep.version_constraint:
            unpinned.append(dep.package_name)
        elif dep.is_broad:
            broad.append(f"{dep.package_name} ({dep.version_constraint})")

    result.unpinned_count = len(unpinned)
    result.broad_constraint_count = len(broad)

    if unpinned:
        _add_finding(
            result,
            RULE_UNPINNED_DEPENDENCY,
            description_override=(
                f"{len(unpinned)} unpinned dependencies detected. "
                "These packages will always install the latest available version, "
                "which may include supply-chain attacks or breaking changes."
            ),
            evidence="Unpinned packages:\n" + "\n".join(f"  - {p}" for p in unpinned[:20]),
        )

    if broad:
        _add_finding(
            result,
            RULE_BROAD_VERSION_RANGE,
            description_override=(
                f"{len(broad)} dependencies with overly broad version constraints detected. "
                "These allow a wide range of versions that may include vulnerable releases."
            ),
            evidence="Broad constraints:\n" + "\n".join(f"  - {p}" for p in broad[:20]),
        )


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            ins = prev_row[j + 1] + 1
            dlt = curr_row[j] + 1
            sub = prev_row[j] + (c1 != c2)
            curr_row.append(min(ins, dlt, sub))
        prev_row = curr_row
    return prev_row[-1]


def _normalize_pkg_name(name: str) -> str:
    """Normalize package name for comparison (lowercase, replace - and _ with -)."""
    return re.sub(r"[-_\.]+", "-", name.lower())


def _check_typosquatting(result: DependencyScanResult) -> None:
    """
    Heuristic check for typosquatting-like package names.

    This uses:
    1. Known typo lists for popular packages
    2. Levenshtein distance check (distance <= 2 from a popular package)
    3. Suspicious keyword detection
    4. Very short name detection

    IMPORTANT: This is a heuristic. It does NOT confirm malicious intent.
    """
    flagged_packages: set[str] = set()

    for dep in result.dependencies:
        pkg = dep.package_name
        pkg_lower = _normalize_pkg_name(pkg)

        # Check 1: Known typo list
        for canonical, typos in POPULAR_PACKAGES:
            normalized_typos = [_normalize_pkg_name(t) for t in typos]
            if pkg_lower in normalized_typos and pkg_lower != _normalize_pkg_name(canonical):
                if pkg not in flagged_packages:
                    flagged_packages.add(pkg)
                    _add_finding(
                        result,
                        RULE_SUSPICIOUS_PACKAGE_NAME,
                        description_override=(
                            RULE_SUSPICIOUS_PACKAGE_NAME.description_template.format(
                                package=pkg, known_package=canonical
                            )
                        ),
                        evidence=f"Package '{pkg}' closely resembles '{canonical}'",
                    )
                break

        if pkg in flagged_packages:
            continue

        # Check 2: Levenshtein distance from popular packages
        for canonical, _ in POPULAR_PACKAGES:
            norm_canonical = _normalize_pkg_name(canonical)
            norm_pkg = pkg_lower
            # Skip if same name
            if norm_pkg == norm_canonical:
                break
            # Only compare if similar length (within 3 chars)
            if abs(len(norm_pkg) - len(norm_canonical)) <= 3:
                dist = _levenshtein_distance(norm_pkg, norm_canonical)
                # Distance 1 or 2 is suspicious for packages of length > 4
                if 1 <= dist <= 2 and len(canonical) > 4:
                    if pkg not in flagged_packages:
                        flagged_packages.add(pkg)
                        _add_finding(
                            result,
                            RULE_SUSPICIOUS_PACKAGE_NAME,
                            description_override=(
                                RULE_SUSPICIOUS_PACKAGE_NAME.description_template.format(
                                    package=pkg, known_package=canonical
                                )
                            ),
                            evidence=(
                                f"Package '{pkg}' has edit distance {dist} from '{canonical}'"
                            ),
                        )
                    break

        if pkg in flagged_packages:
            continue

        # Check 3: Suspicious keyword in name
        for kw in SUSPICIOUS_NAME_KEYWORDS:
            if kw in pkg_lower:
                if pkg not in flagged_packages:
                    flagged_packages.add(pkg)
                    _add_finding(
                        result,
                        RULE_UNUSUAL_PACKAGE_NAME,
                        description_override=(
                            f"Package '{pkg}' contains suspicious keyword '{kw}'. "
                            "This is a heuristic indicator only."
                        ),
                        evidence=f"Package name contains keyword: '{kw}'",
                    )
                break

        if pkg in flagged_packages:
            continue

        # Check 4: Very short names (<=2 chars, unusual)
        if len(pkg) <= MIN_LEGITIMATE_NAME_LENGTH:
            _add_finding(
                result,
                RULE_UNUSUAL_PACKAGE_NAME,
                description_override=(
                    f"Package '{pkg}' has a very short name (<=2 characters). "
                    "Very short package names are unusual and may warrant verification."
                ),
                evidence=f"Package name: '{pkg}' (length={len(pkg)})",
            )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_dependency_file(storage_path: str | Path) -> DependencyScanResult:
    """
    Perform static security analysis on a dependency file.

    This function reads the file as text and performs lexical analysis.
    It does NOT install, import, or execute any dependencies.
    It does NOT make network requests.

    Args:
        storage_path: Path to the stored artifact file.

    Returns:
        DependencyScanResult with all findings and statistics.
    """
    storage_path = Path(storage_path)
    ext = storage_path.suffix.lower()
    file_size = storage_path.stat().st_size

    # Compute SHA-256
    h = hashlib.sha256()
    with open(storage_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    sha256 = h.hexdigest()

    result = DependencyScanResult(
        file_extension=ext,
        file_size=file_size,
        sha256=sha256,
        format_identified="UNKNOWN",
    )

    # --- Empty file check ---
    if file_size == 0:
        _add_finding(result, RULE_EMPTY_FILE)
        return result

    # --- Read content ---
    try:
        with open(storage_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except OSError as e:
        result.scan_error = str(e)
        return result

    # --- Determine format and parse ---
    try:
        filename_lower = storage_path.name.lower()
        if filename_lower.endswith(".toml") or "pyproject" in filename_lower:
            result.format_identified = "PYPROJECT_TOML"
            deps = _parse_pyproject_toml(content)
        else:
            # Default: requirements.txt format
            result.format_identified = "REQUIREMENTS_TXT"
            deps = _parse_requirements_txt(content)
    except Exception as e:
        result.scan_error = str(e)
        _add_finding(
            result,
            RULE_PARSE_ERROR,
            description_override=RULE_PARSE_ERROR.description_template.format(error=str(e)[:200]),
            evidence=str(e)[:500],
        )
        return result

    result.dependencies = deps
    result.dependency_count = len(deps)
    result.statistics["dependency_count"] = len(deps)

    # --- Security checks ---
    _check_version_pinning(result)
    _check_typosquatting(result)

    # Statistics summary
    result.statistics["unpinned_count"] = result.unpinned_count
    result.statistics["broad_constraint_count"] = result.broad_constraint_count
    result.statistics["packages"] = [
        {
            "name": d.package_name,
            "constraint": d.version_constraint,
            "pinned": d.is_pinned,
            "broad": d.is_broad,
        }
        for d in deps[:50]  # Limit for large files
    ]

    return result
