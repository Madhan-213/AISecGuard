"""
AISecGuard — Data lineage engine (Week 8)

Artifacts are linked parent → child (dataset → model, model → fine-tuned model,
dataset → derived dataset, dependency manifest → model). The links form a
directed acyclic graph that the scan pipeline uses for two checks:

  LIN-001   an upstream artifact is quarantined or was scanned HIGH/CRITICAL
  DATA-012  a derived dataset added or removed columns compared with its parent
  DATA-013  a derived dataset's row count changed by more than half
  DATA-014  a label-like column's class distribution shifted (possible poisoning)
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.enums import ArtifactStatus, ArtifactType, FindingSeverity, FindingType, RiskLevel
from app.models.lineage import LineageEdge, LineageRelation
from app.scanners.base import Finding
from app.services.queries import latest_completed_scan, latest_signature, plain

# relation → (parent type, child type)
ALLOWED_RELATIONS: dict[LineageRelation, tuple[ArtifactType, ArtifactType]] = {
    LineageRelation.DERIVED_FROM: (ArtifactType.DATASET, ArtifactType.DATASET),
    LineageRelation.TRAINED_ON: (ArtifactType.DATASET, ArtifactType.MODEL),
    LineageRelation.FINE_TUNED_FROM: (ArtifactType.MODEL, ArtifactType.MODEL),
    LineageRelation.DEPENDS_ON: (ArtifactType.DEPENDENCY, ArtifactType.MODEL),
}

MAX_GRAPH_NODES = 50
MAX_UPSTREAM_DEPTH = 5
ROW_CHANGE_THRESHOLD = 0.5      # DATA-013: more than 50 % more or fewer rows
LABEL_SHIFT_THRESHOLD = 0.2     # DATA-014: total variation distance between class distributions
_RISKY_LEVELS = {RiskLevel.HIGH.value, RiskLevel.CRITICAL.value}


class LineageError(ValueError):
    """A link request that breaks a lineage rule (wrong types, cycle, self-link)."""


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

def parents_of(db: Session, artifact_id: str) -> list[LineageEdge]:
    return db.query(LineageEdge).filter(LineageEdge.child_id == artifact_id).all()


def children_of(db: Session, artifact_id: str) -> list[LineageEdge]:
    return db.query(LineageEdge).filter(LineageEdge.parent_id == artifact_id).all()


def _reachable(db: Session, start_id: str, downstream: bool, limit: int = MAX_GRAPH_NODES) -> list[LineageEdge]:
    """Breadth-first walk; returns the edges visited."""
    seen, edges, queue = {start_id}, [], deque([start_id])
    while queue and len(seen) < limit:
        current = queue.popleft()
        for edge in (children_of(db, current) if downstream else parents_of(db, current)):
            edges.append(edge)
            nxt = edge.child_id if downstream else edge.parent_id
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return edges


def validate_link(db: Session, parent: Artifact, child: Artifact, relation: LineageRelation) -> None:
    if parent.id == child.id:
        raise LineageError("An artifact cannot be linked to itself.")
    parent_type, child_type = ALLOWED_RELATIONS[relation]
    if (parent.artifact_type, child.artifact_type) != (parent_type.value, child_type.value):
        raise LineageError(
            f"{relation.value} links a {parent_type.value} (parent) to a {child_type.value} (child); "
            f"got {plain(parent.artifact_type)} → {plain(child.artifact_type)}."
        )
    downstream_of_child = {e.child_id for e in _reachable(db, child.id, downstream=True)}
    if parent.id in downstream_of_child:
        raise LineageError("This link would create a cycle: the parent is already downstream of the child.")


def _node(db: Session, artifact: Artifact) -> dict:
    scan = latest_completed_scan(db, artifact.id)
    return {
        "id": artifact.id,
        "name": artifact.original_filename,
        "artifact_type": artifact.artifact_type,
        "status": artifact.status,
        "sha256": artifact.sha256,
        "risk_level": scan.risk_level if scan else None,
        "signed": latest_signature(db, artifact.id) is not None,
    }


def _edge(edge: LineageEdge) -> dict:
    return {
        "id": edge.id,
        "parent_id": edge.parent_id,
        "child_id": edge.child_id,
        "relation": edge.relation,
        "note": edge.note,
        "created_by": edge.created_by,
        "created_at": edge.created_at,
    }


def lineage_graph(db: Session, artifact: Artifact) -> dict:
    edges = {e.id: e for e in _reachable(db, artifact.id, downstream=False) + _reachable(db, artifact.id, downstream=True)}
    node_ids = {artifact.id} | {e.parent_id for e in edges.values()} | {e.child_id for e in edges.values()}
    nodes = [_node(db, a) for a in db.query(Artifact).filter(Artifact.id.in_(node_ids)).all()]
    return {"root_id": artifact.id, "nodes": nodes, "edges": [_edge(e) for e in edges.values()]}


# ---------------------------------------------------------------------------
# Scan-time checks
# ---------------------------------------------------------------------------

def _upstream_risk(db: Session, artifact: Artifact) -> list[Finding]:
    risky = []
    seen = {artifact.id}
    frontier = [artifact.id]
    for depth in range(1, MAX_UPSTREAM_DEPTH + 1):
        next_frontier = []
        for current in frontier:
            for edge in parents_of(db, current):
                if edge.parent_id in seen:
                    continue
                seen.add(edge.parent_id)
                next_frontier.append(edge.parent_id)
                parent = db.get(Artifact, edge.parent_id)
                if parent is None:
                    continue
                scan = latest_completed_scan(db, parent.id)
                if parent.status == ArtifactStatus.QUARANTINED.value:
                    risky.append(f"{parent.original_filename} ({edge.relation}, {depth} hop(s) up): QUARANTINED")
                elif scan and scan.risk_level in _RISKY_LEVELS:
                    risky.append(f"{parent.original_filename} ({edge.relation}, {depth} hop(s) up): risk {plain(scan.risk_level)}")
        frontier = next_frontier
    if not risky:
        return []
    return [Finding(
        rule_id="LIN-001",
        finding_type=FindingType.UPSTREAM_RISK,
        severity=FindingSeverity.HIGH,
        title="Built from a quarantined or high-risk upstream artifact",
        description=(
            "At least one artifact this one was trained on, fine-tuned from or derived from is "
            "quarantined or scored HIGH/CRITICAL. Problems in upstream data or models carry into "
            "everything built from them."
        ),
        evidence="\n".join(risky[:10]),
        recommendation=(
            "Review the upstream artifacts first. Retrain or rebuild from clean inputs before "
            "approving this artifact."
        ),
    )]


def _label_columns(df) -> list:
    limit = max(10, len(df) * 0.05)
    cols = []
    for col in df.columns:
        try:
            if 2 <= df[col].nunique() <= limit:
                cols.append(col)
        except Exception:
            continue
    return cols


def _distribution(series) -> dict[str, float]:
    return {str(k): float(v) for k, v in series.value_counts(normalize=True).items()}


def diff_datasets(parent_path: Path, child_path: Path, parent_name: str) -> list[Finding]:
    from app.scanners.dataset_scanner import read_dataset

    parent_df, child_df = read_dataset(parent_path), read_dataset(child_path)
    findings: list[Finding] = []

    parent_cols, child_cols = set(map(str, parent_df.columns)), set(map(str, child_df.columns))
    added, removed = sorted(child_cols - parent_cols), sorted(parent_cols - child_cols)
    if added or removed:
        findings.append(Finding(
            rule_id="DATA-012",
            finding_type=FindingType.STRUCTURAL_ANOMALY,
            severity=FindingSeverity.MEDIUM,
            title="Schema changed from the parent dataset",
            description=f"Columns were added or removed compared with '{parent_name}'.",
            evidence=f"Added: {', '.join(added) or 'none'}\nRemoved: {', '.join(removed) or 'none'}",
            recommendation="Confirm the schema change was intended and documented in the transformation note.",
        ))

    if len(parent_df) and abs(len(child_df) - len(parent_df)) / len(parent_df) > ROW_CHANGE_THRESHOLD:
        findings.append(Finding(
            rule_id="DATA-013",
            finding_type=FindingType.STRUCTURAL_ANOMALY,
            severity=FindingSeverity.LOW,
            title="Row count changed sharply from the parent dataset",
            description=f"The row count changed by more than {int(ROW_CHANGE_THRESHOLD * 100)}% compared with '{parent_name}'.",
            evidence=f"Parent rows: {len(parent_df)}\nThis version: {len(child_df)}",
            recommendation="Check that rows were not dropped or injected unintentionally.",
        ))

    common = [c for c in _label_columns(child_df) if c in set(_label_columns(parent_df))]
    for col in common[:3]:
        before, after = _distribution(parent_df[col]), _distribution(child_df[col])
        tvd = 0.5 * sum(abs(before.get(k, 0.0) - after.get(k, 0.0)) for k in set(before) | set(after))
        if tvd >= LABEL_SHIFT_THRESHOLD:
            fmt = lambda d: ", ".join(f"{k}={v:.0%}" for k, v in sorted(d.items()))  # noqa: E731
            findings.append(Finding(
                rule_id="DATA-014",
                finding_type=FindingType.DATA_POISONING_INDICATOR,
                severity=FindingSeverity.MEDIUM,
                title=f"Class distribution shifted in column '{col}'",
                description=(
                    f"The distribution of '{col}' moved by {tvd:.0%} (total variation distance) compared with "
                    f"'{parent_name}'. Label flipping or targeted row injection produce exactly this signal."
                ),
                evidence=f"Column: {col}\nParent: {fmt(before)}\nThis version: {fmt(after)}\nShift: {tvd:.2f}",
                recommendation="Compare the changed rows with the parent and confirm every relabelling was intended.",
            ))
    return findings


def run_lineage_checks(db: Session, artifact: Artifact, storage_path: Path) -> list[Finding]:
    findings = _upstream_risk(db, artifact)
    if artifact.artifact_type == ArtifactType.DATASET.value:
        for edge in parents_of(db, artifact.id)[:3]:
            if edge.relation != LineageRelation.DERIVED_FROM.value:
                continue
            parent = db.get(Artifact, edge.parent_id)
            if parent is None or not Path(parent.storage_path).exists():
                continue
            try:
                findings.extend(diff_datasets(Path(parent.storage_path), storage_path, parent.original_filename))
            except Exception:
                continue  # an unreadable parent is reported by its own scan, not here
    return findings
