"""
AISecGuard — Compliance Evidence, Scorecard, and Model Cards (Roadmap Task 3)
Evaluation against EU AI Act (Regulation (EU) 2024/1689) Articles 10-15.

Provides an automated compliance scorecard:
  - Article 10: Data and Data Governance (Schema validation, Provenance, Outliers, Formula Injection)
  - Article 11: Technical Documentation (CycloneDX 1.5 ML-BOM)
  - Article 12: Record-Keeping (Immutable SHA-256 logs & timestamps)
  - Article 13: Transparency (Model cards & deployer instructions)
  - Article 14: Human Oversight (Analyst approval & quarantine actions)
  - Article 15: Accuracy, Robustness and Cybersecurity (Pickle RCE, OSV CVEs, Ed25519 signatures)
  - Quantitative score (0-100%) and compliance letter grade (A, B, C, F).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.enums import ArtifactType, RiskLevel
from app.models.lineage import LineageRelation
from app.models.quarantine_event import QuarantineEvent
from app.services.lineage_service import parents_of
from app.services.queries import baseline_provenance, latest_completed_scan, plain
from app.services.signing_service import verify_artifact

FRAMEWORK = "EU AI Act (Regulation (EU) 2024/1689)"
DISCLAIMER = (
    "Evidence mapping and automated audit checklist to prepare technical documentation "
    "for high-risk AI systems. This is a technical security assessment, not legal advice."
)
MET, PARTIAL, GAP, NA = "MET", "PARTIAL", "GAP", "NOT_APPLICABLE"


def _control(
    ref: str,
    title: str,
    status: str,
    evidence: list[str],
    action: str | None = None,
    article: str = "General",
) -> dict:
    return {
        "framework": FRAMEWORK,
        "ref": ref,
        "title": title,
        "article": article,
        "status": status,
        "evidence": evidence,
        "action": action,
    }


def compliance_report(db: Session, artifact: Artifact) -> dict:
    scan = latest_completed_scan(db, artifact.id)
    provenance = baseline_provenance(db, artifact.id)
    verification = verify_artifact(db, artifact)
    oversight_events = db.query(QuarantineEvent).filter(QuarantineEvent.artifact_id == artifact.id).count()
    kind = plain(artifact.artifact_type)
    controls: list[dict] = []

    # -------------------------------------------------------------------------
    # ARTICLE 10: DATA AND DATA GOVERNANCE
    # -------------------------------------------------------------------------
    if kind == ArtifactType.DEPENDENCY.value:
        controls.append(
            _control("Art. 10(2)", "Data and Data Governance", NA, ["Dependency manifests hold no training data."], article="Article 10")
        )
    elif kind == ArtifactType.DATASET.value:
        if scan is None:
            controls.append(_control("Art. 10(2)(a)", "Data Design Choices & Schema Integrity", GAP, [], "Execute dataset security scan.", article="Article 10"))
            controls.append(_control("Art. 10(2)(b)", "Data Provenance & Traceability", GAP, [], "Record data provenance source URL.", article="Article 10"))
            controls.append(_control("Art. 10(2)(c)", "Data Preparation & Anomaly Checks", GAP, [], "Perform statistical outlier and null value scan.", article="Article 10"))
            controls.append(_control("Art. 10(2)(f)", "Formula Injection & Poisoning Defenses", GAP, [], "Inspect table cells for formula injection payloads.", article="Article 10"))
        else:
            findings = scan.findings or []
            finding_rules = {f.rule_id for f in findings}

            # 10(2)(a) Schema
            schema_ok = not any(r in finding_rules for r in ("DATA-001", "DATA-002", "DATA-006"))
            controls.append(_control(
                "Art. 10(2)(a)",
                "Data Design Choices & Schema Integrity",
                MET if schema_ok else PARTIAL,
                [f"Dataset structural parsing: {'Clean' if schema_ok else 'Structural anomalies flagged'} (SHA-256 baseline verified)"],
                None if schema_ok else "Review dataset formatting issues.",
                article="Article 10",
            ))

            # 10(2)(b) Provenance
            if provenance and provenance.source_url:
                controls.append(_control(
                    "Art. 10(2)(b)",
                    "Data Provenance & Traceability",
                    MET,
                    [f"Source URL verified: {provenance.source_url}", f"Ingested hash: {provenance.sha256_hash[:16]}..."],
                    article="Article 10",
                ))
            else:
                controls.append(_control(
                    "Art. 10(2)(b)",
                    "Data Provenance & Traceability",
                    PARTIAL,
                    ["SHA-256 computed on upload, but origin URL is unrecorded"],
                    "Record the verified upstream source URL.",
                    article="Article 10",
                ))

            # 10(2)(c) Quality, Outliers, Nulls
            quality_ok = not any(r in finding_rules for r in ("DATA-003", "DATA-004", "DATA-005"))
            controls.append(_control(
                "Art. 10(2)(c)",
                "Data Preparation & Quality Assurance",
                MET if quality_ok else PARTIAL,
                [f"Statistical outlier & missing values pass: {'Clean' if quality_ok else 'High concentration of outliers or missing rows detected'}"],
                None if quality_ok else "Clean duplicate or extreme outlier records.",
                article="Article 10",
            ))

            # 10(2)(f) Formula Injection / Poisoning
            injection_free = "DATA-012" not in finding_rules
            controls.append(_control(
                "Art. 10(2)(f)",
                "Data Poisoning & Formula Injection Mitigation",
                MET if injection_free else GAP,
                [f"Cell-level formula injection pass (DATA-012): {'Clean (no executable cells)' if injection_free else 'DANGEROUS: Formula injection payload detected'}"],
                None if injection_free else "Sanitize formula injection characters (=, @, +, -) from table cells.",
                article="Article 10",
            ))
    else:
        # Model Artifact Lineage Checks for Art. 10
        training = [e for e in parents_of(db, artifact.id) if e.relation == LineageRelation.TRAINED_ON.value]
        scanned = [e for e in training if latest_completed_scan(db, e.parent_id)]
        if not training:
            controls.append(_control(
                "Art. 10",
                "Data and Data Governance",
                GAP,
                [],
                "Link training dataset(s) to this model in the Supply Chain Lineage explorer.",
                article="Article 10",
            ))
        else:
            names = [db.get(Artifact, e.parent_id).original_filename for e in training if db.get(Artifact, e.parent_id)]
            status = MET if len(scanned) == len(training) else PARTIAL
            controls.append(_control(
                "Art. 10",
                "Data and Data Governance",
                status,
                [f"Training lineage tracked: {', '.join(names)}", f"Scanned: {len(scanned)} of {len(training)} dataset(s)"],
                None if status == MET else "Scan every linked training dataset for full compliance.",
                article="Article 10",
            ))

    # -------------------------------------------------------------------------
    # ARTICLE 11: TECHNICAL DOCUMENTATION
    # -------------------------------------------------------------------------
    controls.append(_control(
        "Art. 11",
        "Technical Documentation (Annex IV)",
        MET if scan else GAP,
        ["Standardized ML-BOM (CycloneDX 1.5 JSON) and Model Card available for export"] if scan else [],
        None if scan else "Scan the artifact to generate complete technical documentation.",
        article="Article 11",
    ))

    # -------------------------------------------------------------------------
    # ARTICLE 12: RECORD-KEEPING
    # -------------------------------------------------------------------------
    if scan and provenance:
        controls.append(_control(
            "Art. 12",
            "Automatic Record-Keeping & Audit Trail",
            MET,
            [
                f"Ingestion event logged at {provenance.uploaded_at:%Y-%m-%d %H:%M} UTC with SHA-256 {provenance.sha256_hash[:16]}...",
                f"Scan record {scan.id[:8]}... permanently stored with {len(scan.findings)} security finding(s)",
            ],
            article="Article 12",
        ))
    else:
        controls.append(_control(
            "Art. 12",
            "Automatic Record-Keeping & Audit Trail",
            GAP,
            [],
            "Scan the artifact to register immutable record-keeping entries.",
            article="Article 12",
        ))

    # -------------------------------------------------------------------------
    # ARTICLE 13: TRANSPARENCY & INFORMATION TO DEPLOYERS
    # -------------------------------------------------------------------------
    controls.append(_control(
        "Art. 13",
        "Transparency & Information to Deployers",
        PARTIAL if scan else GAP,
        ["Structured model card datasheet automatically generated from zero-execution scan and lineage graph"] if scan else [],
        "Review model card intended use cases and operational constraints.",
        article="Article 13",
    ))

    # -------------------------------------------------------------------------
    # ARTICLE 14: HUMAN OVERSIGHT
    # -------------------------------------------------------------------------
    if verification.get("signed") or oversight_events:
        evidence = []
        if verification.get("signed"):
            evidence.append(f"Cryptographically approved and signed by analyst {verification['signature']['signed_by']}")
        if oversight_events:
            evidence.append(f"{oversight_events} human quarantine / release action(s) in audit log")
        controls.append(_control("Art. 14", "Human Oversight & Governance", MET, evidence, article="Article 14"))
    else:
        controls.append(_control(
            "Art. 14",
            "Human Oversight & Governance",
            PARTIAL if scan else GAP,
            [],
            "A security analyst should review and digitally sign or quarantine this artifact.",
            article="Article 14",
        ))

    # -------------------------------------------------------------------------
    # ARTICLE 15: ACCURACY, ROBUSTNESS AND CYBERSECURITY
    # -------------------------------------------------------------------------
    if scan is None:
        controls.append(_control("Art. 15", "Accuracy, Robustness and Cybersecurity", GAP, [], "Scan the artifact.", article="Article 15"))
        controls.append(_control("Art. 15(1)", "Structural Robustness & Fault Resilience", GAP, [], "Scan the artifact.", article="Article 15"))
        controls.append(_control("Art. 15(3)(a)", "Deserialization & Code Execution Defenses", GAP, [], "Scan the artifact.", article="Article 15"))
        controls.append(_control("Art. 15(3)(b)", "Supply Chain & Known CVE Protections", GAP, [], "Scan the artifact.", article="Article 15"))
        controls.append(_control("Art. 15(3)(c)", "Integrity Verification & Anti-Tampering", GAP, [], "Scan the artifact.", article="Article 15"))
    else:
        finding_rules = {f.rule_id for f in (scan.findings or [])}
        risk_lvl = plain(scan.risk_level)

        # 15 Overall Cybersecurity & Robustness
        has_critical = risk_lvl in (RiskLevel.HIGH.value, RiskLevel.CRITICAL.value)
        controls.append(_control(
            "Art. 15",
            "Accuracy, Robustness and Cybersecurity",
            GAP if has_critical else MET,
            [f"Latest scan risk {risk_lvl}: composite risk score {scan.risk_score}/100."],
            "Resolve high and critical security findings before deployment." if has_critical else None,
            article="Article 15",
        ))

        # 15(1) Structural Robustness
        controls.append(_control(
            "Art. 15(1)",
            "Structural Robustness & Fault Resilience",
            GAP if has_critical else MET,
            [f"Static zero-execution analysis: Composite risk is {risk_lvl} ({scan.risk_score}/100)"],
            "Resolve high and critical security findings before deployment." if has_critical else None,
            article="Article 15",
        ))

        # 15(3)(a) Deserialization & RCE
        rce_rules = {"MODEL-001", "MODEL-002", "MODEL-009", "MODEL-010", "MODEL-ZIP-001"}
        rce_flagged = any(r in finding_rules for r in rce_rules)
        controls.append(_control(
            "Art. 15(3)(a)",
            "Deserialization Exploits & RCE Defenses",
            GAP if rce_flagged else MET,
            [f"Opcode inspection & Zip Slip checks: {'RCE risks identified' if rce_flagged else 'Zero arbitrary execution opcodes detected'}"],
            "Eliminate unsafe serialization opcodes or remote code execution hooks." if rce_flagged else None,
            article="Article 15",
        ))

        # 15(3)(b) Supply Chain & Dependencies
        cve_flagged = any(r in finding_rules for r in ("DEP-007", "LIN-001"))
        controls.append(_control(
            "Art. 15(3)(b)",
            "Supply Chain & Vulnerability (CVE) Defenses",
            GAP if cve_flagged else MET,
            [f"OSV.dev / NVD vulnerability matching: {'Known vulnerable packages present' if cve_flagged else 'Zero unpatched CVEs found'}"],
            "Upgrade pinned packages to patched versions." if cve_flagged else None,
            article="Article 15",
        ))

        # 15(3)(c) Cryptographic Anti-Tampering
        if verification.get("valid"):
            controls.append(_control(
                "Art. 15(3)(c)",
                "Cryptographic Integrity & Anti-Tampering",
                MET,
                ["Ed25519 signature is valid: artifact byte-stream matches approved baseline"],
                article="Article 15",
            ))
        elif verification.get("signed"):
            controls.append(_control(
                "Art. 15(3)(c)",
                "Cryptographic Integrity & Anti-Tampering",
                GAP,
                ["Signature invalid: artifact bytes have diverged from approved signature"],
                "Re-scan and re-approve the modified artifact.",
                article="Article 15",
            ))
        else:
            controls.append(_control(
                "Art. 15(3)(c)",
                "Cryptographic Integrity & Anti-Tampering",
                PARTIAL,
                ["Upload SHA-256 verified, but artifact lacks analyst Ed25519 digital signature"],
                "Sign the artifact to prove cryptographic immutability.",
                article="Article 15",
            ))

    # -------------------------------------------------------------------------
    # COMPLIANCE SCORECARD CALCULATION
    # -------------------------------------------------------------------------
    applicable = [c for c in controls if c["status"] != NA]
    if applicable:
        points = sum(100 if c["status"] == MET else 50 if c["status"] == PARTIAL else 0 for c in applicable)
        score = round(points / len(applicable))
    else:
        score = 0

    if score >= 90:
        grade = "A"
        overall_status = "FULLY_COMPLIANT"
    elif score >= 75:
        grade = "B"
        overall_status = "SUBSTANTIALLY_COMPLIANT"
    elif score >= 50:
        grade = "C"
        overall_status = "PARTIALLY_COMPLIANT"
    else:
        grade = "F"
        overall_status = "NON_COMPLIANT"

    # Article 10 and Article 15 Sub-Statuses
    art10_controls = [c for c in controls if c["article"] == "Article 10" and c["status"] != NA]
    art15_controls = [c for c in controls if c["article"] == "Article 15" and c["status"] != NA]

    def _calc_sub_status(items: list[dict]) -> str:
        if not items:
            return "NOT_APPLICABLE"
        if all(i["status"] == MET for i in items):
            return "COMPLIANT"
        if any(i["status"] == GAP for i in items):
            return "NON_COMPLIANT"
        return "PARTIAL"

    summary = {key: sum(1 for c in controls if c["status"] == key) for key in (MET, PARTIAL, GAP, NA)}
    actions = [c["action"] for c in controls if c.get("action")]

    return {
        "artifact_id": artifact.id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "framework": FRAMEWORK,
        "score": score,
        "grade": grade,
        "overall_status": overall_status,
        "article_10_status": _calc_sub_status(art10_controls),
        "article_15_status": _calc_sub_status(art15_controls),
        "summary": summary,
        "controls": controls,
        "action_items": actions,
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

    lines = [
        f"# {_CARD_TITLE.get(plain(artifact.artifact_type), 'Card')}: {artifact.original_filename}",
        "",
        f"_Generated automatically by AISecGuard on {today}._",
        "",
        "## Compliance Scorecard (EU AI Act)",
        "",
        f"- **Compliance Score**: **{report['score']}%** (Grade {report['grade']})",
        f"- **Overall Status**: `{report['overall_status']}`",
        f"- **Article 10 (Data & Governance)**: `{report['article_10_status']}`",
        f"- **Article 15 (Robustness & Cybersecurity)**: `{report['article_15_status']}`",
        "",
        "## Overview",
        "",
        "| Field | Value |",
        "| --- | --- |",
        f"| Artifact type | {plain(artifact.artifact_type)} |",
        f"| File Size | {artifact.file_size:,} bytes |",
        f"| SHA-256 | `{artifact.sha256}` |",
        f"| Latest Risk | {plain(scan.risk_level) if scan else 'UNSCANNED'} ({scan.risk_score if scan else 0}/100) |",
        f"| Digital Signature | {'Signed & Valid' if verification.get('valid') else 'Unsigned' if not verification.get('signed') else 'Invalid'} |",
    ]
    if provenance and provenance.source_url:
        lines.append(f"| Source URL | {provenance.source_url} |")

    lines.extend([
        "",
        "## Intended use",
        "",
        "Operational boundaries and intended application scope for high-risk compliance.",
        "",
    ])

    if scan and scan.findings:
        lines.extend([
            "## Security Findings",
            "",
        ])
        for f in scan.findings:
            lines.append(f"- **{f.rule_id}** [{plain(f.severity)}]: {f.title}")
        lines.append("")

    lines.extend([
        "## Audit Checklist",
        "",
    ])

    for c in report["controls"]:
        lines.append(f"### {c['ref']} - {c['title']} (`{c['status']}`)")
        for ev in c["evidence"]:
            lines.append(f"- {ev}")
        if c.get("action"):
            lines.append(f"- **Recommended Remediation**: {c['action']}")
        lines.append("")

    return "\n".join(lines)
