"""
AISecGuard — Dataset Security Scanner (Static Analysis Only) — Week 4

=============================================================================
CRITICAL SAFETY RULES:
  - This scanner NEVER executes dataset content.
  - NEVER evaluates Python expressions from dataset values.
  - NEVER deserializes untrusted objects.
  - Parquet files are read using pyarrow (safe schema read) — NO pickle.
  - All analysis is performed on data values, not code execution.
=============================================================================

Supported formats:
  .csv    — Comma-separated values (read with pandas read_csv)
  .json   — JSON array or object (read with pandas read_json)
  .jsonl  — JSON Lines (read with pandas read_json lines=True)
  .parquet — Parquet columnar format (read with pandas read_parquet)

ACADEMIC DISCLAIMER:
  All findings are heuristic indicators.
  A finding does NOT guarantee the dataset is malicious or poisoned.
  Results must be interpreted by a qualified security analyst.
"""

from __future__ import annotations

import io
import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.models.enums import ArtifactType, FindingType, FindingSeverity
from app.scanners.base import Finding, Scanner

from .rules import (
    RULE_FILE_EMPTY,
    RULE_FILE_MALFORMED,
    RULE_NO_ROWS,
    RULE_SINGLE_COLUMN,
    RULE_CONSTANT_COLUMN,
    RULE_SUSPICIOUS_COLUMN_NAMES,
    RULE_HIGH_DUPLICATE_RATE,
    RULE_EXTREME_NUMERICAL_VALUES,
    RULE_ABNORMAL_CLASS_DISTRIBUTION,
    RULE_HIGH_MISSING_VALUES,
    RULE_ALL_MISSING,
    DUPLICATE_RATE_THRESHOLD_PCT,
    OUTLIER_STD_THRESHOLD,
    CLASS_IMBALANCE_THRESHOLD_PCT,
    HIGH_MISSING_THRESHOLD_PCT,
    SUSPICIOUS_COL_PREFIXES,
)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

# Kept as an alias so existing callers keep working.
DatasetFinding = Finding


@dataclass
class DatasetScanResult:
    """Result returned by the dataset scanner."""
    file_extension: str
    file_size: int
    sha256: str
    format_identified: str
    row_count: int = 0
    column_count: int = 0
    column_names: list[str] = field(default_factory=list)
    findings: list[DatasetFinding] = field(default_factory=list)
    statistics: dict[str, Any] = field(default_factory=dict)
    scan_error: str | None = None


# ---------------------------------------------------------------------------
# Helper: add finding from rule
# ---------------------------------------------------------------------------

def _add_finding(
    result: DatasetScanResult,
    rule,
    description_override: str | None = None,
    evidence: str | None = None,
) -> None:
    """Append a DatasetFinding to the result using a rule definition."""
    result.findings.append(DatasetFinding(
        rule_id=rule.rule_id,
        finding_type=rule.finding_type,
        severity=rule.severity,
        title=rule.title,
        description=description_override or rule.description_template,
        evidence=evidence,
        recommendation=rule.recommendation,
    ))


# ---------------------------------------------------------------------------
# Format readers
# ---------------------------------------------------------------------------

def _read_csv(data: bytes) -> "pd.DataFrame":
    """Read CSV from bytes — never execute content."""
    import pandas as pd
    return pd.read_csv(io.BytesIO(data), low_memory=False)


def _read_json(data: bytes) -> "pd.DataFrame":
    """Read JSON from bytes."""
    import pandas as pd
    return pd.read_json(io.BytesIO(data))


def _read_jsonl(data: bytes) -> "pd.DataFrame":
    """Read JSON Lines from bytes."""
    import pandas as pd
    return pd.read_json(io.BytesIO(data), lines=True)


def _read_parquet(data: bytes) -> "pd.DataFrame":
    """Read Parquet from bytes using pyarrow — safe schema read."""
    import pandas as pd
    return pd.read_parquet(io.BytesIO(data))


_READERS = {".csv": _read_csv, ".json": _read_json, ".jsonl": _read_jsonl, ".parquet": _read_parquet}


def read_dataset(path: str | Path) -> "pd.DataFrame":
    """Load a supported dataset file into a DataFrame (static read; nothing is evaluated)."""
    path = Path(path)
    reader = _READERS.get(path.suffix.lower())
    if reader is None:
        raise ValueError(f"Unsupported dataset extension: {path.suffix!r}")
    return reader(path.read_bytes())


# ---------------------------------------------------------------------------
# Analysis: structural checks
# ---------------------------------------------------------------------------

def _check_structure(result: DatasetScanResult, df: "pd.DataFrame") -> None:
    """Check dataset structure for anomalies."""
    n_rows, n_cols = df.shape
    result.row_count = n_rows
    result.column_count = n_cols
    result.column_names = list(df.columns.astype(str))

    # No data rows
    if n_rows == 0:
        _add_finding(result, RULE_NO_ROWS, evidence=f"Columns: {result.column_names}")
        return  # No further analysis possible

    # Single column
    if n_cols == 1:
        _add_finding(result, RULE_SINGLE_COLUMN, evidence=f"Columns: {result.column_names}")

    # Suspicious column names (CSV injection patterns)
    suspicious_cols = [
        c for c in result.column_names
        if str(c).strip().startswith(SUSPICIOUS_COL_PREFIXES)
    ]
    if suspicious_cols:
        _add_finding(
            result,
            RULE_SUSPICIOUS_COLUMN_NAMES,
            evidence=f"Suspicious column names: {suspicious_cols[:10]}",
        )

    # Constant-value columns
    constant_cols = []
    for col in df.columns:
        try:
            if df[col].nunique(dropna=False) <= 1:
                constant_cols.append(str(col))
        except Exception:
            pass
    if constant_cols:
        _add_finding(
            result,
            RULE_CONSTANT_COLUMN,
            evidence=f"Constant columns: {constant_cols[:10]}",
        )


# ---------------------------------------------------------------------------
# Analysis: missing value checks
# ---------------------------------------------------------------------------

def _check_missing_values(result: DatasetScanResult, df: "pd.DataFrame") -> None:
    """Check for high missing value rates."""
    if result.row_count == 0:
        return

    missing_stats: dict[str, float] = {}
    for col in df.columns:
        try:
            pct_missing = df[col].isna().sum() / len(df) * 100
            missing_stats[str(col)] = round(pct_missing, 2)
        except Exception:
            continue

    result.statistics["missing_value_pct"] = missing_stats

    for col, pct in missing_stats.items():
        if pct == 100.0:
            _add_finding(
                result,
                RULE_ALL_MISSING,
                description_override=RULE_ALL_MISSING.description_template.format(column=col),
                evidence=f"Column '{col}': 100% missing values",
            )
        elif pct >= HIGH_MISSING_THRESHOLD_PCT:
            _add_finding(
                result,
                RULE_HIGH_MISSING_VALUES,
                description_override=RULE_HIGH_MISSING_VALUES.description_template.format(
                    column=col, pct=pct
                ),
                evidence=f"Column '{col}': {pct:.1f}% missing",
            )


# ---------------------------------------------------------------------------
# Analysis: duplicate detection
# ---------------------------------------------------------------------------

def _check_duplicates(result: DatasetScanResult, df: "pd.DataFrame") -> None:
    """Check for high duplicate row concentration."""
    if result.row_count == 0:
        return

    try:
        n_duplicates = df.duplicated().sum()
        dup_pct = n_duplicates / len(df) * 100
        result.statistics["duplicate_count"] = int(n_duplicates)
        result.statistics["duplicate_pct"] = round(dup_pct, 2)

        if dup_pct > DUPLICATE_RATE_THRESHOLD_PCT:
            _add_finding(
                result,
                RULE_HIGH_DUPLICATE_RATE,
                description_override=RULE_HIGH_DUPLICATE_RATE.description_template.format(
                    threshold=DUPLICATE_RATE_THRESHOLD_PCT
                ),
                evidence=(
                    f"Duplicate rows: {int(n_duplicates)} / {result.row_count} "
                    f"({dup_pct:.1f}%)"
                ),
            )
    except Exception:
        pass  # Don't fail on unhashable column types


# ---------------------------------------------------------------------------
# Analysis: numerical outlier detection
# ---------------------------------------------------------------------------

def _check_numerical_outliers(result: DatasetScanResult, df: "pd.DataFrame") -> None:
    """Check for extreme numerical values (potential data poisoning indicator)."""
    if result.row_count < 5:
        return  # Not enough rows for meaningful statistics

    try:
        import numpy as np
        numeric_df = df.select_dtypes(include="number")
    except Exception:
        return

    if numeric_df.empty:
        return

    outlier_evidence: list[str] = []

    for col in numeric_df.columns:
        series = numeric_df[col].dropna()
        if len(series) < 5:
            continue
        try:
            mean = series.mean()
            std = series.std()
            if std == 0 or pd_isna(std):
                continue
            max_z = ((series - mean) / std).abs().max()
            if max_z > OUTLIER_STD_THRESHOLD:
                outlier_evidence.append(
                    f"Column '{col}': max z-score={max_z:.2f} (threshold={OUTLIER_STD_THRESHOLD})"
                )
        except Exception:
            continue

    if outlier_evidence:
        result.statistics["outlier_columns"] = outlier_evidence
        _add_finding(
            result,
            RULE_EXTREME_NUMERICAL_VALUES,
            description_override=RULE_EXTREME_NUMERICAL_VALUES.description_template.format(
                threshold=OUTLIER_STD_THRESHOLD
            ),
            evidence="\n".join(outlier_evidence[:5]),
        )


def pd_isna(val) -> bool:
    """Safe NaN check without pandas import."""
    try:
        import math
        return math.isnan(float(val))
    except (TypeError, ValueError):
        return False


# ---------------------------------------------------------------------------
# Analysis: class distribution
# ---------------------------------------------------------------------------

def _check_class_distribution(result: DatasetScanResult, df: "pd.DataFrame") -> None:
    """Check for highly imbalanced class distribution in potential label columns."""
    if result.row_count < 10:
        return

    # Look for columns likely to be class labels: low cardinality relative to row count
    candidate_label_cols = []
    for col in df.columns:
        try:
            n_unique = df[col].nunique()
            if 2 <= n_unique <= max(10, result.row_count * 0.05):
                candidate_label_cols.append(col)
        except Exception:
            continue

    for col in candidate_label_cols[:3]:  # Check up to 3 candidates
        try:
            value_counts = df[col].value_counts(normalize=True) * 100
            if len(value_counts) == 0:
                continue
            dominant_pct = float(value_counts.iloc[0])
            if dominant_pct >= CLASS_IMBALANCE_THRESHOLD_PCT:
                _add_finding(
                    result,
                    RULE_ABNORMAL_CLASS_DISTRIBUTION,
                    description_override=RULE_ABNORMAL_CLASS_DISTRIBUTION.description_template.format(
                        column=str(col), pct=dominant_pct
                    ),
                    evidence=(
                        f"Column '{col}' distribution: "
                        + ", ".join(
                            f"{k}={v:.1f}%"
                            for k, v in value_counts.head(5).items()
                        )
                    ),
                )
        except Exception:
            continue


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_dataset_file(storage_path: str | Path) -> DatasetScanResult:
    """
    Perform static security analysis on a dataset file.

    This function reads the file bytes and performs structural and statistical
    analysis only. It does NOT execute any code from the dataset.

    Args:
        storage_path: Path to the stored artifact file.

    Returns:
        DatasetScanResult with all findings and statistics.
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

    result = DatasetScanResult(
        file_extension=ext,
        file_size=file_size,
        sha256=sha256,
        format_identified="UNKNOWN",
    )

    # --- File emptiness check ---
    if file_size == 0:
        _add_finding(result, RULE_FILE_EMPTY)
        return result

    # --- Read file bytes ---
    try:
        with open(storage_path, "rb") as f:
            data = f.read()
    except OSError as e:
        result.scan_error = str(e)
        return result

    # --- Route to format reader ---
    try:
        df = None
        if ext == ".csv":
            result.format_identified = "CSV"
            df = _read_csv(data)
        elif ext == ".json":
            result.format_identified = "JSON"
            df = _read_json(data)
        elif ext == ".jsonl":
            result.format_identified = "JSONLINES"
            df = _read_jsonl(data)
        elif ext == ".parquet":
            result.format_identified = "PARQUET"
            df = _read_parquet(data)
        else:
            result.format_identified = "UNSUPPORTED"
            _add_finding(
                result,
                RULE_FILE_MALFORMED,
                description_override=(
                    f"Unsupported dataset file extension: {ext!r}. "
                    f"Supported: .csv, .json, .jsonl, .parquet"
                ),
            )
            return result

    except Exception as e:
        result.scan_error = str(e)
        _add_finding(
            result,
            RULE_FILE_MALFORMED,
            description_override=(
                f"Failed to parse {ext!r} file: {str(e)[:200]}"
            ),
            evidence=str(e)[:500],
        )
        return result

    # --- Run all checks on the parsed dataframe ---
    result.statistics["row_count"] = len(df)
    result.statistics["column_count"] = len(df.columns)

    _check_structure(result, df)
    _check_missing_values(result, df)
    _check_duplicates(result, df)
    _check_numerical_outliers(result, df)
    _check_class_distribution(result, df)

    return result


class DatasetScanner(Scanner):
    """Scanner for DATASET artifacts (.csv, .json, .jsonl, .parquet)."""

    artifact_type = ArtifactType.DATASET
    error_rule_id = "DATA-000"
    name = "dataset scanner"

    def scan(self, path: str | Path) -> list[Finding]:
        result = scan_dataset_file(path)
        findings = list(result.findings)
        if result.scan_error:
            findings.append(self.error_finding(result.scan_error))
        return findings
