"""
AISecGuard — Compliance evidence and model cards (Week 8)

Maps what AISecGuard has recorded about an artifact onto the EU AI Act
(Regulation (EU) 2024/1689) obligations for high-risk AI systems, Articles 10-15.
Each control is MET, PARTIAL, GAP or NOT_APPLICABLE with the evidence behind it.

This is evidence for preparing documentation, not a legal assessment.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.enums import ArtifactType, RiskLevel
from app.models.lineage import LineageRelation
from app.models.quarantine_event import QuarantineEvent
from app.services.lineage_service import children_of, parents_of
from app.services.queries import baseline_provenance, latest_completed_scan, plain
from app.services.signing_service import verify_artifact

FRAMEWORK = "EU AI Act (Regulation (EU) 2024/1689)"
DISCLAIMER = (
    "Evidence mapping to help prepare technical documentation for high-risk AI systems. "
    "It is not legal advice and not a conformity assessment."
)
MET, PARTIAL, GAP, NA = "MET", "PARTIAL", "GAP", "NOT_APPLICABLE"


def _control(ref: str, title: str, status: str, evidence: list[str], action: str | None = None) -> dict:
    return {"framework": FRAMEWORK, "ref": ref, "title": title, "status": status, "evidence": evidence, "action": action}


def compliance_report(db: Session, artifact: Artifact) -> dict:
    scan = latest_completed_scan(db, artifact.id)
    provenance = baseline_provenance(db, artifact.id)
    verification = verify_artifact(db, artifact)
    oversight_events = db.query(QuarantineEvent).filter(QuarantineEvent.artifact_id == artifact.id).count()
    kind = plain(artifact.artifact_type)
    controls = []

    # Art. 10 — data and data governance
    if kind == ArtifactType.DEPENDENCY.value:
        controls.append(_control("Art. 10", "Data and data governance", NA, ["Dependency manifests hold no training data."]))
    elif kind == ArtifactType.DATASET.value:
        if scan is None:
            controls.append(_control("Art. 10", "Data and data governance", GAP, [], "Scan the dataset."))
        elif provenance and provenance.source_url:
            controls.append(_control("Art. 10", "Data and data governance", MET, [
                f"Dataset scanned: risk {plain(scan.risk_level)}", f"Source recorded: {provenance.source_url}",
            ]))
        else:
            controls.append(_control("Art. 10", "Data and data governance", PARTIAL,
                                     [f"Dataset scanned: risk {plain(scan.risk_level)}"], "Record where the data came from (source URL)."))
    else:
        training = [e for e in parents_of(db, artifact.id) if e.relation == LineageRelation.TRAINED_ON.value]
        scanned = [e for e in training if latest_completed_scan(db, e.parent_id)]
        if not training:
            controls.append(_control("Art. 10", "Data and data governance", GAP, [],
                                     "Link the training dataset(s) to this model in the lineage view."))
        else:
            names = [db.get(Artifact, e.parent_id).original_filename for e in training]
            status = MET if len(scanned) == len(training) else PARTIAL
            controls.append(_control("Art. 10", "Data and data governance", status,
                                     [f"Training data linked: {', '.join(names)}", f"{len(scanned)} of {len(training)} scanned"],
                                     None if status == MET else "Scan every linked training dataset."))

    # Art. 11 — technical documentation
    controls.append(_control("Art. 11", "Technical documentation (Annex IV)", MET if scan else GAP,
                             ["ML-BOM (CycloneDX 1.6) and model card can be generated from the stored scan"] if scan else [],
                             None if scan else "Scan the artifact so documentation can be generated."))

    # Art. 12 — record-keeping
    if scan and provenance:
        controls.append(_control("Art. 12", "Record-keeping", MET, [
            f"Upload recorded {provenance.uploaded_at:%Y-%m-%d} with SHA-256 {provenance.sha256_hash[:16]}…",
            f"Scan {scan.id} stored with {len(scan.findings)} finding(s)",
        ]))
    else:
        controls.append(_control("Art. 12", "Record-keeping", GAP, [], "Scan the artifact to create a scan record."))

    # Art. 13 — transparency
    controls.append(_control("Art. 13", "Transparency and information to deployers", PARTIAL if scan else GAP,
                             ["Model card generated automatically from scan and lineage data"] if scan else [],
                             "Complete the model card's intended use and limitations sections."))

    # Art. 14 — human oversight
    if verification["signed"] or oversight_events:
        evidence = []
        if verification["signed"]:
            evidence.append(f"Approved and signed by {verification['signature']['signed_by']}")
        if oversight_events:
            evidence.append(f"{oversight_events} quarantine/release decision(s) in the audit log")
        controls.append(_control("Art. 14", "Human oversight", MET, evidence))
    else:
        controls.append(_control("Art. 14", "Human oversight", PARTIAL if scan else GAP, [],
                                 "An analyst should approve (sign) or quarantine the artifact."))

    # Art. 15 — accuracy, robustness and cybersecurity
    if scan is None:
        controls.append(_control("Art. 15", "Accuracy, robustness and cybersecurity", GAP, [], "Scan the artifact."))
    elif scan.risk_level in (RiskLevel.HIGH.value, RiskLevel.CRITICAL.value):
        controls.append(_control("Art. 15", "Accuracy, robustness and cybersecurity", GAP,
                                 [f"Latest scan risk {plain(scan.risk_level)}"], "Resolve the HIGH/CRITICAL findings."))
    else:
        evidence = [f"Latest scan risk {plain(scan.risk_level)}"]
        if verification["valid"]:
            evidence.append("Signature valid: file unchanged since approval")
        if kind == ArtifactType.MODEL.value:
            status, action = PARTIAL, "Adversarial robustness testing is not performed by AISecGuard yet."
        elif verification["valid"]:
            status, action = MET, None
        else:
            status, action = PARTIAL, "Sign the artifact to prove it is unchanged."
        controls.append(_control("Art. 15", "Accuracy, robustness and cybersecurity", status, evidence, action))

    summary = {key: sum(1 for c in controls if c["status"] == key) for key in (MET, PARTIAL, GAP, NA)}
    return {
        "artifact_id": artifact.id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "framework": FRAMEWORK,
        "controls": controls,
        "summary": summary,
        "disclaimer": DISCLAIMER,
    }


_CARD_TITLE = {
    ArtifactType.MODEL.value: "Model card",
    ArtifactType.DATASET.value: "Datasheet",
    ArtifactType.DEPENDENCY.value: "Component card",
}


def model_card_markdown(db: Session, artifact: Artifact) -> str:
    scan = latest_completed_scan(db, artifact.id)
    provenance = baseline_provenance(db, artifact.id)
    verification = verify_artifact(db, artifact)
    report = compliance_report(db, artifact)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def name(artifact_id: str) -> str:
        other = db.get(Artifact, artifact_id)
        return other.original_filename if other else artifact_id

    lines = [
        f"# {_CARD_TITLE.get(plain(artifact.artifact_type), 'Card')}: {artifact.original_filename}",
        "",
        f"_Generated by AISecGuard on {today}. Sections marked **TODO** must be completed by the owner._",
        "",
        "## Overview",
        "",
        "| Field | Value |",
        "| --- | --- |",
        f"| Artifact type | {plain(artifact.artifact_type)} |",
        f"| File size | {artifact.file_size:,} bytes |",
        f"| SHA-256 | `{artifact.sha256}` |",
        f"| Uploaded | {artifact.uploaded_at:%Y-%m-%d %H:%M} UTC |",
        f"| Source | {provenance.source_url if provenance and provenance.source_url else 'not recorded'} |",
        f"| Status | {plain(artifact.status)} |",
        f"| Signature | {'valid' if verification['valid'] else ('INVALID: ' + '; '.join(verification['reasons']) if verification['signed'] else 'not signed')} |",
        "",
        "## Intended use",
        "",
        "**TODO:** describe the task, the intended users and uses that are out of scope.",
        "",
        "## Lineage",
        "",
    ]
    parents, children = parents_of(db, artifact.id), children_of(db, artifact.id)
    if not parents and not children:
        lines.append("No lineage recorded. Link training data and base models in the lineage view.")
    for edge in parents:
        lines.append(f"- {edge.relation.replace('_', ' ').lower()} **{name(edge.parent_id)}**" + (f" ({edge.note})" if edge.note else ""))
    for edge in children:
        lines.append(f"- used by **{name(edge.child_id)}** ({edge.relation.replace('_', ' ').lower()})")

    lines += ["", "## Security assessment", ""]
    if scan is None:
        lines.append("Not scanned yet.")
    else:
        lines += [
            f"Latest scan on {scan.completed_at:%Y-%m-%d}: risk **{plain(scan.risk_level)}** ({scan.risk_score} points), "
            f"{len(scan.findings)} finding(s).",
            "",
        ]
        if scan.findings:
            lines += ["| Rule | Severity | Finding |", "| --- | --- | --- |"]
            lines += [f"| {f.rule_id or '-'} | {plain(f.severity)} | {f.title} |" for f in scan.findings]

    lines += [
        "",
        "## Limitations and risks",
        "",
        "- AISecGuard analyses files statically; a clean scan does not prove the artifact is safe.",
        "- Adversarial robustness and backdoor behaviour were not tested.",
        "- **TODO:** known performance limits, biases and failure modes.",
        "",
        "## Compliance evidence",
        "",
        f"{FRAMEWORK}: "
        + ", ".join(f"{count} {status.lower().replace('_', ' ')}" for status, count in report["summary"].items() if count),
        "",
        "| Article | Obligation | Status |",
        "| --- | --- | --- |",
    ]
    lines += [f"| {c['ref']} | {c['title']} | {c['status']} |" for c in report["controls"]]
    lines += ["", f"_{DISCLAIMER}_", ""]
    return "\n".join(lines)
