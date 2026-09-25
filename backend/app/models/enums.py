"""
AISecGuard — Shared Enumerations
Week 3: Enums used across ORM models and API schemas.
"""

import enum


class ArtifactType(str, enum.Enum):
    """Categories of AI/ML artifacts."""
    MODEL = "MODEL"
    DATASET = "DATASET"
    DEPENDENCY = "DEPENDENCY"
    OTHER = "OTHER"


class ArtifactStatus(str, enum.Enum):
    """Lifecycle state of an uploaded artifact."""
    UPLOADED = "UPLOADED"
    PENDING_SCAN = "PENDING_SCAN"
    SCANNING = "SCANNING"
    SCANNED = "SCANNED"
    QUARANTINED = "QUARANTINED"
    FAILED = "FAILED"


class ScanStatus(str, enum.Enum):
    """Lifecycle state of a security scan."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RiskLevel(str, enum.Enum):
    """Preliminary risk classification for a scan result."""
    UNKNOWN = "UNKNOWN"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FindingSeverity(str, enum.Enum):
    """Severity of an individual security finding."""
    INFORMATIONAL = "INFORMATIONAL"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class FindingType(str, enum.Enum):
    """Classification of a security finding."""
    UNSAFE_SERIALIZATION = "UNSAFE_SERIALIZATION"
    SUSPICIOUS_REFERENCE = "SUSPICIOUS_REFERENCE"
    INTEGRITY_VIOLATION = "INTEGRITY_VIOLATION"
    LARGE_FILE_WARNING = "LARGE_FILE_WARNING"
    UNKNOWN_FORMAT = "UNKNOWN_FORMAT"
    PROVENANCE_RECORDED = "PROVENANCE_RECORDED"
    OTHER = "OTHER"
