"""
AISecGuard — Models Package
Week 3: SQLAlchemy ORM models implemented.
Week 5: User and QuarantineEvent models added.

Import all models here so Alembic autogenerate can discover them.
"""

from app.models.enums import (  # noqa: F401
    ArtifactType,
    ArtifactStatus,
    ScanStatus,
    RiskLevel,
    FindingType,
    FindingSeverity,
)
from app.models.artifact import Artifact  # noqa: F401
from app.models.provenance import ProvenanceRecord  # noqa: F401
from app.models.scan import Scan  # noqa: F401
from app.models.finding import Finding  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.quarantine_event import QuarantineEvent  # noqa: F401
from app.models.signature import ArtifactSignature  # noqa: F401
from app.models.lineage import LineageEdge  # noqa: F401
from app.models.api_key import ApiKey  # noqa: F401
from app.models.activity_log import ActivityLog  # noqa: F401
from app.models.security_policy import SecurityPolicy  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.login_history import LoginHistory  # noqa: F401
from app.models.security_event import SecurityEvent  # noqa: F401
from app.models.system_setting import SystemSetting  # noqa: F401
from app.models.backup_record import BackupRecord  # noqa: F401
