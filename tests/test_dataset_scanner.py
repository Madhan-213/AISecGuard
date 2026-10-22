"""
AISecGuard — Dataset Scanner Tests (Week 4)
Verifies static analysis of datasets:
  - Valid CSV
  - Empty CSV
  - Duplicate-heavy dataset
  - Missing values
  - Outliers
  - Invalid dataset
  - Unsupported extension
"""

import tempfile
from pathlib import Path
import pytest

from scanners.dataset_scanner import scan_dataset_file
from app.models.enums import FindingType, FindingSeverity

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_scan_valid_clean_csv():
    """Verify that a clean synthetic CSV scans successfully without severe findings."""
    clean_path = FIXTURES_DIR / "dataset_clean.csv"
    assert clean_path.exists(), "dataset_clean.csv fixture missing"

    result = scan_dataset_file(clean_path)
    assert result.scan_error is None
    assert result.row_count == 10
    assert result.column_count == 4
    assert result.file_extension == ".csv"
    # Should not have critical or high data poisoning alerts
    poisoning_findings = [
        f for f in result.findings
        if f.finding_type == FindingType.DATA_POISONING_INDICATOR
    ]
    assert len(poisoning_findings) == 0


def test_scan_empty_csv():
    """Verify that an empty file produces an empty-file finding (DATA-001)."""
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as f:
        temp_path = Path(f.name)

    try:
        result = scan_dataset_file(temp_path)
        assert any(f.rule_id == "DATA-001" for f in result.findings)
    finally:
        temp_path.unlink(missing_ok=True)


def test_scan_duplicate_heavy_csv():
    """Verify that a dataset with >30% duplicates triggers DATA-007."""
    dup_path = FIXTURES_DIR / "dataset_duplicates.csv"
    assert dup_path.exists(), "dataset_duplicates.csv fixture missing"

    result = scan_dataset_file(dup_path)
    dup_findings = [f for f in result.findings if f.rule_id == "DATA-007"]
    assert len(dup_findings) >= 1
    assert dup_findings[0].finding_type == FindingType.DATA_POISONING_INDICATOR
    assert "duplicate" in dup_findings[0].title.lower()


def test_scan_outliers_csv():
    """Verify that extreme statistical outliers trigger DATA-008."""
    outlier_path = FIXTURES_DIR / "dataset_outliers.csv"
    assert outlier_path.exists(), "dataset_outliers.csv fixture missing"

    result = scan_dataset_file(outlier_path)
    outlier_findings = [f for f in result.findings if f.rule_id == "DATA-008"]
    assert len(outlier_findings) >= 1
    assert outlier_findings[0].finding_type == FindingType.DATA_POISONING_INDICATOR


def test_scan_missing_values_csv():
    """Verify detection of high missing values and all-missing columns."""
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="w", delete=False) as f:
        f.write("col_a,col_b,col_c\n")
        f.write("1,,normal\n")
        f.write("2,,normal\n")
        f.write("3,,normal\n")
        f.write("4,,normal\n")
        temp_path = Path(f.name)

    try:
        result = scan_dataset_file(temp_path)
        rule_ids = {f.rule_id for f in result.findings}
        assert "DATA-010" in rule_ids or "DATA-011" in rule_ids
    finally:
        temp_path.unlink(missing_ok=True)


def test_scan_malformed_csv():
    """Verify that a malformed unparseable dataset file triggers DATA-002 or scan error."""
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="wb", delete=False) as f:
        # Invalid null byte corrupted data
        f.write(b"\x00\xff\xfe\x00\x00random binary blob not a csv\x00")
        temp_path = Path(f.name)

    try:
        result = scan_dataset_file(temp_path)
        assert result.scan_error is not None or any(f.rule_id == "DATA-002" for f in result.findings)
    finally:
        temp_path.unlink(missing_ok=True)


def test_scan_unsupported_dataset_extension():
    """Verify that unsupported extensions are rejected or flagged."""
    invalid_path = FIXTURES_DIR / "invalid_file.txt"
    assert invalid_path.exists()

    result = scan_dataset_file(invalid_path)
    assert result.scan_error is not None or any(
        f.finding_type in (FindingType.UNKNOWN_FORMAT, FindingType.MALFORMED_FILE)
        for f in result.findings
    )


def test_scan_json_dataset():
    """Verify safe scanning of JSON array dataset."""
    with tempfile.NamedTemporaryFile(suffix=".json", mode="w", delete=False) as f:
        f.write('[{"feat": 1, "val": 10}, {"feat": 2, "val": 20}]')
        temp_path = Path(f.name)

    try:
        result = scan_dataset_file(temp_path)
        assert result.scan_error is None
        assert result.row_count == 2
        assert result.column_count == 2
    finally:
        temp_path.unlink(missing_ok=True)
