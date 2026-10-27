"""
AISecGuard — ML-BOM export (CycloneDX 1.6 JSON), Week 8

One BOM per artifact: the artifact itself as the main component (a
machine-learning-model, data or file component) with its SHA-256 and scan
results, its direct lineage parents, and for dependency manifests every
declared package with a purl plus the known vulnerabilities that apply.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.artifact import Artifact
from app.models.enums import ArtifactType
from app.scanners.dependency_scanner import scan_dependency_file
from app.scanners.dependency_scanner.vulnerabilities import normalize_name, offline_matches, pinned_version
from app.services.lineage_service import parents_of
from app.services.queries import baseline_provenance, latest_completed_scan, latest_signature

_COMPONENT_TYPE = {
    ArtifactType.MODEL.value: "machine-learning-model",
    ArtifactType.DATASET.value: "data",
    ArtifactType.DEPENDENCY.value: "file",
}


def _ref(artifact: Artifact) -> str:
    return f"artifact:{artifact.id}"


def _component(db: Session, artifact: Artifact, extra_props: dict | None = None) -> dict:
    scan = latest_completed_scan(db, artifact.id)
    signature = latest_signature(db, artifact.id)
    props = {
        "aisecguard:artifact_type": artifact.artifact_type,
        "aisecguard:status": artifact.status,
        "aisecguard:risk_level": scan.risk_level if scan else "UNKNOWN",
        "aisecguard:risk_score": str(scan.risk_score) if scan else "0",
        "aisecguard:finding_count": str(len(scan.findings)) if scan else "0",
        "aisecguard:signed": "true" if signature else "false",
    }
    if scan:
        props["aisecguard:scan_id"] = scan.id
    if signature:
        props["aisecguard:signature_key_id"] = signature.key_id
        props["aisecguard:signature_algorithm"] = signature.algorithm
    provenance = baseline_provenance(db, artifact.id)
    if provenance and provenance.source_url:
        props["aisecguard:source_url"] = provenance.source_url
    props.update(extra_props or {})
    return {
        "type": _COMPONENT_TYPE.get(artifact.artifact_type, "file"),
        "bom-ref": _ref(artifact),
        "name": artifact.original_filename,
        "hashes": [{"alg": "SHA-256", "content": artifact.sha256}],
        "properties": [{"name": k, "value": v} for k, v in props.items()],
    }


def _packages(artifact: Artifact) -> tuple[list[dict], list[dict]]:
    result = scan_dependency_file(Path(artifact.storage_path))
    components, vulnerabilities = [], []
    for dep in result.dependencies:
        name = normalize_name(dep.package_name)
        version = pinned_version(dep.version_constraint)
        purl = f"pkg:pypi/{name}@{version}" if version else f"pkg:pypi/{name}"
        component = {"type": "library", "bom-ref": purl, "name": name, "purl": purl}
        if version:
            component["version"] = version
        elif dep.version_constraint:
            component["properties"] = [{"name": "aisecguard:version_constraint", "value": dep.version_constraint}]
        components.append(component)
        for hit in offline_matches(name, version) if version else []:
            vulnerabilities.append({
                "bom-ref": f"vuln:{hit['id']}:{purl}",
                "id": hit["id"],
                "source": {"name": "NVD" if hit["id"].startswith("CVE-") else "OSV", "url": hit.get("reference")},
                "ratings": [{"severity": hit["severity"].lower()}],
                "description": hit["summary"],
                "affects": [{"ref": purl}],
            })
    return components, vulnerabilities


def build_mlbom(db: Session, artifact: Artifact) -> dict:
    components: list[dict] = []
    vulnerabilities: list[dict] = []
    depends_on: list[str] = []

    for edge in parents_of(db, artifact.id):
        parent = db.get(Artifact, edge.parent_id)
        if parent is None:
            continue
        components.append(_component(db, parent, {"aisecguard:lineage_relation": edge.relation}))
        depends_on.append(_ref(parent))

    if artifact.artifact_type == ArtifactType.DEPENDENCY.value and Path(artifact.storage_path).exists():
        packages, vulnerabilities = _packages(artifact)
        components.extend(packages)
        depends_on.extend(p["bom-ref"] for p in packages)

    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": {"components": [{"type": "application", "name": "AISecGuard", "version": settings.VERSION}]},
            "component": _component(db, artifact),
        },
        "components": components,
        "dependencies": [{"ref": _ref(artifact), "dependsOn": depends_on}],
        "vulnerabilities": vulnerabilities,
    }
