"""
AISecGuard — Known-vulnerability matching for dependency manifests (DEP-007)
Week 8.

Sources:
  1. The bundled reference list app/data/vulnerable_packages.json (always, offline).
  2. OSV.dev (https://osv.dev), only when settings.OSV_LOOKUP_ENABLED is true.
     A network failure never fails the scan; the offline list still applies.

Only exactly pinned versions (==, ===) are matched: an unpinned or ranged
requirement has no single version to look up and is already reported by
DEP-003 / DEP-004.
"""

from __future__ import annotations

import json
import re
import urllib.request
from functools import lru_cache
from pathlib import Path

from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.version import InvalidVersion, Version

from app.core.config import settings
from app.models.enums import FindingSeverity, FindingType
from app.scanners.base import Finding

RULE_ID = "DEP-007"
DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "vulnerable_packages.json"
OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"
OSV_VULN_URL = "https://api.osv.dev/v1/vulns/{}"
OSV_MAX_DETAILS = 5

_SEVERITY_ORDER = ["INFORMATIONAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
_OSV_SEVERITY = {"LOW": "LOW", "MODERATE": "MEDIUM", "MEDIUM": "MEDIUM", "HIGH": "HIGH", "CRITICAL": "CRITICAL"}
_OSV_CACHE: dict[tuple[str, str], list[dict]] = {}


def normalize_name(name: str) -> str:
    """PEP 503 normalisation: 'Scikit_Learn' and 'scikit-learn' are the same package."""
    return re.sub(r"[-_.]+", "-", name).lower()


def pinned_version(constraint: str | None) -> str | None:
    """Return the exact version for '==1.2.3' / '===1.2.3', else None."""
    if not constraint:
        return None
    match = re.fullmatch(r"\s*===?\s*([A-Za-z0-9_.!+\-]+)\s*", constraint)
    if not match or "*" in match.group(1):
        return None
    return match.group(1)


@lru_cache(maxsize=1)
def _offline_db() -> dict[str, list[dict]]:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return {normalize_name(name): entries for name, entries in data.get("packages", {}).items()}


def offline_matches(name: str, version: str) -> list[dict]:
    """Advisories from the bundled list whose affected range contains this version."""
    try:
        parsed = Version(version)
    except InvalidVersion:
        return []
    hits = []
    for entry in _offline_db().get(normalize_name(name), []):
        try:
            if parsed in SpecifierSet(entry["affected_versions"]):
                hits.append({
                    "id": entry["cve"],
                    "summary": entry["description"],
                    "severity": entry["severity"],
                    "reference": entry.get("reference"),
                    "affected": entry["affected_versions"],
                })
        except InvalidSpecifier:
            continue
    return hits


def _post_json(url: str, body: dict) -> dict:
    request = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(request, timeout=settings.OSV_TIMEOUT_SECONDS) as response:  # noqa: S310 (fixed https host)
        return json.loads(response.read().decode())


def _get_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=settings.OSV_TIMEOUT_SECONDS) as response:  # noqa: S310
        return json.loads(response.read().decode())


def _extract_cvss_score(detail: dict) -> tuple[str, str | None]:
    """Extract CVSS score/severity from OSV advisory detail."""
    # Check severity field for CVSS_V3
    cvss_score = None
    cvss_level = None
    for sev in detail.get("severity", []) or []:
        if isinstance(sev, dict) and sev.get("type") in ("CVSS_V3", "CVSS_V2"):
            score_str = str(sev.get("score", ""))
            cvss_score = score_str
            # Check if vector or numeric score
            if "/" in score_str:
                # Vector string like CVSS:3.1/AV:N/AC:L/...
                pass
            else:
                try:
                    num = float(score_str)
                    if num >= 9.0:
                        cvss_level = "CRITICAL"
                    elif num >= 7.0:
                        cvss_level = "HIGH"
                    elif num >= 4.0:
                        cvss_level = "MEDIUM"
                    else:
                        cvss_level = "LOW"
                except ValueError:
                    pass

    # Fallback to database_specific or ecosystem_specific
    raw = str((detail.get("database_specific") or {}).get("severity", "")).upper()
    level = cvss_level or _OSV_SEVERITY.get(raw, "MEDIUM")
    return level, cvss_score


def query_osv(packages: list[tuple[str, str]]) -> dict[tuple[str, str], list[dict]]:
    """Look up (name, version) pairs on OSV.dev with caching. Raises on network errors."""
    if not packages:
        return {}

    found: dict[tuple[str, str], list[dict]] = {}
    missing_packages: list[tuple[str, str]] = []

    # Check memory cache first
    for pair in packages:
        if pair in _OSV_CACHE:
            found[pair] = list(_OSV_CACHE[pair])
        else:
            missing_packages.append(pair)

    if not missing_packages:
        return found

    batch = _post_json(OSV_BATCH_URL, {
        "queries": [{"package": {"name": n, "ecosystem": "PyPI"}, "version": v} for n, v in missing_packages]
    })
    details_left = OSV_MAX_DETAILS
    for (name, version), result in zip(missing_packages, batch.get("results", [])):
        pair_hits: list[dict] = []
        for vuln in result.get("vulns", []) or []:
            vuln_id = vuln["id"]
            advisory = {
                "id": vuln_id,
                "summary": "See OSV advisory.",
                "severity": "MEDIUM",
                "aliases": [],
                "cve": None,
                "cvss": None,
            }
            if details_left > 0:
                details_left -= 1
                try:
                    detail = _get_json(OSV_VULN_URL.format(vuln_id))
                    advisory["summary"] = detail.get("summary") or detail.get("details", "")[:200] or advisory["summary"]
                    aliases = detail.get("aliases", [])
                    advisory["aliases"] = aliases
                    # Extract CVE identifier if present
                    cve_match = next((a for a in aliases if a.startswith("CVE-")), None)
                    if cve_match:
                        advisory["cve"] = cve_match
                    sev_level, cvss = _extract_cvss_score(detail)
                    advisory["severity"] = sev_level
                    advisory["cvss"] = cvss
                except Exception:
                    pass
            advisory["reference"] = f"https://osv.dev/vulnerability/{vuln_id}"
            pair_hits.append(advisory)

        _OSV_CACHE[(name, version)] = pair_hits
        found.setdefault((name, version), []).extend(pair_hits)

    return found


def find_known_vulnerabilities(dependencies) -> list[Finding]:
    """One DEP-007 finding per pinned package with at least one known advisory."""
    pinned = [
        (dep.package_name, version)
        for dep in dependencies
        if (version := pinned_version(dep.version_constraint))
    ]
    advisories: dict[tuple[str, str], list[dict]] = {pair: offline_matches(*pair) for pair in pinned}

    if settings.OSV_LOOKUP_ENABLED and pinned:
        try:
            online = query_osv(pinned)
        except Exception:
            online = {}  # offline list still applies; scans must not depend on the network
        for pair, extra in online.items():
            known = {a["id"] for a in advisories.get(pair, [])}
            for advisory in extra:
                if advisory["id"] in known or known & set(advisory.get("aliases", [])):
                    continue
                advisories.setdefault(pair, []).append(advisory)

    findings: list[Finding] = []
    for (name, version), hits in advisories.items():
        if not hits:
            continue
        worst = max((h["severity"] for h in hits), key=lambda s: _SEVERITY_ORDER.index(s) if s in _SEVERITY_ORDER else 2)
        lines = []
        for h in hits:
            id_label = f"{h['cve']} ({h['id']})" if h.get("cve") else h["id"]
            cvss_info = f" [CVSS: {h['cvss']}]" if h.get("cvss") else ""
            ref = f" [{h['reference']}]" if h.get("reference") else ""
            lines.append(f"{id_label} ({h['severity']}){cvss_info}: {h['summary']}{ref}")
        ranges = sorted({h["affected"] for h in hits if h.get("affected")})
        findings.append(Finding(
            rule_id=RULE_ID,
            finding_type=FindingType.KNOWN_VULNERABILITY,
            severity=FindingSeverity(worst),
            title=f"Known vulnerable version: {name} {version}",
            description=(
                f"{name}=={version} matches {len(hits)} published advisor{'y' if len(hits) == 1 else 'ies'}. "
                "Installing this version exposes the AI pipeline to the listed vulnerabilities."
            ),
            evidence="\n".join(lines)[:2000],
            recommendation=(
                f"Upgrade {name} to a version outside the affected range"
                + (f" ({', '.join(ranges)})" if ranges else "")
                + " and re-scan."
            ),
        ))
    return findings
