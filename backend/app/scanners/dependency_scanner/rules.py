"""
AISecGuard — Dependency Scanner Rules (Week 4)
Defines rule IDs, thresholds, and heuristics for dependency security checks.

IMPORTANT: These are heuristic checks only.
A finding does NOT guarantee that a package is malicious.
"""

from dataclasses import dataclass
from app.models.enums import FindingType, FindingSeverity


@dataclass(frozen=True)
class DependencyRule:
    """Defines a single dependency security check rule."""
    rule_id: str
    title: str
    finding_type: FindingType
    severity: FindingSeverity
    description_template: str
    recommendation: str


# File validation
RULE_EMPTY_FILE = DependencyRule(
    rule_id="DEP-001",
    title="Empty dependency file",
    finding_type=FindingType.MALFORMED_FILE,
    severity=FindingSeverity.LOW,
    description_template="The dependency file is empty.",
    recommendation="Verify the dependency file is complete.",
)

RULE_PARSE_ERROR = DependencyRule(
    rule_id="DEP-002",
    title="Dependency file could not be parsed",
    finding_type=FindingType.MALFORMED_FILE,
    severity=FindingSeverity.MEDIUM,
    description_template="The dependency file could not be parsed: {error}",
    recommendation="Verify the file is valid requirements.txt or pyproject.toml format.",
)

# Version pinning issues
RULE_UNPINNED_DEPENDENCY = DependencyRule(
    rule_id="DEP-003",
    title="Unpinned dependency — supply chain risk",
    finding_type=FindingType.UNPINNED_DEPENDENCY,
    severity=FindingSeverity.MEDIUM,
    description_template=(
        "Package '{package}' has no version constraint. "
        "Unpinned dependencies always install the latest version, "
        "which may introduce unexpected changes or malicious updates "
        "without explicit consent. This is a supply chain risk indicator."
    ),
    recommendation=(
        "Pin the dependency to a specific version (e.g., package==1.2.3) "
        "or at minimum a constrained range (e.g., package>=1.2,<2.0). "
        "Use a lock file (pip-compile, poetry.lock) for reproducibility."
    ),
)

RULE_BROAD_VERSION_RANGE = DependencyRule(
    rule_id="DEP-004",
    title="Overly broad version constraint",
    finding_type=FindingType.BROAD_VERSION_RANGE,
    severity=FindingSeverity.LOW,
    description_template=(
        "Package '{package}' uses a broad version constraint: '{constraint}'. "
        "Broad constraints allow a wide range of versions to be installed, "
        "which may include versions with security vulnerabilities or "
        "unexpected behavior changes."
    ),
    recommendation=(
        "Tighten the version constraint to a specific version or narrow range. "
        "Consider using compatible release (~=) or explicit upper bounds."
    ),
)

# Suspicious package names
RULE_SUSPICIOUS_PACKAGE_NAME = DependencyRule(
    rule_id="DEP-005",
    title="Suspicious Package Name — Potential Typosquatting Indicator",
    finding_type=FindingType.SUSPICIOUS_PACKAGE_NAME,
    severity=FindingSeverity.HIGH,
    description_template=(
        "Package '{package}' has a name pattern that resembles a known popular package. "
        "This is a Potential Typosquatting Indicator — the package name may be "
        "an intentional misspelling of '{known_package}' designed to trick "
        "developers into installing a malicious package. "
        "This is a heuristic check and does NOT confirm the package is malicious."
    ),
    recommendation=(
        "Verify this is the intended package name. "
        "Check PyPI carefully and compare to the official package. "
        "Do not install if origin is uncertain."
    ),
)

RULE_UNUSUAL_PACKAGE_NAME = DependencyRule(
    rule_id="DEP-006",
    title="Unusual package name pattern",
    finding_type=FindingType.SUSPICIOUS_PACKAGE_NAME,
    severity=FindingSeverity.LOW,
    description_template=(
        "Package '{package}' has an unusual name pattern "
        "(e.g., excessive hyphens, suspicious keywords, or very short name). "
        "This may warrant additional verification."
    ),
    recommendation=(
        "Verify the package source on PyPI. "
        "Confirm the package is a legitimate, maintained project."
    ),
)


# ---------------------------------------------------------------------------
# Known popular packages for typosquatting detection
# These are commonly targeted packages. The list is not exhaustive.
# ---------------------------------------------------------------------------

POPULAR_PACKAGES: list[tuple[str, list[str]]] = [
    # (canonical_name, list_of_common_typos_or_similar_patterns)
    ("numpy",       ["numbpy", "nupy", "nump", "numppy", "nmpy", "nunpy"]),
    ("pandas",      ["pndas", "pandsa", "pands", "panads", "pandaas"]),
    ("requests",    ["requets", "reqeusts", "request", "reuqests", "requesets"]),
    ("tensorflow",  ["tensroflow", "tensorfllow", "tensoflow", "tesnorflow"]),
    ("pytorch",     ["pytoch", "pytorh", "torchh"]),
    ("torch",       ["torchh", "torcch", "torchvision2"]),
    ("scikit-learn",["scikitlearn", "sklearn2", "sckit-learn", "scikit_learn2"]),
    ("flask",       ["flaks", "flaask", "falsk"]),
    ("django",      ["djnago", "djago", "djangoo", "dajngo"]),
    ("fastapi",     ["fastaapi", "fastapii", "fast-api2"]),
    ("pillow",      ["pilow", "pillo", "pilllow"]),
    ("matplotlib",  ["matplotlbi", "mathplotlib", "maptlotlib"]),
    ("scipy",       ["scopy", "scipy", "scypi"]),
    ("cryptography",["crytpography", "cryptograhy", "crypography"]),
    ("boto3",       ["booto3", "botto3", "boto33"]),
    ("paramiko",    ["paramaiko", "paramikoo", "paraiko"]),
    ("pyyaml",      ["pyaml2", "pyymal"]),
    ("setuptools",  ["setuptols", "setup-tools", "setuptoolz"]),
    ("urllib3",     ["urlib3", "urllb3", "urllib33"]),
    ("certifi",     ["certifii", "certfy"]),
    ("pip",         ["pipp", "pi-p"]),
]

# Suspicious keywords in package names (not exhaustive)
SUSPICIOUS_NAME_KEYWORDS = [
    "hack", "exploit", "payload", "malware", "trojan", "backdoor",
    "keylogger", "stealer", "miner", "crypto-miner", "ransomware",
]

# Very short names (<=2 chars) that are unusual
MIN_LEGITIMATE_NAME_LENGTH = 2
