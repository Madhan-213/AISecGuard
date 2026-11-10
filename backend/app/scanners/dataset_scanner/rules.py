
"""
AISecGuard — Dataset Scanner Rules (Week 4)
Defines rule IDs and thresholds for the dataset security scanner.

IMPORTANT: All checks are heuristic indicators only.
A finding does NOT guarantee data poisoning or malicious content.
"""

from dataclasses import dataclass
from app.models.enums import FindingType, FindingSeverity


# ---------------------------------------------------------------------------
# Rule definitions
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DatasetRule:
    """Defines a single dataset security check rule."""
    rule_id: str
    title: str
    finding_type: FindingType
    severity: FindingSeverity
    description_template: str
    recommendation: str


# File validation rules
RULE_FILE_EMPTY = DatasetRule(
    rule_id="DATA-001",
    title="Empty dataset file",
    finding_type=FindingType.MALFORMED_FILE,
    severity=FindingSeverity.MEDIUM,
    description_template="The uploaded dataset file is empty (0 bytes or no data rows).",
    recommendation="Verify the dataset file is complete and not corrupted.",
)

RULE_FILE_MALFORMED = DatasetRule(
    rule_id="DATA-002",
    title="Malformed or unparseable dataset",
    finding_type=FindingType.MALFORMED_FILE,
    severity=FindingSeverity.MEDIUM,
    description_template="The dataset file could not be parsed. It may be corrupted or use an unexpected structure.",
    recommendation="Verify the file format and encoding. Ensure it is a valid CSV/JSON/JSONL/Parquet file.",
)

# Structure anomaly rules
RULE_NO_ROWS = DatasetRule(
    rule_id="DATA-003",
    title="Dataset contains no data rows",
    finding_type=FindingType.STRUCTURAL_ANOMALY,
    severity=FindingSeverity.LOW,
    description_template="The dataset has headers or schema but contains no data rows.",
    recommendation="Verify this is not an accidental empty upload.",
)

RULE_SINGLE_COLUMN = DatasetRule(
    rule_id="DATA-004",
    title="Dataset has only one column",
    finding_type=FindingType.STRUCTURAL_ANOMALY,
    severity=FindingSeverity.INFORMATIONAL,
    description_template="The dataset contains only a single column, which may indicate a parsing problem or an incomplete dataset.",
    recommendation="Verify the file delimiter or format. Expected multi-column datasets should have more columns.",
)

RULE_CONSTANT_COLUMN = DatasetRule(
    rule_id="DATA-005",
    title="Constant-value column detected",
    finding_type=FindingType.STRUCTURAL_ANOMALY,
    severity=FindingSeverity.LOW,
    description_template="One or more columns contain only a single unique value across all rows. Constant features are uninformative for model training and may indicate label manipulation.",
    recommendation="Review constant columns. Ensure labels and features have appropriate variance.",
)

RULE_SUSPICIOUS_COLUMN_NAMES = DatasetRule(
    rule_id="DATA-006",
    title="Suspicious column names detected",
    finding_type=FindingType.STRUCTURAL_ANOMALY,
    severity=FindingSeverity.LOW,
    description_template="Column names contain patterns that may indicate code injection (e.g., formula injection in CSV).",
    recommendation="Sanitize column names before processing. Do not pass column names directly to shell commands or formula evaluators.",
)

# Data poisoning indicator rules
RULE_HIGH_DUPLICATE_RATE = DatasetRule(
    rule_id="DATA-007",
    title="Potential Anomaly: High duplicate row concentration",
    finding_type=FindingType.DATA_POISONING_INDICATOR,
    severity=FindingSeverity.MEDIUM,
    description_template=(
        "More than {threshold}% of rows are exact duplicates. "
        "High duplicate concentration is a Potential Poisoning Indicator — "
        "it may indicate label repetition attacks or dataset manipulation. "
        "This is a heuristic indicator and does not confirm poisoning."
    ),
    recommendation=(
        "Review the dataset for intentional duplicate injection. "
        "De-duplicate and audit label distribution before training."
    ),
)

RULE_EXTREME_NUMERICAL_VALUES = DatasetRule(
    rule_id="DATA-008",
    title="Potential Anomaly: Extreme numerical values detected",
    finding_type=FindingType.DATA_POISONING_INDICATOR,
    severity=FindingSeverity.MEDIUM,
    description_template=(
        "Numerical columns contain values that are statistical outliers (beyond {threshold} standard deviations). "
        "Extreme values can destabilize model training. "
        "This is a Potential Poisoning Indicator — it does not confirm that the data is malicious."
    ),
    recommendation=(
        "Investigate extreme values. Verify they are legitimate data points "
        "or errors. Apply outlier detection before training."
    ),
)

RULE_ABNORMAL_CLASS_DISTRIBUTION = DatasetRule(
    rule_id="DATA-009",
    title="Potential Anomaly: Highly imbalanced class distribution",
    finding_type=FindingType.DATA_POISONING_INDICATOR,
    severity=FindingSeverity.LOW,
    description_template=(
        "The label/target column '{column}' has a dominant class with {pct:.1f}% concentration. "
        "Extreme class imbalance is a Suspicious Pattern that may indicate label manipulation. "
        "This is a heuristic indicator and does not confirm poisoning."
    ),
    recommendation=(
        "Review label distribution. If imbalance is not expected from the domain, "
        "investigate potential label injection or manipulation."
    ),
)

RULE_HIGH_MISSING_VALUES = DatasetRule(
    rule_id="DATA-010",
    title="Potential Anomaly: High missing value rate",
    finding_type=FindingType.STRUCTURAL_ANOMALY,
    severity=FindingSeverity.LOW,
    description_template=(
        "Column '{column}' has {pct:.1f}% missing values. "
        "High missing rates may indicate data corruption or deliberate data removal."
    ),
    recommendation=(
        "Investigate the cause of missing values. "
        "Verify the data collection pipeline has not been tampered with."
    ),
)

RULE_CELL_FORMULA_INJECTION = DatasetRule(
    rule_id="DATA-012",
    title="Cell-level formula injection detected",
    finding_type=FindingType.STRUCTURAL_ANOMALY,
    severity=FindingSeverity.HIGH,
    description_template=(
        "One or more cells in the dataset begin with dynamic formula execution prefixes "
        "(=, @, +, -, |). When opened in spreadsheet applications (e.g. Microsoft Excel, LibreOffice, "
        "Google Sheets) or evaluated by downstream tools, formula injection can trigger arbitrary command "
        "execution or data exfiltration."
    ),
    recommendation=(
        "Sanitize formula prefixes before exporting or loading tabular data. "
        "Prepend a single quote (') or space to cell values beginning with formula operators, "
        "or strip unneeded leading formula characters."
    ),
)

RULE_ALL_MISSING = DatasetRule(
    rule_id="DATA-011",
    title="Potential Anomaly: Column is entirely missing/null",
    finding_type=FindingType.STRUCTURAL_ANOMALY,
    severity=FindingSeverity.MEDIUM,
    description_template="Column '{column}' has no non-null values. An entirely null column may indicate data extraction failure or deliberate data removal.",
    recommendation="Remove or investigate the entirely-null column before training.",
)

# Thresholds (configurable)
DUPLICATE_RATE_THRESHOLD_PCT = 30.0   # flag if >30% duplicates
OUTLIER_STD_THRESHOLD = 5.0           # flag if any value >5 std devs from mean
CLASS_IMBALANCE_THRESHOLD_PCT = 90.0  # flag if dominant class >90%
HIGH_MISSING_THRESHOLD_PCT = 50.0     # flag if >50% missing in a column

# Column name patterns that may indicate CSV injection
SUSPICIOUS_COL_PREFIXES = ("=", "+", "-", "@", "|", '"', "'")
